const mongoose = require('mongoose');

const keyResultSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true,
    trim: true,
  },
  current: {
    type: Number,
    default: 0,
  },
  target: {
    type: Number,
    required: true,
    default: 100,
  },
  unit: {
    type: String,
    default: '%',
  },
});

const goalSchema = new mongoose.Schema(
  {
    workspace: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Workspace',
      required: true,
      index: true,
    },
    title: {
      type: String,
      required: [true, 'Goal title is required'],
      trim: true,
      maxlength: 200,
    },
    description: {
      type: String,
      trim: true,
      maxlength: 1000,
      default: '',
    },
    category: {
      type: String,
      enum: ['Product', 'Engineering', 'Marketing', 'Company', 'Operations'],
      default: 'Product',
    },
    timeframe: {
      type: String,
      default: 'Q1 2026',
    },
    targetDate: {
      type: Date,
    },
    owner: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
    status: {
      type: String,
      enum: ['on_track', 'at_risk', 'behind', 'completed'],
      default: 'on_track',
    },
    keyResults: [keyResultSchema],
    linkedProjects: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Project',
      },
    ],
  },
  {
    timestamps: true,
  }
);

// Virtual for overall progress percentage calculated across key results
goalSchema.virtual('progress').get(function () {
  if (!this.keyResults || this.keyResults.length === 0) return 0;
  const total = this.keyResults.reduce((acc, kr) => {
    if (!kr.target || kr.target === 0) return acc;
    const ratio = Math.min(Math.max(kr.current / kr.target, 0), 1);
    return acc + ratio;
  }, 0);
  return Math.round((total / this.keyResults.length) * 100);
});

goalSchema.set('toJSON', { virtuals: true });
goalSchema.set('toObject', { virtuals: true });

module.exports = mongoose.model('Goal', goalSchema);

