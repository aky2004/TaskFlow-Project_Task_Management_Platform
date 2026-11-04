const Goal = require('../models/Goal');
const Milestone = require('../models/Milestone');
const { AppError } = require('../middleware/errorHandler');

// ─── GOAL CONTROLLERS ───

/**
 * @desc Get all goals for a workspace
 * @route GET /api/roadmap/goals
 */
exports.getGoals = async (req, res, next) => {
  try {
    const { workspaceId, category, status } = req.query;

    const query = {};
    if (workspaceId) query.workspace = workspaceId;
    if (category) query.category = category;
    if (status) query.status = status;

    const goals = await Goal.find(query)
      .populate('owner', 'name email avatar')
      .populate('linkedProjects', 'name color')
      .sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      count: goals.length,
      data: goals,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc Create strategic goal
 * @route POST /api/roadmap/goals
 */
exports.createGoal = async (req, res, next) => {
  try {
    const {
      workspace,
      title,
      description,
      category,
      timeframe,
      targetDate,
      owner,
      status,
      keyResults,
      linkedProjects,
    } = req.body;

    if (!workspace || !title) {
      return next(new AppError('Workspace and title are required', 400));
    }

    const goal = await Goal.create({
      workspace,
      title,
      description: description || '',
      category: category || 'Product',
      timeframe: timeframe || 'Q1 2026',
      targetDate: targetDate || new Date(Date.now() + 90 * 24 * 60 * 60 * 1000),
      owner: owner || req.user._id,
      status: status || 'on_track',
      keyResults: keyResults || [],
      linkedProjects: linkedProjects || [],
    });

    const populated = await Goal.findById(goal._id)
      .populate('owner', 'name email avatar')
      .populate('linkedProjects', 'name color');

    res.status(201).json({
      success: true,
      data: populated,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc Update strategic goal
 * @route PUT /api/roadmap/goals/:id
 */
exports.updateGoal = async (req, res, next) => {
  try {
    let goal = await Goal.findById(req.params.id);
    if (!goal) {
      return next(new AppError('Goal not found', 404));
    }

    goal = await Goal.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true,
    })
      .populate('owner', 'name email avatar')
      .populate('linkedProjects', 'name color');

    res.status(200).json({
      success: true,
      data: goal,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc Delete strategic goal
 * @route DELETE /api/roadmap/goals/:id
 */
exports.deleteGoal = async (req, res, next) => {
  try {
    const goal = await Goal.findById(req.params.id);
    if (!goal) {
      return next(new AppError('Goal not found', 404));
    }

    await goal.deleteOne();

    res.status(200).json({
      success: true,
      message: 'Goal deleted successfully',
    });
  } catch (error) {
    next(error);
  }
};

// ─── MILESTONE CONTROLLERS ───

/**
 * @desc Get all milestones for workspace/project
 * @route GET /api/roadmap/milestones
 */
exports.getMilestones = async (req, res, next) => {
  try {
    const { workspaceId, projectId, phase } = req.query;

    const query = {};
    if (workspaceId) query.workspace = workspaceId;
    if (projectId) query.project = projectId;
    if (phase) query.phase = phase;

    const milestones = await Milestone.find(query)
      .populate('project', 'name color')
      .populate('linkedTasks', 'title status priority')
      .sort({ targetDate: 1 });

    res.status(200).json({
      success: true,
      count: milestones.length,
      data: milestones,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc Create roadmap milestone
 * @route POST /api/roadmap/milestones
 */
exports.createMilestone = async (req, res, next) => {
  try {
    const {
      workspace,
      project,
      title,
      description,
      phase,
      targetDate,
      status,
      progress,
      linkedTasks,
    } = req.body;

    if (!workspace || !title || !targetDate) {
      return next(new AppError('Workspace, title, and target date are required', 400));
    }

    const milestone = await Milestone.create({
      workspace,
      project,
      title,
      description: description || '',
      phase: phase || 'Development',
      targetDate,
      status: status || 'in_progress',
      progress: progress || 0,
      linkedTasks: linkedTasks || [],
    });

    const populated = await Milestone.findById(milestone._id)
      .populate('project', 'name color')
      .populate('linkedTasks', 'title status priority');

    res.status(201).json({
      success: true,
      data: populated,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc Update roadmap milestone
 * @route PUT /api/roadmap/milestones/:id
 */
exports.updateMilestone = async (req, res, next) => {
  try {
    let milestone = await Milestone.findById(req.params.id);
    if (!milestone) {
      return next(new AppError('Milestone not found', 404));
    }

    milestone = await Milestone.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true,
    })
      .populate('project', 'name color')
      .populate('linkedTasks', 'title status priority');

    res.status(200).json({
      success: true,
      data: milestone,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc Delete roadmap milestone
 * @route DELETE /api/roadmap/milestones/:id
 */
exports.deleteMilestone = async (req, res, next) => {
  try {
    const milestone = await Milestone.findById(req.params.id);
    if (!milestone) {
      return next(new AppError('Milestone not found', 404));
    }

    await milestone.deleteOne();

    res.status(200).json({
      success: true,
      message: 'Milestone deleted successfully',
    });
  } catch (error) {
    next(error);
  }
};

