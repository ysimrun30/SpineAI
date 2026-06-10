import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import API from '../utils/api';

const SPINE_ISSUES = [
  { value: 'herniated_disc', label: 'Herniated Disc' },
  { value: 'spinal_stenosis', label: 'Spinal Stenosis' },
  { value: 'scoliosis', label: 'Scoliosis' },
  { value: 'degenerative_disc', label: 'Degenerative Disc Disease' },
  { value: 'post_surgery', label: 'Post Surgery Recovery' },
  { value: 'general_back_pain', label: 'General Back Pain' },
];

const SURGERY_STATUS = [
  { value: 'pre_op', label: '🔜 Pre-Operation (Surgery Planned)' },
  { value: 'post_op', label: '✅ Post-Operation (Already Had Surgery)' },
  { value: 'no_surgery', label: '❌ No Surgery Planned' },
];

const DIET_TYPES = [
  { value: 'veg', label: '🥬 Vegetarian' },
  { value: 'non_veg', label: '🍗 Non-Vegetarian' },
  { value: 'vegan', label: '🌱 Vegan' },
  { value: 'eggetarian', label: '🥚 Eggetarian' },
];

const ALLERGY_OPTIONS = ['Dairy', 'Gluten', 'Nuts', 'Soy', 'Shellfish', 'Eggs', 'Fish', 'Wheat'];
const REGIONS = ['North Indian', 'South Indian', 'Bengali', 'Gujarati', 'Maharashtrian', 'Punjabi', 'Continental', 'Mediterranean', 'Other'];

export default function OnboardingPage() {
  const { updateUser } = useAuth();
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const [form, setForm] = useState({
    age: '', weight: '', height: '',
    spineIssueType: 'general_back_pain',
    surgeryStatus: 'no_surgery',
    surgeryDate: '',
    painLevel: 5,
    additionalNotes: '',
    dietType: 'non_veg',
    allergies: [],
    budget: 'medium',
    region: 'North Indian',
    medicines: [{ name: '', dosage: '', frequency: '', purpose: '' }]
  });

  const [uploadedFiles, setUploadedFiles] = useState([]);
  const [uploading, setUploading] = useState(false);

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const toggleAllergy = (a) => {
    setForm(f => ({
      ...f,
      allergies: f.allergies.includes(a)
        ? f.allergies.filter(x => x !== a)
        : [...f.allergies, a]
    }));
  };

  const updateMedicine = (index, field, value) => {
    const meds = [...form.medicines];
    meds[index] = { ...meds[index], [field]: value };
    setForm(f => ({ ...f, medicines: meds }));
  };

  const addMedicine = () => {
    setForm(f => ({ ...f, medicines: [...f.medicines, { name: '', dosage: '', frequency: '', purpose: '' }] }));
  };

  const removeMedicine = (index) => {
    setForm(f => ({ ...f, medicines: f.medicines.filter((_, i) => i !== index) }));
  };

  const handleFileUpload = async (e) => {
    const files = Array.from(e.target.files);
    if (files.length === 0) return;

    setUploading(true);
    for (const file of files) {
      try {
        const formData = new FormData();
        formData.append('report', file);
        formData.append('category', guessCategory(file.name));
        const { data } = await API.post('/upload-report', formData, {
          headers: { 'Content-Type': 'multipart/form-data' }
        });
        setUploadedFiles(prev => [...prev, data.report]);
      } catch (err) {
        setError(`Failed to upload ${file.name}`);
      }
    }
    setUploading(false);
  };

  const guessCategory = (filename) => {
    const lower = filename.toLowerCase();
    if (lower.includes('mri')) return 'mri';
    if (lower.includes('xray') || lower.includes('x-ray')) return 'xray';
    if (lower.includes('prescription') || lower.includes('rx')) return 'prescription';
    if (lower.includes('lab') || lower.includes('blood')) return 'lab_report';
    return 'other';
  };

  const removeUploadedFile = async (reportId) => {
    try {
      await API.delete(`/upload-report/${reportId}`);
      setUploadedFiles(prev => prev.filter(f => f._id !== reportId));
    } catch (err) {
      setError('Failed to remove file');
    }
  };

  const handleComplete = async () => {
    setLoading(true);
    setError('');
    try {
      const validMedicines = form.medicines.filter(m => m.name.trim() !== '');

      const { data } = await API.post('/auth/complete-onboarding', {
        medicalData: {
          weight: Number(form.weight) || undefined,
          height: Number(form.height) || undefined,
          spineIssueType: form.spineIssueType,
          surgeryStatus: form.surgeryStatus,
          surgeryDate: form.surgeryDate || undefined,
          painLevel: form.painLevel,
          additionalNotes: form.additionalNotes
        },
        medicines: validMedicines,
        condition: form.spineIssueType,
        recoveryPhase: form.surgeryStatus === 'post_op' ? 'acute' : form.surgeryStatus === 'pre_op' ? 'pre_surgery' : 'chronic',
        age: Number(form.age) || undefined
      });

      // Generate initial diet plan
      try {
        await API.post('/diet-plan/generate', {
          preferences: {
            dietType: form.dietType,
            allergies: form.allergies,
            budget: form.budget,
            region: form.region
          }
        });
      } catch (e) { console.warn('Diet plan generation deferred:', e.message); }

      // Generate initial exercise plan
      try {
        await API.post('/exercises/generate-plan');
      } catch (e) { console.warn('Exercise plan generation deferred:', e.message); }

      updateUser(data);
    } catch (err) {
      setError(err.response?.data?.error || 'Something went wrong');
    } finally {
      setLoading(false);
    }
  };

  const canAdvance = () => {
    if (step === 1) return form.age && form.spineIssueType;
    if (step === 2) return form.surgeryStatus;
    if (step === 3) return form.dietType;
    return true;
  };

  const STEPS = [
    { num: 1, label: 'Medical Info' },
    { num: 2, label: 'Surgery & Pain' },
    { num: 3, label: 'Diet & Meds' },
    { num: 4, label: 'Reports' },
  ];

  return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4 font-body">
      <div className="w-full max-w-2xl">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="w-14 h-14 bg-sky-500 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <span className="text-white font-bold text-2xl">S</span>
          </div>
          <h1 className="font-display text-3xl text-white mb-2">Welcome to SpineAI</h1>
          <p className="text-slate-400">Let's set up your personalized recovery profile</p>
        </div>

        {/* Progress steps */}
        <div className="flex items-center justify-center gap-2 mb-8">
          {STEPS.map((s, i) => (
            <React.Fragment key={s.num}>
              <button
                onClick={() => s.num < step && setStep(s.num)}
                className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium transition-all ${
                  step === s.num
                    ? 'bg-sky-500 text-white'
                    : step > s.num
                    ? 'bg-sky-500/20 text-sky-400 cursor-pointer'
                    : 'bg-slate-800 text-slate-500'
                }`}
              >
                <span className="w-5 h-5 rounded-full bg-white/20 flex items-center justify-center text-[10px]">
                  {step > s.num ? '✓' : s.num}
                </span>
                <span className="hidden sm:inline">{s.label}</span>
              </button>
              {i < STEPS.length - 1 && (
                <div className={`w-8 h-0.5 rounded ${step > s.num ? 'bg-sky-500' : 'bg-slate-700'}`} />
              )}
            </React.Fragment>
          ))}
        </div>

        {error && (
          <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-3 mb-6 text-red-400 text-sm">{error}</div>
        )}

        {/* Card */}
        <div className="bg-slate-900/80 backdrop-blur border border-slate-800 rounded-2xl p-8">

          {/* Step 1: Medical Info */}
          {step === 1 && (
            <div className="space-y-5">
              <div>
                <h2 className="font-display text-xl text-white mb-1">Basic Medical Information</h2>
                <p className="text-slate-500 text-sm">Help us understand your condition</p>
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="block text-slate-400 text-sm mb-1">Age *</label>
                  <input type="number" className="w-full bg-slate-800 border border-slate-700 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-sky-500 transition-colors"
                    placeholder="30" value={form.age} onChange={e => set('age', e.target.value)} />
                </div>
                <div>
                  <label className="block text-slate-400 text-sm mb-1">Weight (kg)</label>
                  <input type="number" className="w-full bg-slate-800 border border-slate-700 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-sky-500 transition-colors"
                    placeholder="70" value={form.weight} onChange={e => set('weight', e.target.value)} />
                </div>
                <div>
                  <label className="block text-slate-400 text-sm mb-1">Height (cm)</label>
                  <input type="number" className="w-full bg-slate-800 border border-slate-700 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-sky-500 transition-colors"
                    placeholder="170" value={form.height} onChange={e => set('height', e.target.value)} />
                </div>
              </div>

              <div>
                <label className="block text-slate-400 text-sm mb-2">Type of Spine Issue *</label>
                <div className="grid grid-cols-2 gap-2">
                  {SPINE_ISSUES.map(s => (
                    <button key={s.value} onClick={() => set('spineIssueType', s.value)}
                      className={`px-4 py-3 rounded-lg text-sm text-left transition-all border ${
                        form.spineIssueType === s.value
                          ? 'bg-sky-500/20 border-sky-500/50 text-sky-300'
                          : 'bg-slate-800 border-slate-700 text-slate-400 hover:border-slate-600'
                      }`}>
                      {s.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Step 2: Surgery & Pain */}
          {step === 2 && (
            <div className="space-y-5">
              <div>
                <h2 className="font-display text-xl text-white mb-1">Surgery & Pain Level</h2>
                <p className="text-slate-500 text-sm">This helps us tailor your exercise intensity</p>
              </div>

              <div>
                <label className="block text-slate-400 text-sm mb-2">Surgery Status *</label>
                <div className="space-y-2">
                  {SURGERY_STATUS.map(s => (
                    <button key={s.value} onClick={() => set('surgeryStatus', s.value)}
                      className={`w-full px-4 py-3 rounded-lg text-sm text-left transition-all border ${
                        form.surgeryStatus === s.value
                          ? 'bg-sky-500/20 border-sky-500/50 text-sky-300'
                          : 'bg-slate-800 border-slate-700 text-slate-400 hover:border-slate-600'
                      }`}>
                      {s.label}
                    </button>
                  ))}
                </div>
              </div>

              {form.surgeryStatus === 'post_op' && (
                <div>
                  <label className="block text-slate-400 text-sm mb-1">Surgery Date</label>
                  <input type="date" className="w-full bg-slate-800 border border-slate-700 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-sky-500 transition-colors"
                    value={form.surgeryDate} onChange={e => set('surgeryDate', e.target.value)} />
                </div>
              )}

              <div>
                <label className="block text-slate-400 text-sm mb-2">
                  Current Pain Level: <span className="text-white font-medium">{form.painLevel}/10</span>
                </label>
                <input type="range" min="0" max="10" step="1"
                  className="w-full accent-sky-500"
                  value={form.painLevel} onChange={e => set('painLevel', Number(e.target.value))} />
                <div className="flex justify-between text-xs text-slate-600 mt-1">
                  <span>No pain</span>
                  <span>Moderate</span>
                  <span>Severe</span>
                </div>
                <div className="mt-2 text-center">
                  <span className="text-2xl">{
                    form.painLevel <= 2 ? '😊' : form.painLevel <= 4 ? '🙂' : form.painLevel <= 6 ? '😐' : form.painLevel <= 8 ? '😣' : '😖'
                  }</span>
                </div>
              </div>

              <div>
                <label className="block text-slate-400 text-sm mb-1">Additional Notes</label>
                <textarea className="w-full bg-slate-800 border border-slate-700 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-sky-500 transition-colors resize-none"
                  rows={3} placeholder="Any other details about your condition..."
                  value={form.additionalNotes} onChange={e => set('additionalNotes', e.target.value)} />
              </div>
            </div>
          )}

          {/* Step 3: Diet & Medicines */}
          {step === 3 && (
            <div className="space-y-5">
              <div>
                <h2 className="font-display text-xl text-white mb-1">Diet Preferences & Medicines</h2>
                <p className="text-slate-500 text-sm">We'll create a recovery-optimized diet plan considering your medications</p>
              </div>

              <div>
                <label className="block text-slate-400 text-sm mb-2">Diet Type *</label>
                <div className="grid grid-cols-2 gap-2">
                  {DIET_TYPES.map(d => (
                    <button key={d.value} onClick={() => set('dietType', d.value)}
                      className={`px-4 py-3 rounded-lg text-sm text-left transition-all border ${
                        form.dietType === d.value
                          ? 'bg-sky-500/20 border-sky-500/50 text-sky-300'
                          : 'bg-slate-800 border-slate-700 text-slate-400 hover:border-slate-600'
                      }`}>
                      {d.label}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-slate-400 text-sm mb-2">Allergies</label>
                <div className="flex flex-wrap gap-2">
                  {ALLERGY_OPTIONS.map(a => (
                    <button key={a} onClick={() => toggleAllergy(a)}
                      className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all border ${
                        form.allergies.includes(a)
                          ? 'bg-red-500/20 border-red-500/50 text-red-300'
                          : 'bg-slate-800 border-slate-700 text-slate-400 hover:border-slate-600'
                      }`}>
                      {form.allergies.includes(a) ? '✕ ' : ''}{a}
                    </button>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-slate-400 text-sm mb-1">Budget</label>
                  <select className="w-full bg-slate-800 border border-slate-700 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-sky-500 transition-colors"
                    value={form.budget} onChange={e => set('budget', e.target.value)}>
                    <option value="low">💰 Budget-Friendly</option>
                    <option value="medium">💰💰 Moderate</option>
                    <option value="high">💰💰💰 Premium</option>
                  </select>
                </div>
                <div>
                  <label className="block text-slate-400 text-sm mb-1">Cuisine Preference</label>
                  <select className="w-full bg-slate-800 border border-slate-700 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-sky-500 transition-colors"
                    value={form.region} onChange={e => set('region', e.target.value)}>
                    {REGIONS.map(r => <option key={r} value={r}>{r}</option>)}
                  </select>
                </div>
              </div>

              {/* Medicines section */}
              <div>
                <label className="block text-slate-400 text-sm mb-2">💊 Current Medicines (from prescriptions)</label>
                <p className="text-slate-600 text-xs mb-3">Adding your medicines helps us adjust your diet plan to avoid food-drug interactions</p>
                <div className="space-y-3">
                  {form.medicines.map((med, i) => (
                    <div key={i} className="bg-slate-800/50 border border-slate-700 rounded-lg p-3">
                      <div className="grid grid-cols-2 gap-2 mb-2">
                        <input className="bg-slate-800 border border-slate-700 rounded px-3 py-2 text-white text-sm focus:outline-none focus:border-sky-500"
                          placeholder="Medicine name" value={med.name} onChange={e => updateMedicine(i, 'name', e.target.value)} />
                        <input className="bg-slate-800 border border-slate-700 rounded px-3 py-2 text-white text-sm focus:outline-none focus:border-sky-500"
                          placeholder="Dosage (e.g. 500mg)" value={med.dosage} onChange={e => updateMedicine(i, 'dosage', e.target.value)} />
                      </div>
                      <div className="flex gap-2">
                        <input className="flex-1 bg-slate-800 border border-slate-700 rounded px-3 py-2 text-white text-sm focus:outline-none focus:border-sky-500"
                          placeholder="Frequency (e.g. Twice daily)" value={med.frequency} onChange={e => updateMedicine(i, 'frequency', e.target.value)} />
                        <input className="flex-1 bg-slate-800 border border-slate-700 rounded px-3 py-2 text-white text-sm focus:outline-none focus:border-sky-500"
                          placeholder="Purpose (e.g. Pain relief)" value={med.purpose} onChange={e => updateMedicine(i, 'purpose', e.target.value)} />
                        {form.medicines.length > 1 && (
                          <button onClick={() => removeMedicine(i)} className="text-red-400 hover:text-red-300 text-sm px-2">✕</button>
                        )}
                      </div>
                    </div>
                  ))}
                  <button onClick={addMedicine} className="text-sky-400 hover:text-sky-300 text-sm transition-colors">
                    + Add another medicine
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Step 4: Upload Reports */}
          {step === 4 && (
            <div className="space-y-5">
              <div>
                <h2 className="font-display text-xl text-white mb-1">Medical Reports</h2>
                <p className="text-slate-500 text-sm">Upload your MRI scans, X-rays, prescriptions (optional)</p>
              </div>

              <div className="border-2 border-dashed border-slate-700 hover:border-sky-500/50 rounded-xl p-8 text-center transition-colors">
                <input type="file" multiple accept=".pdf,.jpg,.jpeg,.png,.webp"
                  onChange={handleFileUpload} className="hidden" id="report-upload" />
                <label htmlFor="report-upload" className="cursor-pointer">
                  <div className="text-4xl mb-3">{uploading ? '⏳' : '📁'}</div>
                  <p className="text-white font-medium mb-1">
                    {uploading ? 'Uploading...' : 'Click to upload files'}
                  </p>
                  <p className="text-slate-500 text-sm">PDF, JPG, PNG up to 10MB each</p>
                </label>
              </div>

              {uploadedFiles.length > 0 && (
                <div className="space-y-2">
                  <p className="text-slate-400 text-sm font-medium">{uploadedFiles.length} file(s) uploaded</p>
                  {uploadedFiles.map(f => (
                    <div key={f._id} className="flex items-center justify-between bg-slate-800/50 border border-slate-700 rounded-lg px-4 py-3">
                      <div className="flex items-center gap-3">
                        <span className="text-lg">{f.fileType === 'pdf' ? '📄' : '🖼️'}</span>
                        <div>
                          <p className="text-white text-sm">{f.originalName}</p>
                          <p className="text-slate-500 text-xs capitalize">{f.category} · {(f.fileSize / 1024).toFixed(1)} KB</p>
                        </div>
                      </div>
                      <button onClick={() => removeUploadedFile(f._id)} className="text-red-400 hover:text-red-300 text-xs">Remove</button>
                    </div>
                  ))}
                </div>
              )}

              <div className="bg-sky-500/10 border border-sky-500/20 rounded-lg p-4">
                <p className="text-sky-300 text-sm font-medium mb-1">🔒 Your data is secure</p>
                <p className="text-slate-400 text-xs">Files are stored securely and only accessible to you. They help us provide better personalized recommendations.</p>
              </div>
            </div>
          )}

          {/* Navigation buttons */}
          <div className="flex justify-between mt-8 pt-6 border-t border-slate-800">
            {step > 1 ? (
              <button onClick={() => setStep(s => s - 1)}
                className="px-6 py-2.5 rounded-lg text-sm font-medium bg-slate-800 hover:bg-slate-700 text-slate-300 transition-all">
                ← Back
              </button>
            ) : <div />}

            {step < 4 ? (
              <button onClick={() => setStep(s => s + 1)} disabled={!canAdvance()}
                className="px-6 py-2.5 rounded-lg text-sm font-medium bg-sky-500 hover:bg-sky-400 disabled:opacity-40 text-white transition-all">
                Next →
              </button>
            ) : (
              <button onClick={handleComplete} disabled={loading}
                className="px-8 py-2.5 rounded-lg text-sm font-medium bg-emerald-500 hover:bg-emerald-400 disabled:opacity-50 text-white transition-all flex items-center gap-2">
                {loading && <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />}
                {loading ? 'Setting up...' : '✓ Complete Setup'}
              </button>
            )}
          </div>
        </div>

        {/* Skip option */}
        <p className="text-center mt-4">
          <button onClick={handleComplete} className="text-slate-600 hover:text-slate-400 text-sm transition-colors">
            Skip for now →
          </button>
        </p>
      </div>
    </div>
  );
}
