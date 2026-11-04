const mongoose = require('mongoose');

const retroItemSchema = new mongoose.Schema(
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
    category: {
      type: String,
      enum: ['went_well', 'to_improve', 'action_item'],
      required: [true, 'Category is required'],
      index: true,
    },
    content: {
      type: String,
      required: [true, 'Retro card content is required'],
      trim: true,
      maxlength: 1500,
    },
    author: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    votes: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
      },
    ],
    isConvertedToTask: {
      type: Boolean,
      default: false,
    },
    convertedTaskId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Task',
    },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model('RetroItem', retroItemSchema);

