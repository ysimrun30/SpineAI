import React, { useEffect, useMemo, useState } from 'react';
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, AreaChart, Area } from 'recharts';
import API from '../utils/api';

// ====== HELPERS ======
function getGrade(score) {
  if (score >= 95) return { grade: 'A+', color: 'text-emerald-400' };
  if (score >= 85) return { grade: 'A', color: 'text-emerald-400' };
  if (score >= 75) return { grade: 'B', color: 'text-sky-400' };
  if (score >= 60) return { grade: 'C', color: 'text-amber-400' };
  if (score >= 40) return { grade: 'D', color: 'text-orange-400' };
  return { grade: 'F', color: 'text-red-400' };
}

function fmt(s) {
  if (!s) return '0:00';
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
}

// ====== CUSTOM COMPONENTS ======
function CustomTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 shadow-xl">
      <p className="text-slate-400 text-[10px] mb-1">{label}</p>
      {payload.map((p, i) => (
        <p key={i} className="text-xs font-medium" style={{ color: p.color }}>
          {p.name}: {typeof p.value === 'number' ? `${p.value}%` : '—'}
        </p>
      ))}
    </div>
  );
}

function TimelineTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 shadow-xl">
      <p className="text-slate-400 text-[10px] mb-1">{fmt(label)}</p>
      {payload.map((p, i) => (
        <p key={i} className="text-xs font-medium" style={{ color: p.color }}>
          {p.name}: {typeof p.value === 'number' ? `${p.value}%` : '—'}
        </p>
      ))}
    </div>
  );
}

function SessionDetail({ log }) {
  const grade = typeof log.successScore === 'number' ? getGrade(log.successScore) : null;
  const hasTimeline = log.scoreTimeline && log.scoreTimeline.length >= 3;
  const hasChecks = log.formChecks && log.formChecks.length > 0;

  return (
    <div className="mt-4 space-y-4 border-t border-slate-800 pt-4 cursor-default" onClick={(e) => e.stopPropagation()}>
      {/* Score breakdown */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
        <div className="bg-slate-800/50 rounded-lg p-3 text-center">
          <p className="text-slate-500 text-[10px] uppercase tracking-wider mb-1">Overall</p>
          <p className={`text-lg font-display ${log.successScore >= 70 ? 'text-emerald-400' : log.successScore >= 40 ? 'text-amber-400' : 'text-red-400'}`}>
            {typeof log.successScore === 'number' ? `${log.successScore}%` : '—'}
          </p>
        </div>
        <div className="bg-slate-800/50 rounded-lg p-3 text-center">
          <p className="text-slate-500 text-[10px] uppercase tracking-wider mb-1">Form</p>
          <p className={`text-lg font-display ${(log.formMatchScore || 0) >= 70 ? 'text-violet-400' : 'text-amber-400'}`}>
            {typeof log.formMatchScore === 'number' ? `${log.formMatchScore}%` : '—'}
          </p>
        </div>
        <div className="bg-slate-800/50 rounded-lg p-3 text-center">
          <p className="text-slate-500 text-[10px] uppercase tracking-wider mb-1">Posture</p>
          <p className={`text-lg font-display ${(log.postureScore || 0) >= 70 ? 'text-emerald-400' : 'text-amber-400'}`}>
            {typeof log.postureScore === 'number' ? `${log.postureScore}%` : '—'}
          </p>
        </div>
        <div className="bg-slate-800/50 rounded-lg p-3 text-center">
          <p className="text-slate-500 text-[10px] uppercase tracking-wider mb-1">Grade</p>
          <p className={`text-lg font-display ${grade?.color || 'text-slate-400'}`}>
            {log.grade || grade?.grade || '—'}
          </p>
        </div>
      </div>

      {/* Stats Row */}
      <div className="grid grid-cols-3 gap-2">
        <div className="bg-slate-800/30 rounded-lg p-2 text-center">
          <p className="text-slate-500 text-[10px]">Reps</p>
          <p className="text-white text-sm font-medium">{log.repsCompleted || '—'}</p>
        </div>
        <div className="bg-slate-800/30 rounded-lg p-2 text-center">
          <p className="text-slate-500 text-[10px]">Sets</p>
          <p className="text-white text-sm font-medium">{log.setsCompleted || '—'}</p>
        </div>
        <div className="bg-slate-800/30 rounded-lg p-2 text-center">
          <p className="text-slate-500 text-[10px]">Duration</p>
          <p className="text-white text-sm font-medium">{log.duration ? fmt(log.duration) : '—'}</p>
        </div>
      </div>

      {/* Mini Chart */}
      {hasTimeline && (
        <div className="bg-slate-800/20 rounded-xl p-3">
          <p className="text-slate-500 text-[10px] uppercase mb-2">Performance Timeline</p>
          <ResponsiveContainer width="100%" height={80}>
            <AreaChart data={log.scoreTimeline}>
              <defs>
                <linearGradient id={`grad-${log._id}`} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0} />
                </linearGradient>
              </defs>
              <YAxis domain={[0, 100]} hide />
              <XAxis dataKey="time" hide />
              <Area type="monotone" dataKey="score" stroke="#8b5cf6" strokeWidth={1.5} fill={`url(#grad-${log._id})`} dot={false} />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Form Checks */}
      {hasChecks && (
        <div className="space-y-2">
          <p className="text-slate-500 text-[10px] uppercase">Key Form Metrics</p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
            {log.formChecks.map((check, i) => (
              <div key={i} className="bg-slate-800/30 rounded-lg p-2.5">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-slate-300 text-xs">{check.name}</span>
                  <span className={`text-xs font-medium ${check.avgScore >= 80 ? 'text-emerald-400' : 'text-amber-400'}`}>
                    {check.avgScore}%
                  </span>
                </div>
                <div className="h-1 bg-slate-700/50 rounded-full overflow-hidden">
                  <div 
                    className={`h-full rounded-full ${check.avgScore >= 80 ? 'bg-emerald-500' : 'bg-amber-500'}`} 
                    style={{ width: `${check.avgScore}%` }} 
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ====== MAIN PAGE ======
export default function AnalyticsPage() {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [expandedId, setExpandedId] = useState(null);

  useEffect(() => {
    API.get('/progress/exercises')
      .then(r => setLogs(r.data || []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  // Aggregate Metrics
  const stats = useMemo(() => {
    const validLogs = logs.filter(l => typeof l.successScore === 'number');
    if (!validLogs.length) return { avgScore: null, avgForm: null, avgPosture: null };

    const sum = (key) => validLogs.reduce((s, l) => s + (l[key] || 0), 0);
    return {
      avgScore: Math.round(sum('successScore') / validLogs.length),
      avgForm: Math.round(sum('formMatchScore') / validLogs.length),
      avgPosture: Math.round(sum('postureScore') / validLogs.length),
    };
  }, [logs]);

  // Weekly Trend Data
  const weeklyScores = useMemo(() => {
    const days = {};
    for (let i = 6; i >= 0; i--) {
      const d = new Date(Date.now() - i * 86400000);
      const key = d.toLocaleDateString('en', { weekday: 'short' });
      days[key] = { total: 0, form: 0, posture: 0, count: 0 };
    }

    logs.forEach(l => {
      const key = new Date(l.completedAt).toLocaleDateString('en', { weekday: 'short' });
      if (key in days && typeof l.successScore === 'number') {
        days[key].total += l.successScore;
        days[key].form += (l.formMatchScore || 0);
        days[key].posture += (l.postureScore || 0);
        days[key].count += 1;
      }
    });

    return Object.entries(days).map(([day, v]) => ({
      day,
      score: v.count ? Math.round(v.total / v.count) : 0,
      form: v.count ? Math.round(v.form / v.count) : 0,
      posture: v.count ? Math.round(v.posture / v.count) : 0,
    }));
  }, [logs]);

  const latestTimelineLog = useMemo(
    () => logs.find(l => Array.isArray(l.scoreTimeline) && l.scoreTimeline.length >= 3) || null,
    [logs]
  );

  const latestTimeline = useMemo(() => {
    if (!latestTimelineLog) return [];
    return latestTimelineLog.scoreTimeline.map(pt => {
      const formScore = typeof pt.score === 'number' ? pt.score : null;
      const postureScore = typeof pt.postureScore === 'number' ? pt.postureScore : null;
      const combinedScore = typeof pt.combinedScore === 'number'
        ? pt.combinedScore
        : (formScore != null && postureScore != null
            ? Math.round(formScore * 0.6 + postureScore * 0.4)
            : formScore);
      return { ...pt, combinedScore, postureScore };
    });
  }, [latestTimelineLog]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-2 border-sky-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto px-4 py-8">
      {/* Header & High-Level Stats */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-8">
        <div>
          <h2 className="font-display text-4xl text-white mb-2">Analytics</h2>
          <p className="text-slate-400">Track your form accuracy and recovery progress.</p>
        </div>
        <div className="flex gap-3">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl px-5 py-4 min-w-[100px]">
            <p className="text-slate-500 text-[10px] uppercase tracking-widest mb-1">Avg Score</p>
            <p className="text-white text-2xl font-display">{stats.avgScore ? `${stats.avgScore}%` : '—'}</p>
          </div>
          <div className="bg-slate-900 border border-slate-800 rounded-2xl px-5 py-4 min-w-[100px]">
            <p className="text-slate-500 text-[10px] uppercase tracking-widest mb-1">Avg Form</p>
            <p className="text-violet-400 text-2xl font-display">{stats.avgForm ? `${stats.avgForm}%` : '—'}</p>
          </div>
        </div>
      </div>

      {logs.length === 0 ? (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-16 text-center">
          <div className="text-6xl mb-6 opacity-50">📊</div>
          <h3 className="text-white font-medium text-lg">No sessions recorded</h3>
          <p className="text-slate-500 mt-2">Complete an exercise with the camera to generate analytics.</p>
        </div>
      ) : (
        <div className="space-y-6">
          {latestTimeline.length >= 3 && (
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6">
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h3 className="text-white font-medium">Latest Session Timeline</h3>
                  <p className="text-slate-500 text-xs mt-1">{latestTimelineLog.exerciseName}</p>
                </div>
                <div className="flex gap-3 text-[10px] font-medium uppercase tracking-tighter">
                  <span className="flex items-center gap-1.5 text-emerald-400"><div className="w-1.5 h-1.5 rounded-full bg-emerald-400"/> Score</span>
                  <span className="flex items-center gap-1.5 text-sky-400"><div className="w-1.5 h-1.5 rounded-full bg-sky-400"/> Posture</span>
                </div>
              </div>
              <ResponsiveContainer width="100%" height={220}>
                <LineChart data={latestTimeline}>
                  <XAxis dataKey="time" axisLine={false} tickLine={false} tick={{ fill: '#64748b', fontSize: 12 }} tickFormatter={fmt} dy={10} />
                  <YAxis domain={[0, 100]} hide />
                  <Tooltip content={<TimelineTooltip />} />
                  <Line type="monotone" dataKey="combinedScore" name="Score" stroke="#10b981" strokeWidth={3} dot={false} connectNulls />
                  <Line type="monotone" dataKey="postureScore" name="Posture" stroke="#0ea5e9" strokeWidth={2} strokeDasharray="5 5" dot={false} connectNulls />
                </LineChart>
              </ResponsiveContainer>
            </div>
          )}

          {/* Main Trend Chart */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-white font-medium">Weekly Performance</h3>
              <div className="flex gap-3 text-[10px] font-medium uppercase tracking-tighter">
                <span className="flex items-center gap-1.5 text-sky-400"><div className="w-1.5 h-1.5 rounded-full bg-sky-400"/> Overall</span>
                <span className="flex items-center gap-1.5 text-violet-400"><div className="w-1.5 h-1.5 rounded-full bg-violet-400"/> Form</span>
              </div>
            </div>
            <ResponsiveContainer width="100%" height={220}>
              <LineChart data={weeklyScores}>
                <XAxis dataKey="day" axisLine={false} tickLine={false} tick={{ fill: '#64748b', fontSize: 12 }} dy={10} />
                <Tooltip content={<CustomTooltip />} />
                <Line type="monotone" dataKey="score" name="Overall" stroke="#0ea5e9" strokeWidth={3} dot={{ r: 4, fill: '#0f172a', strokeWidth: 2 }} activeDot={{ r: 6 }} />
                <Line type="monotone" dataKey="form" name="Form" stroke="#8b5cf6" strokeWidth={2} strokeDasharray="5 5" dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>

          {/* History List */}
          <div className="space-y-3">
            <h3 className="text-white font-medium px-1">Session History</h3>
            {logs.map((l) => {
              const isExpanded = expandedId === l._id;
              const grade = typeof l.successScore === 'number' ? getGrade(l.successScore) : null;

              return (
                <div 
                  key={l._id} 
                  className={`bg-slate-900 border transition-all duration-200 rounded-2xl p-4 cursor-pointer hover:border-slate-600 ${isExpanded ? 'border-sky-500/50 ring-1 ring-sky-500/20' : 'border-slate-800'}`}
                  onClick={() => setExpandedId(isExpanded ? null : l._id)}
                >
                  <div className="flex items-center justify-between gap-4">
                    <div className="flex items-center gap-4">
                      <div className={`w-12 h-12 rounded-xl flex items-center justify-center text-xl font-display bg-slate-800 ${grade?.color || 'text-slate-500'}`}>
                        {l.grade || grade?.grade || '—'}
                      </div>
                      <div>
                        <p className="text-white font-medium">{l.exerciseName}</p>
                        <p className="text-slate-500 text-xs">
                          {new Date(l.completedAt).toLocaleDateString()} at {new Date(l.completedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </p>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-6">
                      <div className="text-right hidden sm:block">
                        <p className="text-slate-500 text-[10px] uppercase">Accuracy</p>
                        <p className="text-white font-display text-lg">{l.successScore}%</p>
                      </div>
                      <svg className={`w-5 h-5 text-slate-600 transition-transform duration-300 ${isExpanded ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                      </svg>
                    </div>
                  </div>

                  {l.autoCompleted && (
                    <div className="mt-3 inline-flex items-center gap-1.5 px-2 py-0.5 rounded bg-amber-500/10 text-amber-500 text-[10px] font-medium uppercase">
                      ⏱️ Auto-Submitted
                    </div>
                  )}

                  {isExpanded && <SessionDetail log={l} />}
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}