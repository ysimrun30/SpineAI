import React, { useState } from 'react';
import API from '../utils/api';

export default function FeedbackModal({ onClose, exercisesCompleted, exercisePlanId }) {
  const [painLevel, setPainLevel] = useState(3);
  const [difficulty, setDifficulty] = useState('just_right');
  const [comments, setComments] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [recommendation, setRecommendation] = useState('');
  const [loading, setLoading] = useState(false);

  const PAIN_EMOJIS = ['😊', '😊', '🙂', '🙂', '😐', '😐', '😕', '😣', '😣', '😖', '😭'];
  const DIFFICULTY_OPTIONS = [
    { value: 'too_easy', label: 'Too Easy', emoji: '😎', color: 'emerald' },
    { value: 'just_right', label: 'Just Right', emoji: '👍', color: 'sky' },
    { value: 'too_hard', label: 'Too Hard', emoji: '😤', color: 'red' },
  ];

  const handleSubmit = async () => {
    setLoading(true);
    try {
      const { data } = await API.post('/feedback', {
        painLevel, difficulty, comments,
        exercisesCompleted: exercisesCompleted || 0,
        exercisePlanId
      });
      setRecommendation(data.recommendation);
      setSubmitted(true);
    } catch (err) {
      console.error('Feedback submission failed:', err);
    }
    setLoading(false);
  };

  if (submitted) {
    return (
      <div className="fixed inset-0 bg-slate-950/90 backdrop-blur-sm z-50 flex items-center justify-center p-4">
        <div className="bg-slate-900 border border-slate-700 rounded-2xl p-8 w-full max-w-md text-center">
          <div className="text-5xl mb-4">✅</div>
          <h3 className="font-display text-2xl text-white mb-2">Feedback Saved!</h3>
          <p className="text-slate-400 text-sm mb-6">{recommendation}</p>
          <button onClick={onClose}
            className="w-full bg-sky-500 hover:bg-sky-400 text-white py-3 rounded-xl font-medium transition-all">
            Done
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-slate-950/90 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-slate-900 border border-slate-700 rounded-2xl p-8 w-full max-w-md">
        <div className="flex items-center justify-between mb-6">
          <h3 className="font-display text-xl text-white">How was your workout?</h3>
          <button onClick={onClose} className="text-slate-500 hover:text-white text-lg transition-colors">✕</button>
        </div>

        {/* Pain Level */}
        <div className="mb-6">
          <label className="block text-slate-400 text-sm mb-2">
            Pain Level: <span className="text-white font-medium">{painLevel}/10</span>
          </label>
          <div className="text-center text-4xl mb-2">{PAIN_EMOJIS[painLevel]}</div>
          <input type="range" min="0" max="10" step="1"
            className="w-full accent-sky-500"
            value={painLevel} onChange={e => setPainLevel(Number(e.target.value))} />
          <div className="flex justify-between text-xs text-slate-600 mt-1">
            <span>No pain</span>
            <span>Moderate</span>
            <span>Severe</span>
          </div>
        </div>

        {/* Difficulty */}
        <div className="mb-6">
          <label className="block text-slate-400 text-sm mb-2">How difficult was it?</label>
          <div className="grid grid-cols-3 gap-2">
            {DIFFICULTY_OPTIONS.map(d => (
              <button key={d.value} onClick={() => setDifficulty(d.value)}
                className={`py-3 rounded-xl text-center transition-all border ${
                  difficulty === d.value
                    ? d.color === 'emerald' ? 'bg-emerald-500/20 border-emerald-500/50 text-emerald-300'
                    : d.color === 'red' ? 'bg-red-500/20 border-red-500/50 text-red-300'
                    : 'bg-sky-500/20 border-sky-500/50 text-sky-300'
                    : 'bg-slate-800 border-slate-700 text-slate-400 hover:border-slate-600'
                }`}>
                <div className="text-2xl mb-1">{d.emoji}</div>
                <p className="text-xs font-medium">{d.label}</p>
              </button>
            ))}
          </div>
        </div>

        {/* Comments */}
        <div className="mb-6">
          <label className="block text-slate-400 text-sm mb-1">Any comments? (optional)</label>
          <textarea className="w-full bg-slate-800 border border-slate-700 rounded-lg px-4 py-3 text-white text-sm focus:outline-none focus:border-sky-500 transition-colors resize-none"
            rows={3} placeholder="How did you feel during the exercises..."
            value={comments} onChange={e => setComments(e.target.value)} />
        </div>

        {/* Submit */}
        <button onClick={handleSubmit} disabled={loading}
          className="w-full bg-sky-500 hover:bg-sky-400 disabled:opacity-50 text-white py-3 rounded-xl font-medium transition-all flex items-center justify-center gap-2">
          {loading && <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />}
          Submit Feedback
        </button>
      </div>
    </div>
  );
}
