import React, { useState, useEffect, useCallback, useMemo } from 'react';
import API from '../utils/api';
import FeedbackModal from '../components/FeedbackModal';

const CATEGORY_COLORS = {
  stretching: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20',
  strengthening: 'text-sky-400 bg-sky-500/10 border-sky-500/20',
  mobility: 'text-violet-400 bg-violet-500/10 border-violet-500/20',
  breathing: 'text-amber-400 bg-amber-500/10 border-amber-500/20',
  posture: 'text-rose-400 bg-rose-500/10 border-rose-500/20',
};

const AI_ALIASES = new Map([
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

const normalizeName = (s) => String(s)
  .toLowerCase()
  .replace(/[_-]+/g, ' ')
  .replace(/[^a-z0-9 ]/g, '')
  .replace(/\s+/g, ' ')
  .trim();

const titleize = (s) => String(s).split(/[_\s-]+/g)
  .filter(Boolean)
  .map(part => part[0]?.toUpperCase() + part.slice(1))
  .join(' ');

function ExerciseTimer({ exercise, onComplete, onCancel }) {
  const [phase, setPhase] = useState('ready'); // ready | active | rest | done
  const [timeLeft, setTimeLeft] = useState(exercise.duration || 60);
  const [currentSet, setCurrentSet] = useState(1);
  const totalSets = exercise.sets || 1;

  useEffect(() => {
    if (phase !== 'active') return;
    if (timeLeft <= 0) {
      if (currentSet < totalSets) {
        setPhase('rest');
        setTimeLeft(30);
        setCurrentSet(s => s + 1);
      } else {
        setPhase('done');
      }
      return;
    }
    const t = setTimeout(() => setTimeLeft(t => t - 1), 1000);
    return () => clearTimeout(t);
  }, [phase, timeLeft, currentSet, totalSets]);

  useEffect(() => {
    if (phase === 'rest' && timeLeft <= 0) {
      setPhase('active');
      setTimeLeft(exercise.duration || 60);
    }
  }, [phase, timeLeft, exercise.duration]);

  const fmt = (s) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
  const progress = phase === 'active'
    ? ((exercise.duration - timeLeft) / exercise.duration) * 100
    : phase === 'rest' ? ((30 - timeLeft) / 30) * 100 : 0;

  return (
    <div className="fixed inset-0 bg-slate-950/95 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-slate-900 border border-slate-700 rounded-2xl p-8 w-full max-w-md text-center relative">
        <button onClick={onCancel} className="absolute top-4 right-4 text-slate-500 hover:text-white text-xl">✕</button>

        <h3 className="font-display text-2xl text-white mb-1">{exercise.name}</h3>
        <p className="text-slate-400 text-sm mb-6">Set {currentSet} of {totalSets}</p>

        <div className="relative w-40 h-40 mx-auto mb-6">
          <svg className="w-full h-full -rotate-90" viewBox="0 0 144 144">
            <circle cx="72" cy="72" r="60" fill="none" stroke="#1e293b" strokeWidth="8" />
            <circle cx="72" cy="72" r="60" fill="none"
              stroke={phase === 'rest' ? '#f59e0b' : phase === 'done' ? '#10b981' : '#0ea5e9'}
              strokeWidth="8" strokeLinecap="round"
              strokeDasharray={`${2 * Math.PI * 60}`}
              strokeDashoffset={`${2 * Math.PI * 60 * (1 - progress / 100)}`}
              className="transition-all duration-1000" />
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            {phase === 'done' ? (
              <span className="text-4xl">✓</span>
            ) : (
              <>
                <span className="text-3xl font-display text-white">{fmt(timeLeft)}</span>
                <span className="text-xs text-slate-400 mt-1 capitalize">{phase === 'rest' ? 'Rest' : phase}</span>
              </>
            )}
          </div>
        </div>

        <div className="bg-slate-800/50 rounded-xl p-4 mb-6 text-left">
          <p className="text-slate-400 text-xs font-medium mb-2 uppercase tracking-wide">Instructions</p>
          <ol className="space-y-1.5">
            {(exercise.instructions || []).map((ins, i) => (
              <li key={i} className="text-slate-300 text-sm flex gap-2">
                <span className="text-sky-400 font-medium">{i + 1}.</span>{ins}
              </li>
            ))}
          </ol>
        </div>

        {exercise.warnings?.length > 0 && (
          <div className="bg-amber-500/10 border border-amber-500/20 rounded-lg p-3 mb-6 text-left">
            <p className="text-amber-400 text-xs">⚠️ {exercise.warnings[0]}</p>
          </div>
        )}

        {phase === 'done' ? (
          <button onClick={onComplete}
            className="w-full bg-emerald-500 hover:bg-emerald-400 text-white py-3 rounded-xl font-medium transition-all">
            ✓ Mark Complete
          </button>
        ) : phase === 'ready' ? (
          <button onClick={() => setPhase('active')}
            className="w-full bg-sky-500 hover:bg-sky-400 text-white py-3 rounded-xl font-medium transition-all">
            Start Exercise
          </button>
        ) : (
          <button onClick={() => { setPhase('done'); }}
            className="w-full bg-slate-700 hover:bg-slate-600 text-slate-300 py-3 rounded-xl font-medium transition-all">
            Skip / Finish Early
          </button>
        )}
      </div>
    </div>
  );
}

export default function ExercisePage({ onStartSession }) {
  const [plan, setPlan] = useState(null);
  const [completed, setCompleted] = useState(new Set());
  const [active, setActive] = useState(null);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [showFeedback, setShowFeedback] = useState(false);
  const [adaptationInfo, setAdaptationInfo] = useState(null);
  const [exerciseLibrary, setExerciseLibrary] = useState([]);

  // FULL PATIENT FORM STATE PRESERVED
  const [aiForm, setAiForm] = useState({
    condition: 'slip_disc',
    age: 45,
    gender: 'male',
    bmi: 28,
    pain_score: 7,
    mobility_score: 5,
    movement_accuracy: 30,
    posture_score: 25,
    session_number: 1,
    symptom_duration_months: 6,
    prior_therapy: 0,
    nerve_involvement: 0,
    mri_severity: 'moderate',
    session_duration_min: 20,
    top_k: 3
  });

  const [aiResult, setAiResult] = useState(null);
  const [aiError, setAiError] = useState('');
  const [aiLoading, setAiLoading] = useState(false);
  const [aiSaving, setAiSaving] = useState(false);
  const [aiSaveMsg, setAiSaveMsg] = useState('');

  useEffect(() => {
    setLoading(true);
    API.get('/exercises/plan')
      .then(r => {
        setPlan(r.data);
        if (r.data.difficultyAdjustment && r.data.difficultyAdjustment !== 'none') {
          setAdaptationInfo(r.data.difficultyAdjustment);
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    API.get('/exercises/library')
      .then(r => setExerciseLibrary(r.data || []))
      .catch(() => setExerciseLibrary([]));
  }, []);

  const libraryByName = useMemo(() => {
    const map = new Map();
    exerciseLibrary.forEach(ex => map.set(normalizeName(ex.name), ex));
    return map;
  }, [exerciseLibrary]);

  const resolveAiExercise = (name) => {
    const resolved = AI_ALIASES.get(normalizeName(name)) || name;
    const fromLibrary = libraryByName.get(normalizeName(resolved));
    if (fromLibrary) return fromLibrary;
    return {
      name: titleize(resolved),
      category: 'mobility',
      reps: 10,
      sets: 3,
      duration: 60,
      instructions: ['Move slowly and stay within a pain-free range.']
    };
  };

  const handleComplete = useCallback(async (ex) => {
    setActive(null);
    setCompleted(prev => new Set([...prev, ex.name]));
    try {
      await API.post('/progress/exercise', {
        exerciseName: ex.name,
        setsCompleted: ex.sets,
        repsCompleted: ex.reps,
        duration: ex.duration
      });
    } catch (e) { console.error(e); }
  }, []);

  const generateNewPlan = async () => {
    setGenerating(true);
    try {
      const { data } = await API.post('/exercises/generate-plan');
      setPlan(data);
      setCompleted(new Set());
      if (data.difficultyAdjustment && data.difficultyAdjustment !== 'none') {
        setAdaptationInfo(data.difficultyAdjustment);
      }
    } catch (e) { console.error(e); }
    setGenerating(false);
  };

  const handleAiPredict = async () => {
    setAiError('');
    setAiResult(null);
    setAiSaveMsg('');
    setAiLoading(true);
    try {
      const { data } = await API.post('/ai/predict', aiForm);
      if (data?.success === false) {
        setAiError(data.error || 'AI service failed.');
      } else {
        setAiResult(data);
      }
    } catch (err) {
      setAiError('AI request failed. Check the server logs.');
    } finally {
      setAiLoading(false);
    }
  };

  const handleSaveAiPlan = async () => {
    setAiError('');
    setAiSaveMsg('');
    const recs = aiResult?.prediction?.recommended_exercises || [];
    const names = recs.map(r => r.name).filter(Boolean);

    if (names.length === 0) {
      setAiError('No AI recommendations to save.');
      return;
    }

    setAiSaving(true);
    try {
      const { data } = await API.post('/exercises/plan/from-ai', { exercises: names });
      setPlan(data);
      setCompleted(new Set());
      setAiSaveMsg('Saved as your current plan.');
    } catch (err) {
      setAiError('Failed to save AI plan.');
    } finally {
      setAiSaving(false);
    }
  };

  const exercises = plan?.exercises || [];
  const completedCount = completed.size;
  const totalCount = exercises.length;
  const progress = totalCount > 0 ? (completedCount / totalCount) * 100 : 0;
  const allDone = completedCount === totalCount && totalCount > 0;

  useEffect(() => {
    if (allDone && !showFeedback) {
      setShowFeedback(true);
    }
  }, [allDone, showFeedback]);

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <div className="w-8 h-8 border-2 border-sky-500 border-t-transparent rounded-full animate-spin" />
    </div>
  );

  return (
    <div className="max-w-5xl mx-auto px-4 py-8">
      {active && (
        <ExerciseTimer
          exercise={active}
          onComplete={() => handleComplete(active)}
          onCancel={() => setActive(null)}
        />
      )}

      {showFeedback && (
        <FeedbackModal
          onClose={() => setShowFeedback(false)}
          exercisesCompleted={completedCount}
          exercisePlanId={plan?._id}
        />
      )}

      <div className="flex flex-wrap items-start justify-between gap-4 mb-6">
        <div>
          <h2 className="font-display text-3xl text-white mb-1">Exercise Plan</h2>
          <p className="text-slate-400 capitalize text-sm">
            {plan?.condition?.replace(/_/g, ' ')} · {plan?.recoveryPhase?.replace(/_/g, ' ')} phase
            {plan?.recoveryStage?.label && <span className="text-sky-400 ml-2">({plan.recoveryStage.label})</span>}
          </p>
        </div>
        <div className="flex gap-2">
          <button onClick={generateNewPlan} disabled={generating}
            className="bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-300 hover:text-white px-4 py-2 rounded-lg text-sm transition-all flex items-center gap-2 disabled:opacity-50">
            {generating && <div className="w-3 h-3 border-2 border-slate-400 border-t-transparent rounded-full animate-spin" />}
            🧠 AI Generate Plan
          </button>
          <button onClick={() => API.post('/exercises/plan/regenerate').then(r => { setPlan(r.data); setCompleted(new Set()); })}
            className="bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-300 hover:text-white px-4 py-2 rounded-lg text-sm transition-all">
            ↺ Refresh
          </button>
        </div>
      </div>

      {adaptationInfo && (
        <div className={`rounded-xl p-4 mb-6 border ${
          adaptationInfo === 'decrease'
            ? 'bg-amber-500/10 border-amber-500/20'
            : 'bg-emerald-500/10 border-emerald-500/20'
        }`}>
          <p className={`text-sm font-medium ${adaptationInfo === 'decrease' ? 'text-amber-400' : 'text-emerald-400'}`}>
            {adaptationInfo === 'decrease'
              ? '🔻 Intensity reduced based on your recent feedback (high pain / difficulty)'
              : '🔺 Intensity increased — you\'re progressing great!'}
          </p>
        </div>
      )}

      {/* FULL AI PREDICTION FORM - ALL FIELDS PRESERVED */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 mb-8">
        <div className="flex items-start justify-between gap-4 mb-3">
          <div>
            <h3 className="text-white font-medium">AI Prediction</h3>
            <p className="text-slate-400 text-xs">Fill in details and run prediction.</p>
          </div>
          <div className="flex gap-2">
            <button
              onClick={handleSaveAiPlan}
              disabled={aiSaving || !aiResult}
              className="bg-emerald-500 hover:bg-emerald-400 text-white px-4 py-2 rounded-lg text-sm transition-all disabled:opacity-50">
              {aiSaving ? 'Saving...' : 'Save to Plan'}
            </button>
            <button
              onClick={handleAiPredict}
              disabled={aiLoading}
              className="bg-sky-500 hover:bg-sky-400 text-white px-4 py-2 rounded-lg text-sm transition-all disabled:opacity-50">
              {aiLoading ? 'Predicting...' : 'Run AI'}
            </button>
          </div>
        </div>
        
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <div>
            <label className="text-slate-400 text-xs">Condition</label>
            <select
              className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2 text-slate-200 text-sm"
              value={aiForm.condition}
              onChange={e => setAiForm(s => ({ ...s, condition: e.target.value }))}>
              <option value="herniated_disc">Herniated disc</option>
              <option value="slip_disc">Slip disc</option>
              <option value="spinal_stenosis">Spinal stenosis</option>
              <option value="scoliosis">Scoliosis</option>
              <option value="normal">Normal</option>
              <option value="kyphosis">Kyphosis</option>
            </select>
          </div>
          <div>
            <label className="text-slate-400 text-xs">Gender</label>
            <select
              className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2 text-slate-200 text-sm"
              value={aiForm.gender}
              onChange={e => setAiForm(s => ({ ...s, gender: e.target.value }))}>
              <option value="male">Male</option>
              <option value="female">Female</option>
            </select>
          </div>
          <div>
            <label className="text-slate-400 text-xs">MRI Severity</label>
            <select
              className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2 text-slate-200 text-sm"
              value={aiForm.mri_severity}
              onChange={e => setAiForm(s => ({ ...s, mri_severity: e.target.value }))}>
              <option value="none">None</option>
              <option value="mild">Mild</option>
              <option value="moderate">Moderate</option>
              <option value="severe">Severe</option>
            </select>
          </div>
          <div>
            <label className="text-slate-400 text-xs">Age</label>
            <input type="number" className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2 text-slate-200 text-sm"
              value={aiForm.age} onChange={e => setAiForm(s => ({ ...s, age: Number(e.target.value) }))} />
          </div>
          <div>
            <label className="text-slate-400 text-xs">BMI</label>
            <input type="number" step="0.1" className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2 text-slate-200 text-sm"
              value={aiForm.bmi} onChange={e => setAiForm(s => ({ ...s, bmi: Number(e.target.value) }))} />
          </div>
          <div>
            <label className="text-slate-400 text-xs">Pain Score (0-10)</label>
            <input type="number" min="0" max="10" className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2 text-slate-200 text-sm"
              value={aiForm.pain_score} onChange={e => setAiForm(s => ({ ...s, pain_score: Number(e.target.value) }))} />
          </div>
          <div>
            <label className="text-slate-400 text-xs">Mobility Score (0-10)</label>
            <input type="number" min="0" max="10" className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2 text-slate-200 text-sm"
              value={aiForm.mobility_score} onChange={e => setAiForm(s => ({ ...s, mobility_score: Number(e.target.value) }))} />
          </div>
          <div>
            <label className="text-slate-400 text-xs">Movement Accuracy (0-100)</label>
            <input type="number" min="0" max="100" className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2 text-slate-200 text-sm"
              value={aiForm.movement_accuracy} onChange={e => setAiForm(s => ({ ...s, movement_accuracy: Number(e.target.value) }))} />
          </div>
          <div>
            <label className="text-slate-400 text-xs">Posture Score (0-100)</label>
            <input type="number" min="0" max="100" className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2 text-slate-200 text-sm"
              value={aiForm.posture_score} onChange={e => setAiForm(s => ({ ...s, posture_score: Number(e.target.value) }))} />
          </div>
          <div>
            <label className="text-slate-400 text-xs">Session Number</label>
            <input type="number" min="1" className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2 text-slate-200 text-sm"
              value={aiForm.session_number} onChange={e => setAiForm(s => ({ ...s, session_number: Number(e.target.value) }))} />
          </div>
          <div>
            <label className="text-slate-400 text-xs">Symptom Duration (months)</label>
            <input type="number" min="0" className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2 text-slate-200 text-sm"
              value={aiForm.symptom_duration_months} onChange={e => setAiForm(s => ({ ...s, symptom_duration_months: Number(e.target.value) }))} />
          </div>
          <div>
            <label className="text-slate-400 text-xs">Session Duration (min)</label>
            <input type="number" min="1" className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2 text-slate-200 text-sm"
              value={aiForm.session_duration_min} onChange={e => setAiForm(s => ({ ...s, session_duration_min: Number(e.target.value) }))} />
          </div>
          <div>
            <label className="text-slate-400 text-xs">Prior Therapy</label>
            <select className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2 text-slate-200 text-sm"
              value={aiForm.prior_therapy} onChange={e => setAiForm(s => ({ ...s, prior_therapy: Number(e.target.value) }))}>
              <option value={0}>No</option>
              <option value={1}>Yes</option>
            </select>
          </div>
          <div>
            <label className="text-slate-400 text-xs">Nerve Involvement</label>
            <select className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2 text-slate-200 text-sm"
              value={aiForm.nerve_involvement} onChange={e => setAiForm(s => ({ ...s, nerve_involvement: Number(e.target.value) }))}>
              <option value={0}>No</option>
              <option value={1}>Yes</option>
            </select>
          </div>
          <div>
            <label className="text-slate-400 text-xs">Top K Exercises</label>
            <input type="number" min="1" max="10" className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2 text-slate-200 text-sm"
              value={aiForm.top_k} onChange={e => setAiForm(s => ({ ...s, top_k: Number(e.target.value) }))} />
          </div>
        </div>

        {aiError && <div className="mt-3 text-amber-400 text-xs">{aiError}</div>}
        {aiSaveMsg && <div className="mt-3 text-emerald-400 text-xs">{aiSaveMsg}</div>}

        {aiResult && (
          <div className="mt-4 grid gap-4 lg:grid-cols-3">
            <div className="lg:col-span-2 bg-slate-950 border border-slate-800 rounded-xl p-4">
              <p className="text-slate-400 text-xs uppercase tracking-wide mb-3">Recommended Exercises</p>
              <div className="space-y-2">
                {(aiResult?.prediction?.recommended_exercises || []).map((ex, idx) => {
                   const cameraExercise = resolveAiExercise(ex.name);
                   return (
                    <div key={ex.name} className="flex items-center justify-between gap-3 bg-slate-900/60 border border-slate-800 rounded-lg px-3 py-2">
                      <div className="flex items-center gap-3">
                        <span className="w-6 h-6 rounded-full bg-sky-500/20 text-sky-400 text-xs flex items-center justify-center">{idx + 1}</span>
                        <div>
                          <p className="text-white text-sm capitalize">{ex.name.replace(/_/g, ' ')}</p>
                          <p className="text-slate-500 text-xs">Confidence {(ex.score * 100).toFixed(1)}%</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <div className="w-24 h-2 bg-slate-800 rounded-full overflow-hidden">
                          <div className="h-full bg-gradient-to-r from-sky-500 to-emerald-400" style={{ width: `${Math.min(100, ex.score * 100)}%` }} />
                        </div>
                        {onStartSession && (
                          <button onClick={() => onStartSession(cameraExercise)} className="bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 border border-emerald-500/30 px-3 py-1.5 rounded-lg text-xs font-medium transition-all">Camera</button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
            <div className="bg-slate-950 border border-slate-800 rounded-xl p-4">
              <p className="text-slate-400 text-xs uppercase tracking-wide mb-3">Clinical Summary</p>
              <div className="space-y-3">
                <div className="flex items-center justify-between"><span className="text-slate-400 text-xs">Risk Level</span><span className="text-white text-sm capitalize">{aiResult?.prediction?.risk_level || 'n/a'}</span></div>
                <div className="flex items-center justify-between"><span className="text-slate-400 text-xs">Therapy Phase</span><span className="text-white text-sm capitalize">{aiResult?.prediction?.therapy_phase || 'n/a'}</span></div>
                <div className="flex items-center justify-between"><span className="text-slate-400 text-xs">Surgery Recommended</span><span className={`text-sm ${aiResult?.prediction?.surgery_recommended ? 'text-amber-400' : 'text-emerald-400'}`}>{aiResult?.prediction?.surgery_recommended ? 'Yes' : 'No'}</span></div>
              </div>
            </div>
          </div>
        )}
      </div>

      <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 mb-8">
        <div className="flex items-center justify-between mb-3"><span className="text-white font-medium text-sm">Today's Progress</span><span className="text-sky-400 text-sm">{completedCount} / {totalCount} exercises</span></div>
        <div className="h-2.5 bg-slate-800 rounded-full overflow-hidden"><div className="h-full bg-gradient-to-r from-sky-500 to-sky-400 rounded-full transition-all duration-500" style={{ width: `${progress}%` }} /></div>
      </div>

      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {exercises.map((ex, i) => {
          const done = completed.has(ex.name);
          const catStyle = CATEGORY_COLORS[ex.category] || CATEGORY_COLORS.stretching;
          const videoId = ex.youtubeUrl ? ex.youtubeUrl.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([a-zA-Z0-9_-]{11})/)?.[1] : null;
          
          return (
            <div key={i} className={`bg-slate-900 border rounded-xl overflow-hidden transition-all ${done ? 'border-emerald-500/30 bg-emerald-500/5' : 'border-slate-800 hover:border-slate-600'}`}>
              {videoId && (
                <div className="relative group cursor-pointer" onClick={() => onStartSession && !done && onStartSession(ex)}>
                  <img src={`https://img.youtube.com/vi/${videoId}/mqdefault.jpg`} className="w-full h-32 object-cover" alt="preview" />
                  <div className="absolute inset-0 bg-slate-950/40 group-hover:bg-slate-950/20 transition-all flex items-center justify-center">
                    <div className="w-10 h-10 bg-red-600/90 group-hover:bg-red-500 rounded-xl flex items-center justify-center group-hover:scale-110 transition-all shadow-lg">
                      <svg className="w-4 h-4 text-white ml-0.5" fill="currentColor" viewBox="0 0 24 24"><path d="M8 5v14l11-7z"/></svg>
                    </div>
                  </div>
                </div>
              )}
              <div className="p-5">
                <div className="flex items-start justify-between mb-3">
                  <span className={`text-xs border px-2 py-0.5 rounded-full capitalize ${catStyle}`}>{ex.category}</span>
                  {done && <span className="text-emerald-400 text-lg">✓</span>}
                  {ex.adaptationNote && <span className="text-xs text-amber-400 font-bold">{ex.adaptationNote.slice(0, 2)}</span>}
                </div>
                <h4 className="text-white font-medium mb-1">{ex.name}</h4>
                <p className="text-slate-500 text-xs capitalize mb-1">{ex.difficulty} · {ex.sets} sets × {ex.reps} reps</p>
                <div className="space-y-1 mb-4 h-12 overflow-hidden">
                  {(ex.instructions || []).slice(0, 2).map((ins, j) => (
                    <p key={j} className="text-slate-400 text-xs flex gap-1.5"><span className="text-slate-600 mt-0.5">•</span>{ins}</p>
                  ))}
                </div>
                <div className="flex gap-2">
                  <button onClick={() => !done && onStartSession && onStartSession(ex)} disabled={done} className={`flex-1 py-2.5 rounded-lg text-sm font-medium transition-all ${done ? 'bg-slate-800 text-slate-500' : 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'}`}>{done ? '✓ Done' : '📷 Camera'}</button>
                  <button onClick={() => setActive(ex)} disabled={done} className="bg-slate-800 px-3 rounded-lg text-slate-400 hover:text-white transition-all">⏱</button>
                  {ex.youtubeUrl && (
                    <a href={ex.youtubeUrl} target="_blank" rel="noopener noreferrer" className="w-10 h-10 bg-red-500/10 hover:bg-red-500/20 border border-red-500/20 rounded-lg flex items-center justify-center transition-all">
                      <svg className="w-4 h-4 text-red-400" fill="currentColor" viewBox="0 0 24 24"><path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814z"/><path d="M9.545 15.568V8.432L15.818 12l-6.273 3.568z" fill="#fff"/></svg>
                    </a>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}