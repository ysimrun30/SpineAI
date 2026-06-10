const mongoose = require('mongoose');

// --- POSTURE SESSION SCHEMA ---
const postureSessionSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  startTime: { type: Date, default: Date.now },
  endTime: { type: Date },
  averageScore: { type: Number },
  snapshots: [{
    timestamp: Date,
    score: Number,
    status: String,
    issues: [String]
  }]
});

// --- EXERCISE LOG SCHEMA (Merged with detailed metrics) ---
const exerciseLogSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  exerciseName: { type: String, required: true },
  exerciseId: { type: String },
  completedAt: { type: Date, default: Date.now },
  duration: { type: Number }, // actual seconds taken
  setsCompleted: { type: Number },
  repsCompleted: { type: Number },
  successScore: { type: Number }, // 0-100 combined score
  formMatchScore: { type: Number }, // 0-100 form accuracy
  postureScore: { type: Number }, // 0-100 posture consistency
  grade: { type: String }, // A+, A, B, C, D, F
  formChecks: [{
    name: { type: String },
    avgScore: { type: Number },
    idealAngle: { type: Number },
    avgAngle: { type: Number },
    accuracy: { type: Number }, // percentage of frames with good form
    tip: { type: String }
  }],
  scoreTimeline: [{
    time: { type: Number }, // seconds into session
    score: { type: Number },
    postureScore: { type: Number },
    repCount: { type: Number }
  }],
  bestMoment: { 
    time: { type: Number }, 
    score: { type: Number } 
  },
  worstMoment: { 
    time: { type: Number }, 
    score: { type: Number } 
  },
  autoCompleted: { type: Boolean, default: false },
  painLevel: { type: Number, min: 0, max: 10 },
  notes: { type: String }
});

// --- DAILY PROGRESS SCHEMA ---
const dailyProgressSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  date: { type: Date, required: true },
  exercisesCompleted: { type: Number, default: 0 },
  exercisesPlanned: { type: Number, default: 0 },
  averagePostureScore: { type: Number },
  painLevel: { type: Number },
  mood: { type: String, enum: ['great', 'good', 'okay', 'bad'] },
  notes: { type: String }
});

// Ensure a user can't have duplicate progress entries for the same day
dailyProgressSchema.index({ userId: 1, date: 1 }, { unique: true });

module.exports = {
  PostureSession: mongoose.model('PostureSession', postureSessionSchema),
  ExerciseLog: mongoose.model('ExerciseLog', exerciseLogSchema),
  DailyProgress: mongoose.model('DailyProgress', dailyProgressSchema)
};