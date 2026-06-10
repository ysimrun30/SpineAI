const mongoose = require('mongoose');

const reportSchema = new mongoose.Schema({
  filename: String,
  originalName: String,
  uploadDate: { type: Date, default: Date.now },
  fileType: String,
  fileSize: Number,
  category: {
    type: String,
    enum: ['mri', 'xray', 'prescription', 'lab_report', 'other'],
    default: 'other'
  }
});

const feedbackEntrySchema = new mongoose.Schema({
  exercisePlanId: String,
  sessionDate: { type: Date, default: Date.now },
  painLevel: { type: Number, min: 0, max: 10 },
  difficulty: { type: String, enum: ['too_easy', 'just_right', 'too_hard'] },
  comments: String,
  exercisesCompleted: Number
});

const userSchema = new mongoose.Schema({
  firebaseUid: { type: String, unique: true, sparse: true },
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  password: { type: String },
  condition: {
    type: String,
    enum: ['herniated_disc', 'spinal_stenosis', 'scoliosis', 'post_surgery', 'general_back_pain'],
    default: 'general_back_pain'
  },
  surgeryDate: { type: Date },
  recoveryPhase: {
    type: String,
    enum: ['pre_surgery', 'acute', 'subacute', 'chronic', 'maintenance'],
    default: 'acute'
  },
  age: { type: Number },
  painLevel: { type: Number, min: 0, max: 10, default: 5 },
  createdAt: { type: Date, default: Date.now },

  // ====== NEW: Medical Data ======
  medicalData: {
    weight: Number,
    height: Number,
    spineIssueType: String,
    surgeryStatus: {
      type: String,
      enum: ['pre_op', 'post_op', 'no_surgery']
    },
    painLevel: { type: Number, min: 0, max: 10 },
    additionalNotes: String
  },

  // ====== NEW: Medicines (from prescriptions) ======
  medicines: [{
    name: String,
    dosage: String,
    frequency: String,
    purpose: String,
    dietaryNotes: String  // e.g. "Avoid vitamin K rich foods", "Take with calcium"
  }],

  // ====== NEW: Upload Reports ======
  reports: [reportSchema],

  // ====== NEW: Diet Plan ======
  dietPlan: {
    preferences: {
      dietType: { type: String, enum: ['veg', 'non_veg', 'vegan', 'eggetarian'] },
      allergies: [String],
      budget: { type: String, enum: ['low', 'medium', 'high'] },
      region: String
    },
    plan: { type: mongoose.Schema.Types.Mixed },
    generatedAt: Date
  },

  // ====== NEW: Feedback History ======
  feedbackHistory: [feedbackEntrySchema],

  // ====== NEW: Onboarding flag ======
  onboardingComplete: { type: Boolean, default: false }
});

module.exports = mongoose.model('User', userSchema);
