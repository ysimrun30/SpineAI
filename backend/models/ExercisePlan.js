const mongoose = require('mongoose');

// Schema for individual Exercises
// This is used both as a standalone collection and as a sub-document within ExercisePlan
const exerciseSchema = new mongoose.Schema({
  name: { type: String, required: true },
  description: { type: String },
  category: { 
    type: String, 
    enum: ['stretching', 'strengthening', 'mobility', 'breathing', 'posture', 'cardio'], 
    default: 'stretching' 
  },
  targetConditions: [{ type: String }],
  recoveryPhases: [{ type: String }],
  duration: { type: Number }, // in seconds
  reps: { type: Number },
  sets: { type: Number },
  instructions: [{ type: String }],
  videoUrl: { type: String },    // Original video field
  youtubeUrl: { type: String },  // Specifically for YouTube integration
  imageUrl: { type: String },    // Static images
  gifUrl: { type: String },       // For animated instruction placeholders
  difficulty: { 
    type: String, 
    enum: ['beginner', 'intermediate', 'advanced'], 
    default: 'beginner' 
  },
  warnings: [{ type: String }],
  safetyNotes: { type: String },
  adaptationNote: { type: String }, // For AI-generated intensity changes
  jointTracking: {
    primary: { type: String },
    landmarks: [{ type: Number }]
  }
});

// Schema for the User's Exercise Plan
const exercisePlanSchema = new mongoose.Schema({
  userId: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'User', 
    required: true,
    index: true // Optimized for lookups
  },
  name: { type: String, default: 'My Recovery Plan' },
  condition: { type: String },
  recoveryPhase: { type: String },
  exercises: [exerciseSchema], // Nested array of exercises
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

// Update the 'updatedAt' timestamp before saving
exercisePlanSchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  next();
});

module.exports = {
  ExercisePlan: mongoose.model('ExercisePlan', exercisePlanSchema),
  Exercise: mongoose.model('Exercise', exerciseSchema)
};