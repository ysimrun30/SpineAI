const router = require('express').Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const User = require('../models/User');

const sign = (user) => jwt.sign(
  { userId: user._id, email: user.email },
  process.env.JWT_SECRET || 'dev_secret',
  { expiresIn: '7d' }
);

// Register
router.post('/register', async (req, res) => {
  try {
    const { name, email, password, condition, age, recoveryPhase } = req.body;
    const exists = await User.findOne({ email });
    if (exists) return res.status(400).json({ error: 'Email already registered' });

    const hashed = await bcrypt.hash(password, 10);
    const user = await User.create({ name, email, password: hashed, condition, age, recoveryPhase });
    res.json({ token: sign(user), user: { id: user._id, name, email, condition, recoveryPhase, onboardingComplete: false } });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Login
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    const user = await User.findOne({ email });
    if (!user) return res.status(400).json({ error: 'User not found' });

    const valid = await bcrypt.compare(password, user.password);
    if (!valid) return res.status(400).json({ error: 'Wrong password' });

    res.json({
      token: sign(user),
      user: {
        id: user._id, name: user.name, email,
        condition: user.condition, recoveryPhase: user.recoveryPhase,
        onboardingComplete: user.onboardingComplete || false
      }
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Firebase SSO login
router.post('/firebase', async (req, res) => {
  try {
    const { firebaseUid, name, email } = req.body;
    let user = await User.findOne({ firebaseUid });
    if (!user) {
      user = await User.create({ firebaseUid, name, email, condition: 'general_back_pain' });
    }
    res.json({
      token: sign(user),
      user: {
        id: user._id, name: user.name, email,
        condition: user.condition, onboardingComplete: user.onboardingComplete || false
      }
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Get profile
router.get('/me', require('../middleware/auth'), async (req, res) => {
  try {
    const user = await User.findById(req.userId).select('-password');
    res.json(user);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Update profile (extended for onboarding + medical data)
router.put('/me', require('../middleware/auth'), async (req, res) => {
  try {
    const {
      condition, recoveryPhase, age, painLevel, surgeryDate,
      medicalData, medicines, dietPlan, onboardingComplete
    } = req.body;

    const updateFields = {};
    if (condition !== undefined) updateFields.condition = condition;
    if (recoveryPhase !== undefined) updateFields.recoveryPhase = recoveryPhase;
    if (age !== undefined) updateFields.age = age;
    if (painLevel !== undefined) updateFields.painLevel = painLevel;
    if (surgeryDate !== undefined) updateFields.surgeryDate = surgeryDate;
    if (medicalData !== undefined) updateFields.medicalData = medicalData;
    if (medicines !== undefined) updateFields.medicines = medicines;
    if (dietPlan !== undefined) updateFields.dietPlan = dietPlan;
    if (onboardingComplete !== undefined) updateFields.onboardingComplete = onboardingComplete;

    const user = await User.findByIdAndUpdate(
      req.userId,
      updateFields,
      { new: true }
    ).select('-password');
    res.json(user);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Complete onboarding
router.post('/complete-onboarding', require('../middleware/auth'), async (req, res) => {
  try {
    const { medicalData, medicines, condition, recoveryPhase, age } = req.body;

    const updateFields = { onboardingComplete: true };
    if (medicalData) updateFields.medicalData = medicalData;
    if (medicines) updateFields.medicines = medicines;
    if (condition) updateFields.condition = condition;
    if (recoveryPhase) updateFields.recoveryPhase = recoveryPhase;
    if (age) updateFields.age = age;
    if (medicalData?.surgeryStatus === 'post_op' && medicalData?.surgeryDate) {
      updateFields.surgeryDate = medicalData.surgeryDate;
    }
    if (medicalData?.painLevel !== undefined) {
      updateFields.painLevel = medicalData.painLevel;
    }

    const user = await User.findByIdAndUpdate(
      req.userId, updateFields, { new: true }
    ).select('-password');

    res.json(user);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
