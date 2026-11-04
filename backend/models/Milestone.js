const mongoose = require('mongoose');

const milestoneSchema = new mongoose.Schema(
  {
    workspace: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Workspace',
      required: true,
      index: true,
    },
    project: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Project',
      index: true,
    },
    title: {
      type: String,
      required: [true, 'Milestone title is required'],
      trim: true,
      maxlength: 200,
    },
    description: {
      type: String,
      trim: true,
      maxlength: 1000,
      default: '',
    },
    phase: {
      type: String,
      enum: ['Discovery', 'Design', 'Development', 'Testing', 'Launch', 'Maintenance'],
      default: 'Development',
      index: true,
    },
    targetDate: {
      type: Date,
      required: [true, 'Target date is required'],
    },
    status: {
      type: String,
      enum: ['planned', 'in_progress', 'completed', 'delayed'],
      default: 'in_progress',
    },
    progress: {
      type: Number,
      min: 0,
      max: 100,
      default: 0,
    },
    linkedTasks: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Task',
      },
    ],
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model('Milestone', milestoneSchema);

