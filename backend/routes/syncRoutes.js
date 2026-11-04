const express = require('express');
const {
  getStandups,
  createStandup,
  aiGenerateStandup,
  toggleStandupReaction,
  getRetros,
  createRetro,
  toggleRetroVote,
  convertRetroToTask,
  deleteRetro,
} = require('../controllers/syncController');
const { protect } = require('../middleware/auth');

const router = express.Router();

// Apply auth middleware to all sync routes
router.use(protect);

// Standup routes
router.get('/standups', getStandups);
router.post('/standups', createStandup);
router.post('/standups/ai-generate', aiGenerateStandup);
router.post('/standups/:id/react', toggleStandupReaction);

// Retrospective routes
router.get('/retros', getRetros);
router.post('/retros', createRetro);
router.post('/retros/:id/vote', toggleRetroVote);
router.post('/retros/:id/convert-to-task', convertRetroToTask);
router.delete('/retros/:id', deleteRetro);

module.exports = router;

