import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import API from '../utils/api';

const CATEGORY_ICONS = { mri: '🧲', xray: '☢️', prescription: '💊', lab_report: '🧪', other: '📄' };
const MEAL_ICONS = { breakfast: '🌅', mid_morning: '☕', lunch: '🍽️', evening_snack: '🍎', dinner: '🌙' };

export default function ProfilePage() {
  const { user, updateUser } = useAuth();
  const [tab, setTab] = useState('medical');
  const [reports, setReports] = useState([]);
  const [dietData, setDietData] = useState(null);
  const [feedbackHistory, setFeedbackHistory] = useState([]);
  const [loading, setLoading] = useState({});
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    API.get('/upload-report').then(r => setReports(r.data)).catch(() => {});
    API.get('/diet-plan').then(r => setDietData(r.data)).catch(() => {});
    API.get('/feedback').then(r => setFeedbackHistory(r.data)).catch(() => {});
  }, []);

  const handleUpload = async (e) => {
    const files = Array.from(e.target.files);
    if (!files.length) return;
    setUploading(true);
    for (const file of files) {
      try {
        const formData = new FormData();
        formData.append('report', file);
        const { data } = await API.post('/upload-report', formData, {
          headers: { 'Content-Type': 'multipart/form-data' }
        });
        setReports(prev => [...prev, data.report]);
      } catch (e) { console.error(e); }
    }
    setUploading(false);
  };

  const deleteReport = async (id) => {
    try {
      await API.delete(`/upload-report/${id}`);
      setReports(prev => prev.filter(r => r._id !== id));
    } catch (e) { console.error(e); }
  };

  const regenerateDiet = async () => {
    setLoading(l => ({ ...l, diet: true }));
    try {
      const { data } = await API.post('/diet-plan/generate', {
        preferences: dietData?.dietPlan?.preferences || {}
      });
      setDietData(data);
    } catch (e) { console.error(e); }
    setLoading(l => ({ ...l, diet: false }));
  };

  const TABS = [
    { id: 'medical', label: '🏥 Medical', },
    { id: 'reports', label: '📋 Reports' },
    { id: 'diet', label: '🥗 Diet Plan' },
    { id: 'feedback', label: '📊 History' },
  ];

  return (
    <div className="max-w-5xl mx-auto px-4 py-8">
      <div className="mb-6">
        <h2 className="font-display text-3xl text-white mb-1">My Profile</h2>
        <p className="text-slate-400 text-sm">Manage your medical data, reports, and diet plan</p>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 mb-6 overflow-x-auto pb-2">
        {TABS.map(t => (
          <button key={t.id} onClick={() => setTab(t.id)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all whitespace-nowrap ${
              tab === t.id ? 'bg-sky-500/20 text-sky-400 border border-sky-500/30' : 'text-slate-400 hover:text-white hover:bg-slate-800'
            }`}>
            {t.label}
          </button>
        ))}
      </div>

      {/* Medical Data Tab */}
      {tab === 'medical' && (
        <div className="space-y-6">
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-6">
            <h3 className="text-white font-medium mb-4">Medical Information</h3>
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {[
                { label: 'Condition', value: user?.condition?.replace(/_/g, ' '), icon: '🏷️' },
                { label: 'Recovery Phase', value: user?.recoveryPhase?.replace(/_/g, ' '), icon: '📈' },
                { label: 'Age', value: user?.age, icon: '🎂' },
                { label: 'Pain Level', value: `${user?.painLevel || 0}/10`, icon: '⚡' },
                { label: 'Weight', value: user?.medicalData?.weight ? `${user.medicalData.weight} kg` : '—', icon: '⚖️' },
                { label: 'Height', value: user?.medicalData?.height ? `${user.medicalData.height} cm` : '—', icon: '📏' },
                { label: 'Surgery Status', value: user?.medicalData?.surgeryStatus?.replace(/_/g, ' ') || '—', icon: '🔬' },
                { label: 'Surgery Date', value: user?.surgeryDate ? new Date(user.surgeryDate).toLocaleDateString() : '—', icon: '📅' },
                { label: 'Spine Issue', value: user?.medicalData?.spineIssueType?.replace(/_/g, ' ') || '—', icon: '🦴' },
              ].map(item => (
                <div key={item.label} className="bg-slate-800/50 border border-slate-700 rounded-lg p-4">
                  <div className="flex items-center gap-2 mb-1">
                    <span>{item.icon}</span>
                    <span className="text-slate-400 text-xs">{item.label}</span>
                  </div>
                  <p className="text-white font-medium capitalize">{item.value || '—'}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Medicines list */}
          {user?.medicines && user.medicines.length > 0 && (
            <div className="bg-slate-900 border border-slate-800 rounded-xl p-6">
              <h3 className="text-white font-medium mb-4">💊 Current Medicines</h3>
              <div className="space-y-3">
                {user.medicines.map((med, i) => (
                  <div key={i} className="bg-slate-800/50 border border-slate-700 rounded-lg p-4 flex items-start justify-between">
                    <div>
                      <p className="text-white font-medium">{med.name}</p>
                      <p className="text-slate-400 text-sm">{med.dosage} · {med.frequency}</p>
                      {med.purpose && <p className="text-slate-500 text-xs mt-1">For: {med.purpose}</p>}
                    </div>
                    <span className="text-2xl">💊</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Reports Tab */}
      {tab === 'reports' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-white font-medium">Medical Reports ({reports.length})</h3>
            <label className="cursor-pointer bg-sky-500 hover:bg-sky-400 text-white px-4 py-2 rounded-lg text-sm font-medium transition-all flex items-center gap-2">
              {uploading ? <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> : '📤'}
              {uploading ? 'Uploading...' : 'Upload Report'}
              <input type="file" multiple accept=".pdf,.jpg,.jpeg,.png,.webp" onChange={handleUpload} className="hidden" />
            </label>
          </div>

          {reports.length === 0 ? (
            <div className="bg-slate-900 border border-slate-800 rounded-xl p-12 text-center">
              <div className="text-5xl mb-4">📋</div>
              <p className="text-slate-400 mb-2">No reports uploaded yet</p>
              <p className="text-slate-600 text-sm">Upload your MRI scans, X-rays, prescriptions for better recommendations</p>
            </div>
          ) : (
            <div className="grid sm:grid-cols-2 gap-3">
              {reports.map(r => (
                <div key={r._id} className="bg-slate-900 border border-slate-800 rounded-xl p-4 hover:border-slate-700 transition-colors">
                  <div className="flex items-start justify-between">
                    <div className="flex items-start gap-3">
                      <span className="text-2xl">{CATEGORY_ICONS[r.category] || '📄'}</span>
                      <div>
                        <p className="text-white text-sm font-medium">{r.originalName}</p>
                        <p className="text-slate-500 text-xs mt-0.5 capitalize">
                          {r.category?.replace(/_/g, ' ')} · {(r.fileSize / 1024).toFixed(1)} KB
                        </p>
                        <p className="text-slate-600 text-xs mt-0.5">
                          {new Date(r.uploadDate).toLocaleDateString()}
                        </p>
                      </div>
                    </div>
                    <button onClick={() => deleteReport(r._id)}
                      className="text-red-400/60 hover:text-red-400 text-xs transition-colors">
                      🗑️
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Diet Plan Tab */}
      {tab === 'diet' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-white font-medium">Personalized Diet Plan</h3>
            <button onClick={regenerateDiet} disabled={loading.diet}
              className="bg-sky-500 hover:bg-sky-400 disabled:opacity-50 text-white px-4 py-2 rounded-lg text-sm font-medium transition-all flex items-center gap-2">
              {loading.diet && <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />}
              {loading.diet ? 'Generating...' : '🔄 Regenerate'}
            </button>
          </div>

          {!dietData?.dietPlan?.plan ? (
            <div className="bg-slate-900 border border-slate-800 rounded-xl p-12 text-center">
              <div className="text-5xl mb-4">🥗</div>
              <p className="text-slate-400 mb-4">No diet plan generated yet</p>
              <button onClick={regenerateDiet} disabled={loading.diet}
                className="bg-sky-500 hover:bg-sky-400 text-white px-6 py-3 rounded-xl font-medium transition-all">
                Generate My Diet Plan
              </button>
            </div>
          ) : (
            <>
              {/* Plan Title */}
              <div className="bg-gradient-to-r from-emerald-500/10 to-sky-500/10 border border-emerald-500/20 rounded-xl p-5">
                <h4 className="text-white font-display text-lg">{dietData.dietPlan.plan.title || 'Recovery Diet Plan'}</h4>
                <p className="text-slate-400 text-xs mt-1">
                  Generated {dietData.dietPlan.generatedAt ? new Date(dietData.dietPlan.generatedAt).toLocaleDateString() : 'recently'}
                </p>
              </div>

              {/* Medicine Interactions Warning */}
              {dietData.dietPlan.plan.medicineGuidelines && dietData.dietPlan.plan.medicineGuidelines.length > 0 && (
                <div className="bg-amber-500/10 border border-amber-500/20 rounded-xl p-5">
                  <h4 className="text-amber-400 font-medium text-sm mb-3">⚠️ Medicine-Diet Interactions</h4>
                  <div className="space-y-2">
                    {dietData.dietPlan.plan.medicineGuidelines.map((mg, i) => (
                      <div key={i} className="bg-slate-900/50 rounded-lg p-3">
                        <p className="text-white text-sm font-medium">💊 {mg.medicine} {mg.dosage && `(${mg.dosage})`}</p>
                        <p className="text-slate-400 text-xs mt-1">{mg.note}</p>
                        {mg.avoid && mg.avoid.length > 0 && (
                          <p className="text-red-400 text-xs mt-1">❌ Avoid: {mg.avoid.join(', ')}</p>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Meals */}
              <div className="space-y-3">
                {(dietData.dietPlan.plan.meals || []).map((meal, i) => (
                  <div key={i} className="bg-slate-900 border border-slate-800 rounded-xl p-5 hover:border-slate-700 transition-colors">
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-2">
                        <span className="text-xl">{MEAL_ICONS[meal.type] || '🍽️'}</span>
                        <div>
                          <p className="text-white font-medium capitalize">{meal.type?.replace(/_/g, ' ')}</p>
                          <p className="text-slate-500 text-xs">{meal.time}</p>
                        </div>
                      </div>
                      <span className="text-xs bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-2 py-1 rounded-full">
                        {meal.nutrients}
                      </span>
                    </div>
                    <div className="space-y-1.5">
                      {(meal.items || []).map((item, j) => (
                        <div key={j} className="flex items-center gap-2">
                          <span className="text-sky-400 text-xs">•</span>
                          <p className="text-slate-300 text-sm">{item}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>

              {/* Guidelines */}
              {dietData.dietPlan.plan.guidelines && (
                <div className="bg-slate-900 border border-slate-800 rounded-xl p-5">
                  <h4 className="text-white font-medium mb-3">📋 Dietary Guidelines</h4>
                  <div className="space-y-2">
                    {dietData.dietPlan.plan.guidelines.map((g, i) => (
                      <div key={i} className="flex gap-2">
                        <span className="text-emerald-400 text-sm mt-0.5">✓</span>
                        <p className="text-slate-400 text-sm">{g}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Allergy warning */}
              {dietData.dietPlan.plan.allergyWarning && (
                <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-4">
                  <p className="text-red-400 text-sm">{dietData.dietPlan.plan.allergyWarning}</p>
                </div>
              )}
            </>
          )}
        </div>
      )}

      {/* Feedback History Tab */}
      {tab === 'feedback' && (
        <div className="space-y-4">
          <h3 className="text-white font-medium">Workout Feedback History</h3>
          {feedbackHistory.length === 0 ? (
            <div className="bg-slate-900 border border-slate-800 rounded-xl p-12 text-center">
              <div className="text-5xl mb-4">📊</div>
              <p className="text-slate-400">No workout feedback yet</p>
              <p className="text-slate-600 text-sm mt-1">Complete exercises and submit feedback to see your history</p>
            </div>
          ) : (
            <div className="space-y-3">
              {feedbackHistory.map((f, i) => (
                <div key={i} className="bg-slate-900 border border-slate-800 rounded-xl p-4 hover:border-slate-700 transition-colors">
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-slate-400 text-xs">{new Date(f.sessionDate).toLocaleDateString('en', { weekday: 'short', month: 'short', day: 'numeric' })}</p>
                    <span className={`text-xs px-2 py-0.5 rounded-full border ${
                      f.difficulty === 'too_easy' ? 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20' :
                      f.difficulty === 'too_hard' ? 'text-red-400 bg-red-500/10 border-red-500/20' :
                      'text-sky-400 bg-sky-500/10 border-sky-500/20'
                    }`}>
                      {f.difficulty?.replace(/_/g, ' ')}
                    </span>
                  </div>
                  <div className="flex items-center gap-4">
                    <div>
                      <p className="text-slate-500 text-xs">Pain</p>
                      <p className="text-white font-medium">{f.painLevel}/10 {f.painLevel <= 3 ? '😊' : f.painLevel <= 6 ? '😐' : '😣'}</p>
                    </div>
                    <div>
                      <p className="text-slate-500 text-xs">Exercises</p>
                      <p className="text-white font-medium">{f.exercisesCompleted || 0} done</p>
                    </div>
                    {f.comments && (
                      <div className="flex-1">
                        <p className="text-slate-500 text-xs">Note</p>
                        <p className="text-slate-300 text-sm truncate">{f.comments}</p>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
