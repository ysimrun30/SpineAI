const router = require('express').Router();
const auth = require('../middleware/auth');
const User = require('../models/User');

// POST /api/feedback — submit post-workout feedback
router.post('/', auth, async (req, res) => {
  try {
    const { painLevel, difficulty, comments, exercisesCompleted, exercisePlanId } = req.body;

    if (painLevel === undefined) {
      return res.status(400).json({ error: 'Pain level is required' });
    }

    const feedbackEntry = {
      exercisePlanId: exercisePlanId || null,
      sessionDate: new Date(),
      painLevel,
      difficulty: difficulty || 'just_right',
      comments: comments || '',
      exercisesCompleted: exercisesCompleted || 0
    };

    const user = await User.findByIdAndUpdate(
      req.userId,
      { $push: { feedbackHistory: feedbackEntry } },
      { new: true }
    ).select('feedbackHistory');

    // Adaptive logic: auto-adjust pain level on user profile
    if (painLevel >= 7) {
      await User.findByIdAndUpdate(req.userId, { painLevel });
    }

    const latestFeedback = user.feedbackHistory[user.feedbackHistory.length - 1];

    res.json({
      message: 'Feedback saved',
      feedback: latestFeedback,
      recommendation: getRecommendation(painLevel, difficulty)
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/feedback — get feedback history
router.get('/', auth, async (req, res) => {
  try {
    const user = await User.findById(req.userId).select('feedbackHistory');
    const history = (user?.feedbackHistory || [])
      .sort((a, b) => new Date(b.sessionDate) - new Date(a.sessionDate))
      .slice(0, 30);
    res.json(history);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/feedback/summary — get adaptive summary for plan generation
router.get('/summary', auth, async (req, res) => {
  try {
    const user = await User.findById(req.userId).select('feedbackHistory');
    const recent = (user?.feedbackHistory || [])
      .sort((a, b) => new Date(b.sessionDate) - new Date(a.sessionDate))
      .slice(0, 5);

    if (recent.length === 0) {
      return res.json({ avgPain: 0, predominantDifficulty: 'just_right', adjustment: 'none', sessionCount: 0 });
    }

    const avgPain = recent.reduce((s, f) => s + f.painLevel, 0) / recent.length;
    const diffCounts = { too_easy: 0, just_right: 0, too_hard: 0 };
    recent.forEach(f => { if (f.difficulty) diffCounts[f.difficulty]++; });
    const predominantDifficulty = Object.entries(diffCounts).sort((a, b) => b[1] - a[1])[0][0];

    let adjustment = 'none';
    if (avgPain >= 7 || predominantDifficulty === 'too_hard') adjustment = 'decrease';
    else if (avgPain <= 3 && predominantDifficulty === 'too_easy') adjustment = 'increase';

    res.json({
      avgPain: Math.round(avgPain * 10) / 10,
      predominantDifficulty,
      adjustment,
      sessionCount: recent.length
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

function getRecommendation(painLevel, difficulty) {
  if (painLevel >= 8) {
    return '⚠️ High pain detected. Your next exercise plan will be adjusted to lower intensity. Consider contacting your physiotherapist.';
  }
  if (painLevel >= 6) {
    return 'Moderate pain noted. We will slightly reduce exercise intensity next session. Make sure to warm up properly.';
  }
  if (difficulty === 'too_easy' && painLevel <= 3) {
    return '💪 Great progress! We\'ll increase the challenge in your next session to keep you progressing.';
  }
  if (difficulty === 'too_hard') {
    return 'We\'ll adjust the difficulty down for next time. Recovery is a gradual process — you\'re doing great!';
  }
  return '✅ Good session! Keep up the consistent effort for the best recovery results.';
}

module.exports = router;
