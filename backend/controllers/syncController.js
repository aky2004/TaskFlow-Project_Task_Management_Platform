const Standup = require('../models/Standup');
const RetroItem = require('../models/RetroItem');
const Task = require('../models/Task');
const { generateStandupDraft } = require('../services/aiService');
const { AppError } = require('../middleware/errorHandler');

/**
 * @desc Get standups for a workspace
 * @route GET /api/sync/standups
 */
exports.getStandups = async (req, res, next) => {
  try {
    const { workspaceId, projectId, date } = req.query;

    const query = {};
    if (workspaceId) query.workspace = workspaceId;
    if (projectId) query.project = projectId;

    // Optional date filter (defaults to last 7 days)
    if (date) {
      const startOfDay = new Date(date);
      startOfDay.setHours(0, 0, 0, 0);
      const endOfDay = new Date(date);
      endOfDay.setHours(23, 59, 59, 999);
      query.createdAt = { $gte: startOfDay, $lte: endOfDay };
    }

    const standups = await Standup.find(query)
      .populate('user', 'name email avatar role')
      .populate('project', 'name color')
      .sort({ createdAt: -1 })
      .limit(50);

    res.status(200).json({
      success: true,
      count: standups.length,
      data: standups,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc Create daily standup
 * @route POST /api/sync/standups
 */
exports.createStandup = async (req, res, next) => {
  try {
    const { workspace, project, yesterday, today, blockers, mood } = req.body;

    if (!yesterday || !today) {
      return next(new AppError('Yesterday and Today summaries are required', 400));
    }

    const standup = await Standup.create({
      user: req.user._id,
      workspace,
      project,
      yesterday,
      today,
      blockers: blockers || '',
      mood: mood || '⚡ Productive',
    });

    const populatedStandup = await Standup.findById(standup._id)
      .populate('user', 'name email avatar role')
      .populate('project', 'name color');

    // Emit live socket event if socket is available
    if (req.app.get('io') && workspace) {
      req.app.get('io').to(`workspace:${workspace}`).emit('standup:created', populatedStandup);
    }

    res.status(201).json({
      success: true,
      data: populatedStandup,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc AI auto-draft standup based on user's real task activity
 * @route POST /api/sync/standups/ai-generate
 */
exports.aiGenerateStandup = async (req, res, next) => {
  try {
    const userId = req.user._id;
    const { workspaceId, projectId } = req.body;

    const taskQuery = {
      assignee: userId,
      isArchived: false,
    };
    if (projectId) taskQuery.project = projectId;

    // Get completed tasks recently
    const completedTasks = await Task.find({
      ...taskQuery,
      status: 'completed',
    })
      .select('title priority updatedAt')
      .sort({ updatedAt: -1 })
      .limit(5);

    // Get active in-progress tasks
    const inProgressTasks = await Task.find({
      ...taskQuery,
      status: { $in: ['in-progress', 'review'] },
    })
      .select('title priority dueDate')
      .limit(5);

    // Get overdue or urgent tasks
    const overdueTasks = await Task.find({
      ...taskQuery,
      status: { $ne: 'completed' },
      $or: [
        { priority: 'urgent' },
        { dueDate: { $lt: new Date() } },
      ],
    })
      .select('title priority dueDate')
      .limit(3);

    const draft = await generateStandupDraft({
      userName: req.user.name,
      completedTasks,
      inProgressTasks,
      overdueTasks,
    });

    res.status(200).json({
      success: true,
      data: draft,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc Toggle emoji reaction on standup
 * @route POST /api/sync/standups/:id/react
 */
exports.toggleStandupReaction = async (req, res, next) => {
  try {
    const { emoji } = req.body;
    const userId = req.user._id;

    const standup = await Standup.findById(req.params.id);
    if (!standup) {
      return next(new AppError('Standup not found', 404));
    }

    let existingReaction = standup.reactions.find((r) => r.emoji === emoji);

    if (existingReaction) {
      const userIndex = existingReaction.users.findIndex((u) => u.toString() === userId.toString());
      if (userIndex > -1) {
        // Remove reaction
        existingReaction.users.splice(userIndex, 1);
        if (existingReaction.users.length === 0) {
          standup.reactions = standup.reactions.filter((r) => r.emoji !== emoji);
        }
      } else {
        // Add user to existing emoji
        existingReaction.users.push(userId);
      }
    } else {
      // Add new emoji reaction
      standup.reactions.push({
        emoji,
        users: [userId],
      });
    }

    await standup.save();

    res.status(200).json({
      success: true,
      data: standup.reactions,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc Get retrospective items for workspace/project
 * @route GET /api/sync/retros
 */
exports.getRetros = async (req, res, next) => {
  try {
    const { workspaceId, projectId } = req.query;

    const query = {};
    if (workspaceId) query.workspace = workspaceId;
    if (projectId) query.project = projectId;

    const retros = await RetroItem.find(query)
      .populate('author', 'name email avatar')
      .populate('convertedTaskId', 'title status priority')
      .sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      data: retros,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc Create retrospective item
 * @route POST /api/sync/retros
 */
exports.createRetro = async (req, res, next) => {
  try {
    const { workspace, project, category, content } = req.body;

    if (!workspace || !category || !content) {
      return next(new AppError('Workspace, category, and content are required', 400));
    }

    const retro = await RetroItem.create({
      workspace,
      project,
      category,
      content,
      author: req.user._id,
      votes: [],
    });

    const populated = await RetroItem.findById(retro._id).populate('author', 'name email avatar');

    res.status(201).json({
      success: true,
      data: populated,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc Upvote/Unvote a retro item
 * @route POST /api/sync/retros/:id/vote
 */
exports.toggleRetroVote = async (req, res, next) => {
  try {
    const userId = req.user._id;
    const retro = await RetroItem.findById(req.params.id);

    if (!retro) {
      return next(new AppError('Retro item not found', 404));
    }

    const voteIndex = retro.votes.findIndex((v) => v.toString() === userId.toString());
    if (voteIndex > -1) {
      retro.votes.splice(voteIndex, 1);
    } else {
      retro.votes.push(userId);
    }

    await retro.save();

    res.status(200).json({
      success: true,
      votesCount: retro.votes.length,
      hasVoted: voteIndex === -1,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc 1-Click Convert an action item to a real Kanban task
 * @route POST /api/sync/retros/:id/convert-to-task
 */
exports.convertRetroToTask = async (req, res, next) => {
  try {
    const { projectId, status, priority } = req.body;
    const retro = await RetroItem.findById(req.params.id);

    if (!retro) {
      return next(new AppError('Retro item not found', 404));
    }

    if (retro.isConvertedToTask && retro.convertedTaskId) {
      return next(new AppError('This action item has already been converted to a task', 400));
    }

    const targetProject = projectId || retro.project;
    if (!targetProject) {
      return next(new AppError('Project ID is required to create a task', 400));
    }

    // Create the task in the project
    const newTask = await Task.create({
      title: retro.content.length > 80 ? `${retro.content.substring(0, 80)}...` : retro.content,
      description: `Action item originated from Sprint Retrospective:\n\n"${retro.content}"`,
      project: targetProject,
      status: status || 'todo',
      priority: priority || 'high',
      createdBy: req.user._id,
      assignee: req.user._id,
    });

    retro.isConvertedToTask = true;
    retro.convertedTaskId = newTask._id;
    await retro.save();

    res.status(201).json({
      success: true,
      message: 'Retro action item successfully converted to task!',
      data: {
        task: newTask,
        retroId: retro._id,
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc Delete retro card
 * @route DELETE /api/sync/retros/:id
 */
exports.deleteRetro = async (req, res, next) => {
  try {
    const retro = await RetroItem.findById(req.params.id);
    if (!retro) {
      return next(new AppError('Retro item not found', 404));
    }

    // Allow author or managers/admins to delete
    if (retro.author.toString() !== req.user._id.toString() && req.user.role !== 'admin') {
      return next(new AppError('Not authorized to delete this card', 403));
    }

    await retro.deleteOne();

    res.status(200).json({
      success: true,
      message: 'Card deleted successfully',
    });
  } catch (error) {
    next(error);
  }
};

