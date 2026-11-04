const mongoose = require('mongoose');

const standupSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    workspace: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Workspace',
      index: true,
    },
    project: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Project',
      index: true,
    },
    yesterday: {
      type: String,
      required: [true, 'Please provide what was accomplished yesterday'],
      trim: true,
      maxlength: 1000,
    },
    today: {
      type: String,
      required: [true, 'Please provide the focus for today'],
      trim: true,
      maxlength: 1000,
    },
    blockers: {
      type: String,
      default: '',
      trim: true,
      maxlength: 1000,
    },
    mood: {
      type: String,
      enum: ['🚀 On fire', '⚡ Productive', '🧘 Steady', '⚠️ Struggling', '🛑 Blocked'],
      default: '⚡ Productive',
    },
    reactions: [
      {
        emoji: {
          type: String,
          required: true,
        },
        users: [
          {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
          },
        ],
      },
    ],
  },
  {
    timestamps: true,
  }
);

standupSchema.index({ workspace: 1, createdAt: -1 });

module.exports = mongoose.model('Standup', standupSchema);

