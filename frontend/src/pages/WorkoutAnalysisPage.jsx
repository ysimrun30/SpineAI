import React, { useState, useMemo } from 'react';
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, Area, AreaChart, ReferenceLine } from 'recharts';
import FeedbackModal from '../components/FeedbackModal';

// ====== GRADING SYSTEM ======
function getGrade(score) {
  if (score >= 95) return { grade: 'A+', color: '#10b981', bg: 'bg-emerald-500/15', border: 'border-emerald-500/30', text: 'text-emerald-400', label: 'Outstanding' };
  if (score >= 85) return { grade: 'A', color: '#10b981', bg: 'bg-emerald-500/15', border: 'border-emerald-500/30', text: 'text-emerald-400', label: 'Excellent' };
  if (score >= 75) return { grade: 'B', color: '#0ea5e9', bg: 'bg-sky-500/15', border: 'border-sky-500/30', text: 'text-sky-400', label: 'Good Form' };
  if (score >= 60) return { grade: 'C', color: '#f59e0b', bg: 'bg-amber-500/15', border: 'border-amber-500/30', text: 'text-amber-400', label: 'Needs Work' };
  if (score >= 40) return { grade: 'D', color: '#f97316', bg: 'bg-orange-500/15', border: 'border-orange-500/30', text: 'text-orange-400', label: 'Poor Form' };
  return { grade: 'F', color: '#ef4444', bg: 'bg-red-500/15', border: 'border-red-500/30', text: 'text-red-400', label: 'Retry Needed' };
}

function fmt(s) {
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
}

// ====== CUSTOM TOOLTIP ======
function CustomTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 shadow-xl">
      <p className="text-slate-400 text-[10px] mb-1">{fmt(label)}</p>
      {payload.map((p, i) => (
        <p key={i} className="text-xs font-medium" style={{ color: p.color }}>
          {p.name}: {p.value}%
        </p>
      ))}
    </div>
  );
}

// ====== ANIMATED CIRCULAR SCORE ======
function ScoreRing({ score, size = 140, strokeWidth = 10, color }) {
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference * (1 - score / 100);

  return (
    <div className="relative" style={{ width: size, height: size }}>
      <svg className="w-full h-full -rotate-90" viewBox={`0 0 ${size} ${size}`}>
        <circle cx={size / 2} cy={size / 2} r={radius} fill="none" stroke="#1e293b" strokeWidth={strokeWidth} />
        <circle cx={size / 2} cy={size / 2} r={radius} fill="none"
          stroke={color}
          strokeWidth={strokeWidth} strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          className="transition-all duration-1000 ease-out"
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-4xl font-display text-white">{score}</span>
        <span className="text-slate-500 text-xs">/ 100</span>
      </div>
    </div>
  );
}

// ====== ACCURACY BAR ======
function AccuracyBar({ name, score, idealAngle, avgAngle, tip, accuracy }) {
  const barColor = score >= 80 ? 'bg-emerald-500' : score >= 60 ? 'bg-sky-500' : score >= 40 ? 'bg-amber-500' : 'bg-red-500';
  const textColor = score >= 80 ? 'text-emerald-400' : score >= 60 ? 'text-sky-400' : score >= 40 ? 'text-amber-400' : 'text-red-400';
  const statusIcon = score >= 80 ? '✓' : score >= 60 ? '●' : score >= 40 ? '⚠' : '✗';

  return (
    <div className="bg-slate-800/40 rounded-xl p-4 border border-slate-800/60">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <span className={`text-sm ${textColor}`}>{statusIcon}</span>
          <span className="text-white text-sm font-medium">{name}</span>
        </div>
        <div className="flex items-center gap-3">
          {avgAngle != null && idealAngle != null && (
            <span className="text-slate-500 text-xs">{avgAngle}° / {idealAngle}° ideal</span>
          )}
          <span className={`text-sm font-display ${textColor}`}>{score}%</span>
        </div>
      </div>
      <div className="h-2 bg-slate-700/50 rounded-full overflow-hidden">
        <div className={`h-full ${barColor} rounded-full transition-all duration-700 ease-out`}
          style={{ width: `${Math.min(100, score)}%` }} />
      </div>
      {accuracy != null && (
        <p className="text-slate-500 text-[10px] mt-1.5">Correct form in {accuracy}% of frames</p>
      )}
      {score < 70 && tip && (
        <p className={`${textColor} text-xs mt-2 flex items-start gap-1.5`}>
          <span className="mt-0.5">💡</span>
          <span>{tip}</span>
        </p>
      )}
    </div>
  );
}

// ====== STAT CARD ======
function StatCard({ icon, label, value, subValue, color = 'text-white' }) {
  return (
    <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-4 text-center">
      <div className="text-xl mb-1">{icon}</div>
      <p className="text-slate-500 text-[10px] uppercase tracking-wider mb-1">{label}</p>
      <p className={`text-xl font-display ${color}`}>{value}</p>
      {subValue && <p className="text-slate-600 text-[10px] mt-0.5">{subValue}</p>}
    </div>
  );
}

// ====== MAIN COMPONENT ======
export default function WorkoutAnalysisPage({ analysisData, exercise, onFeedback, onRetry, onBack }) {
  const [showFeedback, setShowFeedback] = useState(false);

  const {
    overallScore = 0,
    formMatchScore = 0,
    postureScore = 0,
    repsCompleted = 0,
    setsCompleted = 1,
    duration = 0,
    formChecks = [],
    scoreTimeline = [],
    bestMoment = null,
    worstMoment = null,
    autoCompleted = false,
  } = analysisData || {};

  const gradeInfo = useMemo(() => getGrade(overallScore), [overallScore]);

  // Generate AI recommendations based on weak checks
  const recommendations = useMemo(() => {
    const recs = [];
    const weakChecks = formChecks.filter(c => c.avgScore < 70).sort((a, b) => a.avgScore - b.avgScore);

    if (weakChecks.length === 0 && overallScore >= 80) {
      recs.push({ icon: '🌟', text: 'Excellent session! Your form was consistently good throughout the workout.' });
      recs.push({ icon: '📈', text: 'Try increasing reps or adding resistance to continue progressing.' });
    } else {
      weakChecks.slice(0, 3).forEach(check => {
        if (check.tip) {
          recs.push({ icon: '🎯', text: `${check.name}: ${check.tip}` });
        }
      });
    }

    if (postureScore < 60) {
      recs.push({ icon: '🧍', text: 'Focus on maintaining proper posture alignment throughout the exercise.' });
    }

    if (autoCompleted) {
      recs.push({ icon: '⏱️', text: 'Session ended by timer. Try to complete all reps before time runs out.' });
    }

    if (overallScore < 50) {
      recs.push({ icon: '📹', text: 'Watch the reference video again before your next session to review proper form.' });
    }

    return recs.length > 0 ? recs : [{ icon: '✅', text: 'Keep up the great work! Consistency is key to recovery.' }];
  }, [formChecks, overallScore, postureScore, autoCompleted]);

  // Score consistency (std dev of timeline)
  const consistency = useMemo(() => {
    if (scoreTimeline.length < 3) return null;
    const scores = scoreTimeline.map(s => s.score);
    const mean = scores.reduce((a, b) => a + b, 0) / scores.length;
    const variance = scores.reduce((sum, s) => sum + Math.pow(s - mean, 2), 0) / scores.length;
    const stdDev = Math.sqrt(variance);
    const consistencyPct = Math.max(0, Math.round(100 - stdDev * 2));
    return consistencyPct;
  }, [scoreTimeline]);

  if (showFeedback) {
    return (
      <FeedbackModal
        onClose={() => {
          setShowFeedback(false);
          onFeedback && onFeedback();
        }}
        exercisesCompleted={1}
        exercisePlanId={exercise?._id}
      />
    );
  }

  return (
    <div className="max-w-6xl mx-auto px-4 py-6 pb-20">
      {/* Header */}
      <div className="flex items-center gap-4 mb-8">
        <button onClick={onBack}
          className="w-10 h-10 bg-slate-800 hover:bg-slate-700 rounded-xl flex items-center justify-center text-slate-400 hover:text-white transition-all"
          id="analysis-back-btn">
          ←
        </button>
        <div className="flex-1">
          <p className="text-violet-400 text-xs font-medium uppercase tracking-wider mb-0.5">Workout Complete</p>
          <h2 className="font-display text-2xl text-white">{exercise?.name || 'Session'} — Analysis</h2>
        </div>
        {autoCompleted && (
          <span className="text-amber-400 text-xs bg-amber-500/10 border border-amber-500/20 px-3 py-1.5 rounded-lg">
            ⏱️ Auto-completed
          </span>
        )}
      </div>

      {/* ====== TOP: Score Summary ====== */}
      <div className="grid md:grid-cols-3 gap-6 mb-8">
        {/* Overall score ring */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 flex flex-col items-center justify-center">
          <ScoreRing score={overallScore} color={gradeInfo.color} />
          <div className={`mt-4 ${gradeInfo.bg} ${gradeInfo.border} border rounded-full px-4 py-1.5 flex items-center gap-2`}>
            <span className={`font-display text-xl ${gradeInfo.text}`}>{gradeInfo.grade}</span>
            <span className={`text-xs ${gradeInfo.text}`}>{gradeInfo.label}</span>
          </div>
        </div>

        {/* Posture vs Form comparison */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6">
          <h3 className="text-white font-medium text-sm mb-4 flex items-center gap-2">
            <span className="w-5 h-5 bg-violet-500/20 rounded flex items-center justify-center text-violet-400 text-xs">⚖</span>
            Score Breakdown
          </h3>
          <div className="grid grid-cols-2 gap-4">
            {/* Form Score */}
            <div className="text-center">
              <div className="relative w-20 h-20 mx-auto mb-2">
                <svg className="w-full h-full -rotate-90" viewBox="0 0 100 100">
                  <circle cx="50" cy="50" r="36" fill="none" stroke="#1e293b" strokeWidth="7" />
                  <circle cx="50" cy="50" r="36" fill="none"
                    stroke={formMatchScore >= 70 ? '#10b981' : formMatchScore >= 40 ? '#f59e0b' : '#ef4444'}
                    strokeWidth="7" strokeLinecap="round"
                    strokeDasharray={`${2 * Math.PI * 36}`}
                    strokeDashoffset={`${2 * Math.PI * 36 * (1 - formMatchScore / 100)}`}
                    className="transition-all duration-700" />
                </svg>
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                  <span className="text-lg font-display text-white">{formMatchScore}</span>
                </div>
              </div>
              <p className="text-slate-400 text-xs">Form Match</p>
              <p className="text-slate-600 text-[10px]">60% weight</p>
            </div>
            {/* Posture Score */}
            <div className="text-center">
              <div className="relative w-20 h-20 mx-auto mb-2">
                <svg className="w-full h-full -rotate-90" viewBox="0 0 100 100">
                  <circle cx="50" cy="50" r="36" fill="none" stroke="#1e293b" strokeWidth="7" />
                  <circle cx="50" cy="50" r="36" fill="none"
                    stroke={postureScore >= 70 ? '#10b981' : postureScore >= 40 ? '#f59e0b' : '#ef4444'}
                    strokeWidth="7" strokeLinecap="round"
                    strokeDasharray={`${2 * Math.PI * 36}`}
                    strokeDashoffset={`${2 * Math.PI * 36 * (1 - postureScore / 100)}`}
                    className="transition-all duration-700" />
                </svg>
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                  <span className="text-lg font-display text-white">{postureScore}</span>
                </div>
              </div>
              <p className="text-slate-400 text-xs">Posture</p>
              <p className="text-slate-600 text-[10px]">40% weight</p>
            </div>
          </div>
        </div>

        {/* Quick stats */}
        <div className="grid grid-cols-2 gap-3">
          <StatCard icon="🔄" label="Reps" value={repsCompleted} subValue={`of ${exercise?.reps || '—'}`} />
          <StatCard icon="📦" label="Sets" value={setsCompleted} subValue={`of ${exercise?.sets || '—'}`} />
          <StatCard icon="⏱️" label="Duration" value={fmt(duration)} color="text-sky-400" />
          {consistency !== null ? (
            <StatCard icon="📊" label="Consistency" value={`${consistency}%`}
              color={consistency >= 70 ? 'text-emerald-400' : consistency >= 50 ? 'text-amber-400' : 'text-red-400'} />
          ) : (
            <StatCard icon="🎯" label="Score" value={`${overallScore}%`}
              color={overallScore >= 70 ? 'text-emerald-400' : overallScore >= 40 ? 'text-amber-400' : 'text-red-400'} />
          )}
        </div>
      </div>

      {/* ====== SCORE TIMELINE ====== */}
      {scoreTimeline.length >= 3 && (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 mb-8">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-white font-medium text-sm flex items-center gap-2">
              <span className="w-5 h-5 bg-sky-500/20 rounded flex items-center justify-center text-sky-400 text-xs">📈</span>
              Score Over Time
            </h3>
            <div className="flex items-center gap-4 text-[10px]">
              <span className="flex items-center gap-1"><span className="w-2 h-2 bg-violet-500 rounded-full" /> Form</span>
              <span className="flex items-center gap-1"><span className="w-2 h-2 bg-emerald-500 rounded-full" /> Posture</span>
            </div>
          </div>
          <ResponsiveContainer width="100%" height={200}>
            <AreaChart data={scoreTimeline}>
              <defs>
                <linearGradient id="formGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="postureGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#10b981" stopOpacity={0.2} />
                  <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                </linearGradient>
              </defs>
              <XAxis dataKey="time" axisLine={false} tickLine={false}
                tick={{ fill: '#475569', fontSize: 10 }}
                tickFormatter={(v) => fmt(v)} />
              <YAxis domain={[0, 100]} hide />
              <Tooltip content={<CustomTooltip />} />
              {bestMoment && (
                <ReferenceLine x={bestMoment.time} stroke="#10b981" strokeDasharray="3 3" strokeWidth={1} />
              )}
              {worstMoment && (
                <ReferenceLine x={worstMoment.time} stroke="#ef4444" strokeDasharray="3 3" strokeWidth={1} />
              )}
              <Area type="monotone" dataKey="score" name="Form"
                stroke="#8b5cf6" strokeWidth={2} fill="url(#formGrad)"
                dot={false} activeDot={{ r: 4, strokeWidth: 2, fill: '#0f172a' }} />
              <Area type="monotone" dataKey="postureScore" name="Posture"
                stroke="#10b981" strokeWidth={1.5} fill="url(#postureGrad)"
                dot={false} activeDot={{ r: 3, strokeWidth: 2, fill: '#0f172a' }} />
            </AreaChart>
          </ResponsiveContainer>

          {/* Best / Worst moment badges */}
          <div className="flex gap-3 mt-3">
            {bestMoment && bestMoment.score > 0 && (
              <div className="flex items-center gap-2 bg-emerald-500/10 border border-emerald-500/20 rounded-lg px-3 py-1.5">
                <span className="text-emerald-400 text-xs">🏆 Best: {bestMoment.score}%</span>
                <span className="text-slate-500 text-[10px]">at {fmt(bestMoment.time)}</span>
              </div>
            )}
            {worstMoment && worstMoment.score > 0 && (
              <div className="flex items-center gap-2 bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-1.5">
                <span className="text-red-400 text-xs">📉 Lowest: {worstMoment.score}%</span>
                <span className="text-slate-500 text-[10px]">at {fmt(worstMoment.time)}</span>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ====== FORM CHECKS BREAKDOWN ====== */}
      {formChecks.length > 0 && (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 mb-8">
          <h3 className="text-white font-medium text-sm mb-4 flex items-center gap-2">
            <span className="w-5 h-5 bg-amber-500/20 rounded flex items-center justify-center text-amber-400 text-xs">🎯</span>
            Form Accuracy — Per Check
          </h3>
          <div className="space-y-3">
            {formChecks.map((check, i) => (
              <AccuracyBar
                key={i}
                name={check.name}
                score={check.avgScore}
                idealAngle={check.idealAngle}
                avgAngle={check.avgAngle}
                tip={check.tip}
                accuracy={check.accuracy}
              />
            ))}
          </div>
        </div>
      )}

      {/* ====== AI RECOMMENDATIONS ====== */}
      <div className="bg-gradient-to-br from-violet-500/5 to-sky-500/5 border border-violet-500/15 rounded-2xl p-6 mb-8">
        <h3 className="text-white font-medium text-sm mb-4 flex items-center gap-2">
          <span className="w-5 h-5 bg-violet-500/20 rounded flex items-center justify-center text-violet-400 text-xs">🤖</span>
          AI Recommendations
        </h3>
        <div className="space-y-3">
          {recommendations.map((rec, i) => (
            <div key={i} className="flex items-start gap-3 bg-slate-900/50 rounded-xl p-3.5 border border-slate-800/50">
              <span className="text-lg flex-shrink-0 mt-0.5">{rec.icon}</span>
              <p className="text-slate-300 text-sm leading-relaxed">{rec.text}</p>
            </div>
          ))}
        </div>
      </div>

      {/* ====== ACTION BUTTONS ====== */}
      <div className="grid grid-cols-3 gap-3">
        <button onClick={() => setShowFeedback(true)}
          className="bg-gradient-to-r from-violet-500 to-sky-500 hover:from-violet-400 hover:to-sky-400 text-white py-4 rounded-xl font-medium transition-all flex items-center justify-center gap-2 shadow-lg shadow-violet-500/20 hover:shadow-violet-500/30 col-span-2"
          id="analysis-give-feedback-btn">
          <span className="text-lg">💬</span>
          Give Feedback & Finish
        </button>
        <button onClick={onRetry}
          className="bg-slate-800 hover:bg-slate-700 border border-slate-700 text-white py-4 rounded-xl font-medium transition-all flex items-center justify-center gap-2"
          id="analysis-retry-btn">
          <span className="text-lg">🔄</span>
          Retry
        </button>
      </div>
    </div>
  );
}