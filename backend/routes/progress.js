const router = require('express').Router();
const auth = require('../middleware/auth');
const { ExerciseLog, DailyProgress, PostureSession } = require('../models/Progress');

// @route   POST /api/progress/exercise
// @desc    Log a completed exercise and update daily aggregate
router.post('/exercise', auth, async (req, res) => {
  try {
    const log = await ExerciseLog.create({ userId: req.userId, ...req.body });

    // Update daily progress (normalize date to midnight)
    const today = new Date(); 
    today.setHours(0, 0, 0, 0);

    await DailyProgress.findOneAndUpdate(
      { userId: req.userId, date: today },
      { $inc: { exercisesCompleted: 1 } },
      { upsert: true }
    );
    res.json(log);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// @route   GET /api/progress/exercises
// @desc    Get the last 30 exercise logs for the history list
router.get('/exercises', auth, async (req, res) => {
  try {
    const logs = await ExerciseLog.find({ userId: req.userId })
      .sort({ completedAt: -1 })
      .limit(30);
    res.json(logs);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// @route   GET /api/progress/exercise/:id
// @desc    Get full analysis data (form checks, timeline) for a specific session
router.get('/exercise/:id', auth, async (req, res) => {
  try {
    const log = await ExerciseLog.findOne({ _id: req.params.id, userId: req.userId });
    if (!log) return res.status(404).json({ error: 'Exercise log not found' });
    res.json(log);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// @route   POST /api/progress/posture
// @desc    Log a standalone posture monitoring session
router.post('/posture', auth, async (req, res) => {
  try {
    const session = await PostureSession.create({ userId: req.userId, ...req.body });
    res.json(session);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// @route   GET /api/progress/stats
// @desc    Get weekly summary, streaks, and chart data
router.get('/stats', auth, async (req, res) => {
  try {
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    const [exerciseLogs, postureSessions] = await Promise.all([
      ExerciseLog.find({ userId: req.userId, completedAt: { $gte: sevenDaysAgo } }),
      PostureSession.find({ userId: req.userId, startTime: { $gte: sevenDaysAgo } })
    ]);

    const avgPosture = postureSessions.length
      ? postureSessions.reduce((s, p) => s + (p.averageScore || 0), 0) / postureSessions.length
      : 0;

    res.json({
      totalExercises: exerciseLogs.length,
      totalPostureSessions: postureSessions.length,
      averagePostureScore: Math.round(avgPosture),
      streak: calculateStreak(exerciseLogs),
      weeklyData: buildWeeklyData(exerciseLogs)
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * Helper: Calculates current consecutive days of activity
 */
function calculateStreak(logs) {
  if (!logs.length) return 0;
  const days = new Set(logs.map(l => new Date(l.completedAt).toDateString()));
  let streak = 0;
  const now = new Date();
  
  while (days.has(new Date(now.getTime() - streak * 86400000).toDateString())) {
    streak++;
  }
  return streak;
}

/**
 * Helper: Formats last 7 days of activity for chart components
 */
function buildWeeklyData(logs) {
  const data = {};
  for (let i = 6; i >= 0; i--) {
    const d = new Date(Date.now() - i * 86400000);
    const key = d.toLocaleDateString('en', { weekday: 'short' });
    data[key] = 0;
  }
  logs.forEach(l => {
    const key = new Date(l.completedAt).toLocaleDateString('en', { weekday: 'short' });
    if (key in data) data[key]++;
  });
  return Object.entries(data).map(([day, count]) => ({ day, count }));
}

module.exports = router;