const express = require('express');
const {
  getGoals,
  createGoal,
  updateGoal,
  deleteGoal,
  getMilestones,
  createMilestone,
  updateMilestone,
  deleteMilestone,
} = require('../controllers/roadmapController');
const { protect } = require('../middleware/auth');

const router = express.Router();

router.use(protect);

// Strategic Goals routes
router.get('/goals', getGoals);
router.post('/goals', createGoal);
router.put('/goals/:id', updateGoal);
router.delete('/goals/:id', deleteGoal);

// Milestones / Roadmap routes
router.get('/milestones', getMilestones);
router.post('/milestones', createMilestone);
router.put('/milestones/:id', updateMilestone);
router.delete('/milestones/:id', deleteMilestone);

module.exports = router;

