const { GoogleGenerativeAI } = require('@google/generative-ai');

/**
 * List of models in order of priority.
 * Primary: gemini-flash-latest (as validated via curl quickstart)
 * Fallbacks: gemini-flash-lite-latest, gemini-pro-latest, gemini-2.5-flash-lite
 */
const MODEL_PRIORITIES = [
  'gemini-flash-lite-latest',
  'gemini-flash-latest',
  'gemini-3.5-flash-lite',
  'gemini-pro-latest',
];

/**
 * Robust helper to query Gemini with automatic model fallback.
 */
async function callGeminiWithFallback(prompt, generationConfig = {}) {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error('GEMINI_API_KEY is not defined in environment variables');
  }

  const genAI = new GoogleGenerativeAI(apiKey);

  let lastError = null;

  for (const modelName of MODEL_PRIORITIES) {
    try {
      const model = genAI.getGenerativeModel({
        model: modelName,
        generationConfig: {
          temperature: 0.7,
          ...generationConfig,
        },
      });

      const result = await model.generateContent(prompt);
      const text = result?.response?.text();
      if (text) {
        return text;
      }
    } catch (err) {
      console.warn(`⚠️ Model ${modelName} failed (${err.message}). Trying fallback...`);
      lastError = err;
    }
  }

  throw lastError || new Error('All Gemini model fallbacks failed.');
}

/**
 * Extracts and parses JSON from Gemini text response (handling markdown fences, thoughts, etc.)
 */
function extractJson(rawText) {
  if (!rawText || typeof rawText !== 'string') return null;

  // Remove code fences
  let cleaned = rawText
    .replace(/```json\s*/gi, '')
    .replace(/```\s*/g, '')
    .trim();

  // 1. Try direct parse
  try {
    return JSON.parse(cleaned);
  } catch (e) {}

  // 2. Try matching JSON array: [ ... ]
  const arrayMatch = cleaned.match(/\[\s*\{[\s\S]*\}\s*\]/);
  if (arrayMatch) {
    try {
      return JSON.parse(arrayMatch[0]);
    } catch (e) {}
  }

  // 3. Try matching JSON object: { ... }
  const objMatch = cleaned.match(/\{[\s\S]*\}/);
  if (objMatch) {
    try {
      return JSON.parse(objMatch[0]);
    } catch (e) {}
  }

  // 4. Handle nested array bracket issue [[ ... ]]
  if (cleaned.startsWith('[[')) {
    try {
      return JSON.parse(cleaned.slice(1, -1));
    } catch (e) {}
  }

  throw new Error('Could not parse valid JSON from Gemini output.');
}

/**
 * Convert unstructured meeting notes or emails into structured Kanban tasks
 */
exports.convertNotesToTasks = async (notes) => {
  try {
    const prompt = `
    You are an expert AI project manager. Given the following unstructured meeting notes, emails, or chat logs, extract distinct actionable tasks with intelligent analysis.
    
    Requirements:
    - Identify distinct, actionable tasks from the text.
    - For each task, assign:
      - "title": concise task title (string)
      - "description": detailed description of what needs to be done (string)
      - "priority": one of: "urgent", "high", "medium", "low"
      - "status": one of: "todo", "in-progress", "review"
      - "dueDate": deadline formatted as ISO 8601 YYYY-MM-DD string, or null
      - "subtasks": array of 2-4 checklist sub-items (strings)
    
    Output ONLY valid JSON as an array of objects. No markdown backticks, no explanations.
    
    Notes:
    """
    ${notes}
    """
    `;

    const raw = await callGeminiWithFallback(prompt);
    const parsed = extractJson(raw);

    if (Array.isArray(parsed) && parsed.length > 0) {
      return parsed;
    }

    // If an object with a tasks array was returned
    if (parsed && Array.isArray(parsed.tasks)) {
      return parsed.tasks;
    }

    throw new Error('AI output was not a list of tasks.');
  } catch (error) {
    console.error('convertNotesToTasks Error:', error.message);
    // Intelligent fallback so user always gets tasks even under network hiccups
    return [
      {
        title: `Action Item: ${notes.substring(0, 40)}...`,
        description: `Follow up on: ${notes}`,
        priority: 'high',
        status: 'todo',
        dueDate: null,
        subtasks: ['Review initial requirements', 'Coordinate with team', 'Complete deliverable'],
      },
    ];
  }
};

/**
 * Rewrite task description or title into Scrum User Story format
 */
exports.rewriteToUserStory = async (input) => {
  try {
    const textToEnhance =
      typeof input === 'object'
        ? `${input.title ? `Title: ${input.title}\n` : ''}${input.description || ''}`
        : String(input || '');

    const prompt = `
    You are an Agile Product Owner. Rewrite the following task into a professional Scrum User Story format.
    
    Format:
    **User Story**
    As a <user persona>,
    I want to <capability / feature>,
    So that <benefit / business value>.

    **Acceptance Criteria**
    - [ ] Criteria 1
    - [ ] Criteria 2
    - [ ] Criteria 3

    **Implementation Notes**
    Brief bullet points on technical approach.

    Input:
    """
    ${textToEnhance}
    """
    `;

    const raw = await callGeminiWithFallback(prompt);
    return raw.trim();
  } catch (error) {
    console.error('rewriteToUserStory Error:', error.message);
    const fallbackText = typeof input === 'object' ? input.description || input.title : String(input || '');
    return `**User Story**\nAs a team member,\nI want to complete "${fallbackText}",\nSo that project milestones are achieved on time.\n\n**Acceptance Criteria**\n- [ ] Requirements defined\n- [ ] Implementation completed and tested\n- [ ] Code reviewed and deployed`;
  }
};

/**
 * Generate a complete 4-column Kanban board structure from a project idea
 */
exports.generateKanbanStructure = async (text) => {
  try {
    const prompt = `
    You are a Senior Technical Project Manager. Create a full Kanban board structure with high-quality, actionable tasks based on the following project description.
    
    Requirements:
    - Output ONLY valid JSON array with exactly 4 column objects.
    - Each column object MUST have:
      - "columnId": "col_todo", "col_in_progress", "col_review", "col_completed"
      - "name": "To Do", "In Progress", "Review", "Completed"
      - "order": 0, 1, 2, 3
      - "tasks": array of task objects
    - Each task object MUST have:
      - "title": concise task title (string)
      - "description": clear description (string)
      - "priority": one of: "urgent", "high", "medium", "low"
      - "subtasks": array of strings (2-4 checklist items)
    
    Distribution:
    - col_todo: 60-70% of tasks (future planned work)
    - col_in_progress: 15-20% of tasks (initial setup / first steps)
    - col_review: 5-10% of tasks
    - col_completed: 0-5% of tasks (project initialization)
    
    Generate 8-12 realistic, specific tasks in total. No markdown backticks, raw JSON only.
    
    Project Description:
    """
    ${text}
    """
    `;

    const raw = await callGeminiWithFallback(prompt);
    const parsed = extractJson(raw);

    if (Array.isArray(parsed) && parsed.length > 0) {
      return parsed.map((col, idx) => ({
        columnId: col.columnId || `col_${idx}`,
        name: col.name || ['To Do', 'In Progress', 'Review', 'Completed'][idx] || 'Column',
        order: col.order !== undefined ? col.order : idx,
        tasks: Array.isArray(col.tasks)
          ? col.tasks.map((t) => ({
              title: t.title || 'Untitled Task',
              description: t.description || '',
              priority: ['urgent', 'high', 'medium', 'low'].includes(t.priority) ? t.priority : 'medium',
              subtasks: Array.isArray(t.subtasks) ? t.subtasks : [],
            }))
          : [],
      }));
    }

    throw new Error('Failed to generate valid Kanban column array.');
  } catch (error) {
    console.error('generateKanbanStructure Error:', error.message);
    // Reliable fallback columns
    return [
      {
        columnId: 'col_todo',
        name: 'To Do',
        order: 0,
        tasks: [
          {
            title: `Requirements & Architecture: ${text.substring(0, 30)}`,
            description: `Define system architecture and technical specs for ${text}`,
            priority: 'high',
            subtasks: ['Gather functional requirements', 'Draft architecture diagram', 'Review with lead'],
          },
          {
            title: 'Design UI Wireframes & User Journey',
            description: 'Create responsive prototypes and user flows',
            priority: 'medium',
            subtasks: ['Wireframe core views', 'Setup design system tokens'],
          },
          {
            title: 'API Integration & Data Modeling',
            description: 'Design database schemas, models, and endpoints',
            priority: 'high',
            subtasks: ['Define schema constraints', 'Setup REST controllers'],
          },
        ],
      },
      {
        columnId: 'col_in_progress',
        name: 'In Progress',
        order: 1,
        tasks: [
          {
            title: 'Repository Setup & Environment Configuration',
            description: 'Initialize Git repo, configure environment variables and linter',
            priority: 'urgent',
            subtasks: ['Configure .env variables', 'Install dependencies', 'Verify server startup'],
          },
        ],
      },
      {
        columnId: 'col_review',
        name: 'Review',
        order: 2,
        tasks: [],
      },
      {
        columnId: 'col_completed',
        name: 'Completed',
        order: 3,
        tasks: [
          {
            title: 'Project Kickoff & Initialization',
            description: 'Project concept approved and scope finalized',
            priority: 'low',
            subtasks: ['Kickoff meeting', 'Define scope milestones'],
          },
        ],
      },
    ];
  }
};

/**
 * Generate Daily Standup Draft based on developer's real task activity
 */
exports.generateStandupDraft = async ({ userName, completedTasks, inProgressTasks, overdueTasks }) => {
  try {
    const prompt = `
    You are an AI Agile Assistant. Given a developer's real task activity, generate a polished, professional Daily Standup update.
    
    Developer Name: ${userName || 'Team Member'}
    Completed/Recent Tasks: ${JSON.stringify(completedTasks || [])}
    In-Progress Tasks: ${JSON.stringify(inProgressTasks || [])}
    Overdue/At-Risk Tasks: ${JSON.stringify(overdueTasks || [])}

    Requirements:
    - Output ONLY valid JSON matching this exact structure:
    {
      "yesterday": "1-2 sentence summary of accomplishments based on completed/recent tasks.",
      "today": "1-2 sentence actionable plan for today based on in-progress tasks.",
      "blockers": "Any blockers or 'None at the moment'.",
      "mood": "Choose exactly one of: '🚀 On fire', '⚡ Productive', '🧘 Steady', '⚠️ Struggling', '🛑 Blocked'"
    }
    No markdown backticks, no preamble, output only raw JSON.
    `;

    const raw = await callGeminiWithFallback(prompt);
    const parsed = extractJson(raw);

    if (parsed && parsed.yesterday && parsed.today) {
      return parsed;
    }

    throw new Error('Standup output missing required fields.');
  } catch (error) {
    console.error('generateStandupDraft Error:', error.message);
    return {
      yesterday: completedTasks?.length
        ? `Completed: ${completedTasks.map((t) => t.title).join(', ')}`
        : 'Wrapped up pending code reviews and refined sprint tasks.',
      today: inProgressTasks?.length
        ? `Focusing on: ${inProgressTasks.map((t) => t.title).join(', ')}`
        : 'Continuing development on active deliverables and testing.',
      blockers: overdueTasks?.length
        ? `Need attention on: ${overdueTasks.map((t) => t.title).join(', ')}`
        : 'No blockers at the moment.',
      mood: '⚡ Productive',
    };
  }
};

/**
 * Generate 3 actionable workspace insights
 */
exports.generateWorkspaceInsights = async (workspaceId, projects = [], tasks = []) => {
  try {
    const prompt = `
    You are an AI Workspace Analyst. Given the following summary:
    Projects Count: ${projects.length}
    Tasks Count: ${tasks.length}
    Sample Tasks: ${JSON.stringify(tasks.slice(0, 10).map((t) => ({ title: t.title, status: t.status, priority: t.priority })))}

    Provide 3 brief, actionable insights or recommendations for the team to improve velocity and balance workload.
    Output ONLY a JSON array of 3 string recommendations. No markdown, raw JSON only.
    `;

    const raw = await callGeminiWithFallback(prompt);
    const parsed = extractJson(raw);

    if (Array.isArray(parsed) && parsed.length >= 3) {
      return parsed.slice(0, 3);
    }
    throw new Error('Insights output not an array of 3.');
  } catch (error) {
    console.error('generateWorkspaceInsights Error:', error.message);
    return [
      'Maintain momentum on in-progress sprint deliverables.',
      'Review upcoming due dates to prevent bottleneck accumulation.',
      'Distribute checklist subtasks evenly across team members.',
    ];
  }
};
