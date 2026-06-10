const router = require('express').Router();
const auth = require('../middleware/auth');
const { ExercisePlan } = require('../models/ExercisePlan');
const User = require('../models/User');

// ====== EXERCISE LIBRARY (expanded with safety notes + GIF placeholders) ======
const EXERCISE_LIBRARY = {
  herniated_disc: {
    acute: [
      { name: 'Cat-Cow Stretch', category: 'stretching', duration: 60, reps: 10, sets: 2, difficulty: 'beginner',
        description: 'Gentle spinal flexion-extension to improve mobility and reduce stiffness.',
        instructions: ['Start on hands and knees', 'Arch back upward (cat)', 'Drop belly downward (cow)', 'Move slowly and controlled'],
        warnings: ['Stop if sharp pain occurs'], safetyNotes: 'Keep movements slow and within pain-free range. Do not force any position.',
        gifUrl: '/exercises/cat-cow.gif', youtubeUrl: 'https://www.youtube.com/watch?v=kqnua4rHVVA', jointTracking: { primary: 'spine', landmarks: [11, 12, 23, 24] } },
      { name: 'Pelvic Tilt', category: 'strengthening', duration: 45, reps: 15, sets: 3, difficulty: 'beginner',
        description: 'Strengthens core muscles and stabilizes the lower back.',
        instructions: ['Lie on back, knees bent', 'Flatten lower back to floor', 'Hold 5 seconds, release'],
        warnings: ['Do not hold breath'], safetyNotes: 'Breathe normally throughout. Focus on engaging lower abdominals.',
        gifUrl: '/exercises/pelvic-tilt.gif', youtubeUrl: 'https://www.youtube.com/watch?v=MpMmXEBheLg', jointTracking: { primary: 'hip', landmarks: [23, 24, 25, 26] } },
      { name: 'Knee-to-Chest Stretch', category: 'stretching', duration: 60, reps: 8, sets: 2, difficulty: 'beginner',
        description: 'Stretches the lower back and glutes to relieve pressure on spinal nerves.',
        instructions: ['Lie on back', 'Pull one knee to chest gently', 'Hold 20 seconds each side'],
        warnings: ['Avoid if worsens radiating pain'], safetyNotes: 'Pull gently — never force the knee.',
        gifUrl: '/exercises/knee-to-chest.gif', youtubeUrl: 'https://www.youtube.com/watch?v=SnEHGcgmAIQ', jointTracking: { primary: 'hip', landmarks: [23, 25] } }
    ],
    subacute: [
      { name: 'Bird Dog', category: 'strengthening', duration: 90, reps: 10, sets: 3, difficulty: 'intermediate',
        description: 'Core stability exercise that strengthens back extensors without spinal loading.',
        instructions: ['Start on hands and knees', 'Extend opposite arm and leg', 'Hold 5 seconds, alternate sides'],
        warnings: ['Keep spine neutral throughout'], safetyNotes: 'Do not let hips rotate. Keep core engaged.',
        gifUrl: '/exercises/bird-dog.gif', youtubeUrl: 'https://www.youtube.com/watch?v=wiFNA3sqjCA', jointTracking: { primary: 'spine', landmarks: [11, 12, 23, 24, 15, 16, 27, 28] } },
      { name: 'Partial Curl', category: 'strengthening', duration: 60, reps: 12, sets: 3, difficulty: 'intermediate',
        description: 'Targeted abdominal strengthening to support spinal stability.',
        instructions: ['Lie on back, knees bent', 'Arms crossed on chest', 'Lift shoulders slightly off floor'],
        warnings: ['Do not pull neck'], safetyNotes: 'Lift only shoulder blades off floor. Look at ceiling.',
        gifUrl: '/exercises/partial-curl.gif', youtubeUrl: 'https://www.youtube.com/watch?v=Wb5MZ9_OYFI', jointTracking: { primary: 'spine', landmarks: [11, 12, 23, 24] } },
      { name: 'Bridge Exercise', category: 'strengthening', duration: 90, reps: 12, sets: 3, difficulty: 'intermediate',
        description: 'Strengthens glutes and hamstrings to support the lower back.',
        instructions: ['Lie on back, knees bent', 'Lift hips off floor', 'Hold 3 seconds, lower slowly'],
        warnings: ['Do not hyperextend lower back'], safetyNotes: 'Squeeze glutes at top. Keep ribs down.',
        gifUrl: '/exercises/bridge.gif', youtubeUrl: 'https://www.youtube.com/watch?v=wPM8icPu6H8', jointTracking: { primary: 'hip', landmarks: [23, 24, 25, 26] } }
    ],
    chronic: [
      { name: 'Superman Hold', category: 'strengthening', duration: 60, reps: 10, sets: 3, difficulty: 'intermediate',
        description: 'Strengthens entire posterior chain including back extensors.',
        instructions: ['Lie face down', 'Lift arms and legs simultaneously', 'Hold 3-5 seconds', 'Lower slowly'],
        warnings: ['Avoid if causes sharp pain'], safetyNotes: 'Lift only a few inches. Quality over height.',
        gifUrl: '/exercises/superman.gif', youtubeUrl: 'https://www.youtube.com/watch?v=z6PJMT2y8GQ', jointTracking: { primary: 'spine', landmarks: [11, 12, 23, 24] } },
      { name: 'Side Plank', category: 'strengthening', duration: 45, reps: 3, sets: 3, difficulty: 'advanced',
        description: 'Lateral core stability — critical for spinal support.',
        instructions: ['Lie on side, elbow under shoulder', 'Lift hips off ground', 'Hold 15-20 seconds each side'],
        warnings: ['Skip if shoulder pain'], safetyNotes: 'Keep body in straight line. Breathe steadily.',
        gifUrl: '/exercises/side-plank.gif', youtubeUrl: 'https://www.youtube.com/watch?v=K2VljzCC16g', jointTracking: { primary: 'spine', landmarks: [11, 12, 23, 24] } }
    ]
  },
  general_back_pain: {
    acute: [
      { name: "Child's Pose", category: 'stretching', duration: 60, reps: 5, sets: 2, difficulty: 'beginner',
        description: 'Gentle resting stretch that decompresses the spine.',
        instructions: ['Kneel on floor, sit back on heels', 'Stretch arms forward on floor', 'Hold 30-60 seconds'],
        warnings: ['Avoid if knee pain present'], safetyNotes: 'Use a pillow under knees if uncomfortable.',
        gifUrl: '/exercises/childs-pose.gif', youtubeUrl: 'https://www.youtube.com/watch?v=2MJGg-dUKh0', jointTracking: { primary: 'spine', landmarks: [11, 12, 23, 24] } },
      { name: 'Seated Spinal Twist', category: 'mobility', duration: 45, reps: 8, sets: 2, difficulty: 'beginner',
        description: 'Improves thoracic rotation and relieves tension.',
        instructions: ['Sit upright in chair', 'Rotate torso gently to each side', 'Hold 10 seconds each side'],
        warnings: ['Move within pain-free range'], safetyNotes: 'Keep hips facing forward. Only rotate upper body.',
        gifUrl: '/exercises/seated-twist.gif', youtubeUrl: 'https://www.youtube.com/watch?v=mEGM3mmIFYA', jointTracking: { primary: 'spine', landmarks: [11, 12, 23, 24] } },
      { name: 'Diaphragmatic Breathing', category: 'breathing', duration: 120, reps: 10, sets: 2, difficulty: 'beginner',
        description: 'Deep breathing to reduce pain, tension, and activate core stabilizers.',
        instructions: ['Lie on back comfortably', 'Place hand on belly', 'Breathe deeply expanding belly', 'Exhale fully'],
        warnings: [], safetyNotes: 'No risk. Focus on slow, deep breaths.',
        gifUrl: '/exercises/breathing.gif', youtubeUrl: 'https://www.youtube.com/watch?v=0Ua9bOsZTYg', jointTracking: { primary: 'spine', landmarks: [11, 12] } }
    ],
    subacute: [
      { name: 'Bridge Exercise', category: 'strengthening', duration: 90, reps: 12, sets: 3, difficulty: 'beginner',
        description: 'Strengthens glutes and hamstrings to support the lower back.',
        instructions: ['Lie on back, knees bent', 'Lift hips off floor', 'Hold 3 seconds, lower slowly'],
        warnings: ['Do not hyperextend lower back'], safetyNotes: 'Squeeze glutes at top.',
        gifUrl: '/exercises/bridge.gif', youtubeUrl: 'https://www.youtube.com/watch?v=wPM8icPu6H8', jointTracking: { primary: 'hip', landmarks: [23, 24, 25, 26] } },
      { name: 'Wall Sit', category: 'strengthening', duration: 60, reps: 5, sets: 3, difficulty: 'intermediate',
        description: 'Builds leg and core endurance with supported back position.',
        instructions: ['Stand with back against wall', 'Slide down until knees at 90°', 'Hold 20-30 seconds'],
        warnings: ['Stop if knee pain occurs'], safetyNotes: 'Keep back flat against wall throughout.',
        gifUrl: '/exercises/wall-sit.gif', youtubeUrl: 'https://www.youtube.com/watch?v=y-wV4Lk-uc8', jointTracking: { primary: 'hip', landmarks: [23, 24, 25, 26] } }
    ],
    chronic: [
      { name: 'Dead Bug', category: 'strengthening', duration: 90, reps: 10, sets: 3, difficulty: 'intermediate',
        description: 'Core stabilization exercise that teaches coordination without spinal stress.',
        instructions: ['Lie on back, arms up, knees bent 90°', 'Lower opposite arm and leg', 'Keep lower back pressed to floor', 'Alternate sides'],
        warnings: ['Stop if lower back lifts off floor'], safetyNotes: 'If back arches, reduce range of motion.',
        gifUrl: '/exercises/dead-bug.gif', youtubeUrl: 'https://www.youtube.com/watch?v=4XLEnwUr1d8', jointTracking: { primary: 'spine', landmarks: [11, 12, 13, 14, 23, 24, 25, 26] } }
    ]
  },
  post_surgery: {
    acute: [
      { name: 'Ankle Pumps', category: 'mobility', duration: 60, reps: 20, sets: 3, difficulty: 'beginner',
        description: 'Prevents blood clots and maintains circulation post-surgery.',
        instructions: ['Lie in bed', 'Pump feet up and down', 'Prevents blood clots'],
        warnings: ['Do as soon as cleared by surgeon'], safetyNotes: 'Can be done in bed immediately after surgery.',
        gifUrl: '/exercises/ankle-pumps.gif', youtubeUrl: 'https://www.youtube.com/watch?v=DQ2k-ELJOOI', jointTracking: { primary: 'ankle', landmarks: [27, 28, 29, 30] } },
      { name: 'Log Roll', category: 'mobility', duration: 30, reps: 4, sets: 2, difficulty: 'beginner',
        description: 'Safe technique for getting in and out of bed post-surgery.',
        instructions: ['Lie on back', 'Roll to side as one unit', 'Push up with arms to sit'],
        warnings: ['Do not twist spine'], safetyNotes: 'Move your entire body as one unit. No twisting.',
        gifUrl: '/exercises/log-roll.gif', youtubeUrl: 'https://www.youtube.com/watch?v=XMFpOuXIXkM', jointTracking: { primary: 'spine', landmarks: [11, 12, 23, 24] } },
      { name: 'Short Walk', category: 'mobility', duration: 300, reps: 1, sets: 2, difficulty: 'beginner',
        description: 'Walking promotes healing, prevents complications, and improves mood.',
        instructions: ['Walk slowly on flat surface', 'Increase distance daily', 'Stop if pain worsens'],
        warnings: ['Use assistive device if needed'], safetyNotes: 'Walk on flat, clear surfaces. Have someone nearby if unsteady.',
        gifUrl: '/exercises/walking.gif', youtubeUrl: 'https://www.youtube.com/watch?v=njeZ29umqVE', jointTracking: { primary: 'full_body', landmarks: [11, 12, 23, 24, 25, 26, 27, 28] } }
    ],
    subacute: [
      { name: 'Gentle Pelvic Tilt', category: 'strengthening', duration: 45, reps: 10, sets: 2, difficulty: 'beginner',
        description: 'Reactivates core muscles after surgery.',
        instructions: ['Lie on back, knees bent', 'Gently flatten lower back to floor', 'Hold 3 seconds, release'],
        warnings: ['Very gentle — no straining'], safetyNotes: 'Only flatten back, do not lift hips.',
        gifUrl: '/exercises/pelvic-tilt.gif', youtubeUrl: 'https://www.youtube.com/watch?v=MpMmXEBheLg', jointTracking: { primary: 'hip', landmarks: [23, 24] } },
      { name: 'Heel Slides', category: 'mobility', duration: 60, reps: 10, sets: 2, difficulty: 'beginner',
        description: 'Improves hip and knee mobility while protecting the spine.',
        instructions: ['Lie on back', 'Slide heel toward buttocks', 'Slide back out', 'Alternate legs'],
        warnings: ['Keep back flat'], safetyNotes: 'Slide slowly. Keep back still.',
        gifUrl: '/exercises/heel-slides.gif', youtubeUrl: 'https://www.youtube.com/watch?v=RpOXFKBRwBc', jointTracking: { primary: 'hip', landmarks: [23, 25, 24, 26] } }
    ]
  },
  spinal_stenosis: {
    acute: [
      { name: 'Forward Bend Stretch', category: 'stretching', duration: 60, reps: 8, sets: 2, difficulty: 'beginner',
        description: 'Opens the spinal canal — the preferred position for stenosis relief.',
        instructions: ['Sit in chair', 'Lean forward over knees', 'This opens spinal canal'],
        warnings: ['Avoid extension movements'], safetyNotes: 'Flexion (bending forward) generally feels better with stenosis.',
        gifUrl: '/exercises/forward-bend.gif', youtubeUrl: 'https://www.youtube.com/watch?v=g-7ZWPCWv0U', jointTracking: { primary: 'spine', landmarks: [11, 12, 23, 24] } },
      { name: 'Stationary Cycling', category: 'mobility', duration: 600, reps: 1, sets: 1, difficulty: 'beginner',
        description: 'Low-impact cardio in a flexed position — ideal for stenosis.',
        instructions: ['Use recumbent or upright bike', 'Lean slightly forward', 'Start with 5-10 minutes'],
        warnings: ['Avoid if causes leg symptoms'], safetyNotes: 'The slightly forward position opens the spinal canal.',
        gifUrl: '/exercises/cycling.gif', youtubeUrl: 'https://www.youtube.com/watch?v=TK4wnTMuM_g', jointTracking: { primary: 'hip', landmarks: [23, 24, 25, 26] } }
    ]
  },
  scoliosis: {
    acute: [
      { name: 'Side Stretch', category: 'stretching', duration: 60, reps: 8, sets: 2, difficulty: 'beginner',
        description: 'Stretches the concave side of the spinal curve.',
        instructions: ['Stand tall', 'Reach one arm overhead', 'Lean to the opposite side', 'Hold 15 seconds'],
        warnings: ['Stretch the tight side more'], safetyNotes: 'Stretch toward the convex side of your curve.',
        gifUrl: '/exercises/side-stretch.gif', youtubeUrl: 'https://www.youtube.com/watch?v=icAjorQk3jE', jointTracking: { primary: 'spine', landmarks: [11, 12, 23, 24, 15, 16] } },
      { name: 'Schroth Breathing', category: 'breathing', duration: 120, reps: 8, sets: 2, difficulty: 'beginner',
        description: 'Targeted rotational breathing used in scoliosis-specific physiotherapy.',
        instructions: ['Sit in corrected posture', 'Breathe into the concave side', 'Focus on expanding the collapsed area', 'Exhale slowly'],
        warnings: ['Best learned with a physiotherapist first'], safetyNotes: 'This is a specialized technique. Consult your PT for proper form.',
        gifUrl: '/exercises/breathing.gif', youtubeUrl: 'https://www.youtube.com/watch?v=F24N9z4YwBk', jointTracking: { primary: 'spine', landmarks: [11, 12] } }
    ]
  }
};

// Difficulty progression mapping
const DIFFICULTY_PROGRESSION = {
  beginner: { next: 'intermediate', weeks: 4 },
  intermediate: { next: 'advanced', weeks: 6 },
  advanced: { next: 'advanced', weeks: 0 }
};

const normalizeName = (s) => String(s)
  .toLowerCase()
  .replace(/[_-]+/g, ' ')
  .replace(/[^a-z0-9 ]/g, '')
  .replace(/\s+/g, ' ')
  .trim();

function buildLibraryIndex() {
  const all = [];
  Object.values(EXERCISE_LIBRARY).forEach(phases => {
    Object.values(phases).forEach(exs => all.push(...exs));
  });
  return new Map(all.map(ex => [normalizeName(ex.name), ex]));
}

// Recovery stage mapping based on weeks post-surgery
function getRecoveryStage(surgeryDate) {
  if (!surgeryDate) return null;
  const weeks = Math.floor((Date.now() - new Date(surgeryDate).getTime()) / (7 * 24 * 60 * 60 * 1000));
  if (weeks < 0) return { phase: 'pre_surgery', weeks: Math.abs(weeks), label: 'Pre-op' };
  if (weeks <= 4) return { phase: 'acute', weeks, label: `Week ${weeks} post-op` };
  if (weeks <= 12) return { phase: 'subacute', weeks, label: `Week ${weeks} post-op (Rehab)` };
  if (weeks <= 26) return { phase: 'chronic', weeks, label: `Month ${Math.floor(weeks / 4)} rehab` };
  return { phase: 'maintenance', weeks, label: 'Maintenance phase' };
}

// GET /api/exercises/plan - get personalized plan
router.get('/plan', auth, async (req, res) => {
  try {
    const user = await User.findById(req.userId);
    if (!user) return res.status(404).json({ error: 'User not found' });

    let plan = await ExercisePlan.findOne({ userId: req.userId });

    if (!plan) {
      const condition = user.condition || 'general_back_pain';
      const phase = user.recoveryPhase || 'acute';
      const exercises = EXERCISE_LIBRARY[condition]?.[phase] || EXERCISE_LIBRARY.general_back_pain.acute;

      plan = await ExercisePlan.create({
        userId: req.userId,
        name: `${condition.replace(/_/g, ' ')} Recovery Plan`,
        condition,
        recoveryPhase: phase,
        exercises
      });
    }

    // Add recovery stage info
    const recoveryStage = getRecoveryStage(user.surgeryDate);

    const libraryByName = buildLibraryIndex();
    const planObj = plan.toObject();
    planObj.exercises = (planObj.exercises || []).map(ex => {
      const lib = libraryByName.get(normalizeName(ex.name));
      if (!lib || !lib.youtubeUrl || ex.youtubeUrl === lib.youtubeUrl) return ex;
      return { ...ex, youtubeUrl: lib.youtubeUrl };
    });

    res.json({ ...planObj, recoveryStage });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/exercises/plan/regenerate
router.post('/plan/regenerate', auth, async (req, res) => {
  try {
    const user = await User.findById(req.userId);
    const condition = req.body.condition || user.condition || 'general_back_pain';
    const phase = req.body.recoveryPhase || user.recoveryPhase || 'acute';
    const exercises = EXERCISE_LIBRARY[condition]?.[phase] || EXERCISE_LIBRARY.general_back_pain.acute;

    const plan = await ExercisePlan.findOneAndUpdate(
      { userId: req.userId },
      { exercises, condition, recoveryPhase: phase, updatedAt: new Date() },
      { returnDocument: 'after', upsert: true }
    );
    res.json(plan);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/exercises/generate-plan — AI-powered plan generation with feedback adaptation
router.post('/generate-plan', auth, async (req, res) => {
  try {
    const user = await User.findById(req.userId);
    if (!user) return res.status(404).json({ error: 'User not found' });

    const condition = user.condition || 'general_back_pain';
    const recoveryStage = getRecoveryStage(user.surgeryDate);
    const phase = recoveryStage?.phase || user.recoveryPhase || 'acute';

    // Get recent feedback for adaptation
    const recentFeedback = (user.feedbackHistory || [])
      .sort((a, b) => new Date(b.sessionDate) - new Date(a.sessionDate))
      .slice(0, 5);

    let difficultyAdjustment = 'none';
    if (recentFeedback.length > 0) {
      const avgPain = recentFeedback.reduce((s, f) => s + f.painLevel, 0) / recentFeedback.length;
      const hardCount = recentFeedback.filter(f => f.difficulty === 'too_hard').length;
      const easyCount = recentFeedback.filter(f => f.difficulty === 'too_easy').length;

      if (avgPain >= 7 || hardCount >= 3) difficultyAdjustment = 'decrease';
      else if (avgPain <= 3 && easyCount >= 3) difficultyAdjustment = 'increase';
    }

    // Get base exercises
    let exercises = EXERCISE_LIBRARY[condition]?.[phase] || EXERCISE_LIBRARY.general_back_pain.acute;
    exercises = JSON.parse(JSON.stringify(exercises)); // deep clone

    // Apply difficulty adjustments
    if (difficultyAdjustment === 'decrease') {
      exercises = exercises.map(ex => ({
        ...ex,
        reps: Math.max(3, Math.floor(ex.reps * 0.7)),
        sets: Math.max(1, ex.sets - 1),
        difficulty: ex.difficulty === 'advanced' ? 'intermediate' : ex.difficulty === 'intermediate' ? 'beginner' : 'beginner',
        adaptationNote: '🔻 Reduced intensity based on your recent feedback'
      }));
    } else if (difficultyAdjustment === 'increase') {
      exercises = exercises.map(ex => ({
        ...ex,
        reps: Math.floor(ex.reps * 1.3),
        sets: ex.sets + 1,
        difficulty: DIFFICULTY_PROGRESSION[ex.difficulty]?.next || ex.difficulty,
        adaptationNote: '🔺 Increased intensity — you\'re making great progress!'
      }));
    }

    const plan = await ExercisePlan.findOneAndUpdate(
      { userId: req.userId },
      {
        exercises,
        condition,
        recoveryPhase: phase,
        name: `${condition.replace(/_/g, ' ')} ${recoveryStage?.label || phase} Plan`,
        updatedAt: new Date()
      },
      { returnDocument: 'after', upsert: true }
    );

    res.json({
      ...plan.toObject(),
      recoveryStage,
      difficultyAdjustment,
      feedbackSummary: {
        sessionsAnalyzed: recentFeedback.length,
        adjustment: difficultyAdjustment
      }
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/exercises/plan/from-ai - save AI recommendations as plan
router.post('/plan/from-ai', auth, async (req, res) => {
  try {
    const user = await User.findById(req.userId);
    if (!user) return res.status(404).json({ error: 'User not found' });

    const names = Array.isArray(req.body.exercises) ? req.body.exercises : [];
    if (names.length === 0) {
      return res.status(400).json({ error: 'Exercises list is required' });
    }

    const normalize = (s) => String(s)
      .toLowerCase()
      .replace(/[_-]+/g, ' ')
      .replace(/[^a-z0-9 ]/g, '')
      .replace(/\s+/g, ' ')
      .trim();

    const aliases = new Map([
      ['bird dog', 'Bird Dog'],
      ['bridge', 'Bridge Exercise'],
      ['cat cow', 'Cat-Cow Stretch'],
      ['dead bug', 'Dead Bug'],
      ['diaphragmatic breathing', 'Diaphragmatic Breathing'],
      ['heel slides', 'Heel Slides'],
      ['knee to chest', 'Knee-to-Chest Stretch'],
      ['pelvic tilt', 'Pelvic Tilt'],
      ['side plank', 'Side Plank'],
      ['side stretch', 'Side Stretch'],
      ['thoracic rotation', 'Seated Spinal Twist']
    ]);

    const resolveAlias = (name) => aliases.get(normalize(name)) || name;

    const library = [];
    Object.values(EXERCISE_LIBRARY).forEach(phases => {
      Object.values(phases).forEach(exs => library.push(...exs));
    });
    const byName = new Map(library.map(ex => [normalize(ex.name), ex]));

    const resolved = names.map(resolveAlias);
    const matched = resolved
      .map(n => byName.get(normalize(n)))
      .filter(Boolean);
    const uniqueMatched = [...new Map(matched.map(ex => [ex.name, ex])).values()];
    const unmatched = resolved.filter(n => !byName.has(normalize(n)));

    if (uniqueMatched.length === 0) {
      return res.status(400).json({ error: 'No matching exercises found in library' });
    }

    const condition = user.condition || 'general_back_pain';
    const phase = user.recoveryPhase || 'acute';

    const plan = await ExercisePlan.findOneAndUpdate(
      { userId: req.userId },
      {
        exercises: uniqueMatched,
        condition,
        recoveryPhase: phase,
        name: 'AI Recommended Plan',
        updatedAt: new Date()
      },
      { returnDocument: 'after', upsert: true }
    );

    res.json({ ...plan.toObject(), unmatchedExercises: unmatched });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ====== YOUTUBE HELPERS ======
function extractYouTubeId(url) {
  if (!url) return null;
  const match = url.match(/(?:youtube\.com\/(?:watch\?v=|embed\/|shorts\/|live\/)|youtu\.be\/)([a-zA-Z0-9_-]{11})/);
  return match ? match[1] : null;
}

function buildVideoPreview(ex) {
  const videoId = extractYouTubeId(ex.youtubeUrl);
  if (!videoId) return null;
  return {
    name: ex.name,
    youtubeUrl: ex.youtubeUrl,
    videoId,
    embedUrl: `https://www.youtube.com/embed/${videoId}?rel=0&modestbranding=1`,
    thumbnails: {
      default: `https://img.youtube.com/vi/${videoId}/default.jpg`,
      medium: `https://img.youtube.com/vi/${videoId}/mqdefault.jpg`,
      high: `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`,
      maxres: `https://img.youtube.com/vi/${videoId}/maxresdefault.jpg`,
    },
    description: ex.description,
    instructions: ex.instructions,
    warnings: ex.warnings,
    safetyNotes: ex.safetyNotes,
    duration: ex.duration,
    reps: ex.reps,
    sets: ex.sets,
    difficulty: ex.difficulty,
    category: ex.category,
  };
}

// GET /api/exercises/library
router.get('/library', (req, res) => {
  const all = [];
  Object.values(EXERCISE_LIBRARY).forEach(phases => {
    Object.values(phases).forEach(exs => all.push(...exs));
  });
  res.json([...new Map(all.map(e => [e.name, e])).values()]);
});

// GET /api/exercises/video-preview/:name - get video preview for one exercise
router.get('/video-preview/:name', (req, res) => {
  const normalize = (s) => String(s).toLowerCase().replace(/[_-]+/g, ' ').replace(/[^a-z0-9 ]/g, '').replace(/\s+/g, ' ').trim();
  const searchName = normalize(decodeURIComponent(req.params.name));

  let found = null;
  for (const phases of Object.values(EXERCISE_LIBRARY)) {
    for (const exs of Object.values(phases)) {
      for (const ex of exs) {
        if (normalize(ex.name) === searchName) { found = ex; break; }
      }
      if (found) break;
    }
    if (found) break;
  }

  if (!found) return res.status(404).json({ error: 'Exercise not found' });
  if (!found.youtubeUrl) return res.status(404).json({ error: 'No video available for this exercise' });

  const preview = buildVideoPreview(found);
  if (!preview) return res.status(400).json({ error: 'Invalid YouTube URL' });

  res.json(preview);
});

// GET /api/exercises/video-previews - batch: return previews for all exercises (or filtered by names query)
router.get('/video-previews', (req, res) => {
  const normalize = (s) => String(s).toLowerCase().replace(/[_-]+/g, ' ').replace(/[^a-z0-9 ]/g, '').replace(/\s+/g, ' ').trim();

  const all = [];
  Object.values(EXERCISE_LIBRARY).forEach(phases => {
    Object.values(phases).forEach(exs => all.push(...exs));
  });
  const unique = [...new Map(all.map(e => [e.name, e])).values()];

  let filtered = unique;
  if (req.query.names) {
    const nameList = req.query.names.split(',').map(n => normalize(n.trim()));
    filtered = unique.filter(ex => nameList.includes(normalize(ex.name)));
  }

  const previews = filtered
    .map(buildVideoPreview)
    .filter(Boolean);

  res.json(previews);
});

module.exports = router;
