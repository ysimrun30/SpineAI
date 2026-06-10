import React, { useEffect, useState } from 'react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { useAuth } from '../context/AuthContext';
import API from '../utils/api';

const PHASE_INFO = {
  pre_surgery: { color: 'text-purple-400', bg: 'bg-purple-500/10 border-purple-500/30', label: 'Pre-Surgery Prep' },
  acute: { color: 'text-red-400', bg: 'bg-red-500/10 border-red-500/30', label: 'Acute Recovery' },
  subacute: { color: 'text-amber-400', bg: 'bg-amber-500/10 border-amber-500/30', label: 'Subacute Recovery' },
  chronic: { color: 'text-blue-400', bg: 'bg-blue-500/10 border-blue-500/30', label: 'Chronic Management' },
  maintenance: { color: 'text-green-400', bg: 'bg-green-500/10 border-green-500/30', label: 'Maintenance Phase' },
};

const TIPS = {
  herniated_disc: ['Avoid bending forward at the waist', 'Use lumbar support when sitting', 'Sleep on your side with a pillow between knees'],
  post_surgery: ['Do not lift anything heavier than a cup of coffee', 'Walk multiple times a day, gradually increasing distance', 'Keep your incision clean and dry'],
  spinal_stenosis: ['Forward-leaning positions often reduce pain', 'Avoid prolonged standing or walking without rest', 'Stationary cycling is often well-tolerated'],
  scoliosis: ['Focus on core strengthening exercises', 'Avoid high-impact sports until cleared by your doctor', 'Work on breathing exercises to improve lung capacity'],
  general_back_pain: ['Apply ice for acute pain, heat for muscle tension', 'Take frequent breaks from sitting — move every 30 mins', 'Strengthen your core to protect your spine'],
};

export default function Dashboard({ setPage }) {
  const { user } = useAuth();
  const [stats, setStats] = useState(null);
  const [exercises, setExercises] = useState([]);
  const phaseInfo = PHASE_INFO[user?.recoveryPhase] || PHASE_INFO.acute;
  const tips = TIPS[user?.condition] || TIPS.general_back_pain;

  useEffect(() => {
    API.get('/progress/stats').then(r => setStats(r.data)).catch(() => {});
    API.get('/exercises/plan').then(r => setExercises(r.data.exercises || [])).catch(() => {});
  }, []);

  const statCards = [
    { label: 'Exercises Done', value: stats?.totalExercises ?? '—', icon: '🏃', sub: 'this week' },
    { label: 'Posture Sessions', value: stats?.totalPostureSessions ?? '—', icon: '📐', sub: 'this week' },
    { label: 'Posture Score', value: stats?.averagePostureScore ? `${stats.averagePostureScore}%` : '—', icon: '✓', sub: 'average' },
    { label: 'Day Streak', value: stats?.streak ?? '—', icon: '🔥', sub: 'days in a row' },
  ];

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-4 mb-8">
        <div>
          <h1 className="font-display text-3xl text-white mb-1">
            Good {new Date().getHours() < 12 ? 'morning' : new Date().getHours() < 17 ? 'afternoon' : 'evening'},{' '}
            <span className="text-sky-400">{user?.name?.split(' ')[0]}</span>
          </h1>
          <p className="text-slate-400 capitalize">{user?.condition?.replace(/_/g, ' ')} · {user?.recoveryPhase?.replace(/_/g, ' ')} phase</p>
        </div>
        <div className={`border rounded-xl px-4 py-2 text-sm ${phaseInfo.bg} ${phaseInfo.color}`}>
          {phaseInfo.label}
        </div>
      </div>

      {/* Stats grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {statCards.map(s => (
          <div key={s.label} className="bg-slate-900 border border-slate-800 rounded-xl p-5 hover:border-slate-700 transition-colors">
            <div className="flex items-center justify-between mb-3">
              <span className="text-2xl">{s.icon}</span>
              <span className="text-2xl font-display text-white">{s.value}</span>
            </div>
            <p className="text-slate-300 text-sm font-medium">{s.label}</p>
            <p className="text-slate-500 text-xs mt-0.5">{s.sub}</p>
          </div>
        ))}
      </div>

      <div className="grid lg:grid-cols-3 gap-6 mb-8">
        {/* Weekly chart */}
        <div className="lg:col-span-2 bg-slate-900 border border-slate-800 rounded-xl p-6">
          <h3 className="text-white font-medium mb-6">Weekly Exercise Activity</h3>
          {stats?.weeklyData ? (
            <ResponsiveContainer width="100%" height={160}>
              <BarChart data={stats.weeklyData} barCategoryGap="30%">
                <XAxis dataKey="day" axisLine={false} tickLine={false} tick={{ fill: '#64748b', fontSize: 12 }} />
                <YAxis hide />
                <Tooltip
                  contentStyle={{ background: '#0f172a', border: '1px solid #1e293b', borderRadius: '8px', color: '#fff' }}
                  cursor={{ fill: 'rgba(14,165,233,0.05)' }}
                />
                <Bar dataKey="count" radius={[6, 6, 0, 0]}>
                  {stats.weeklyData.map((entry, i) => (
                    <Cell key={i} fill={entry.count > 0 ? '#0ea5e9' : '#1e293b'} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-40 flex items-center justify-center">
              <p className="text-slate-500 text-sm">Complete exercises to see your progress</p>
            </div>
          )}
        </div>

        {/* Today's tips */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-6">
          <h3 className="text-white font-medium mb-4">💡 Daily Tips</h3>
          <div className="space-y-3">
            {tips.map((tip, i) => (
              <div key={i} className="flex gap-3">
                <div className="w-5 h-5 rounded-full bg-sky-500/20 border border-sky-500/30 flex items-center justify-center flex-shrink-0 mt-0.5">
                  <span className="text-sky-400 text-xs">{i + 1}</span>
                </div>
                <p className="text-slate-400 text-sm leading-relaxed">{tip}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Quick actions */}
      <div className="grid sm:grid-cols-3 gap-4 mb-8">
        {[
          { icon: '🤖', title: 'Ask AI Assistant', desc: 'Get answers about your surgery & recovery', page: 'chat', color: 'from-sky-500/20 to-sky-600/5' },
          { icon: '🏋️', title: 'Start Exercises', desc: `${exercises.length} exercises in your plan`, page: 'exercise', color: 'from-emerald-500/20 to-emerald-600/5' },
          { icon: '📷', title: 'Check Posture', desc: 'Real-time posture monitoring', page: 'posture', color: 'from-violet-500/20 to-violet-600/5' },
        ].map(a => (
          <button key={a.page} onClick={() => setPage(a.page)}
            className={`bg-gradient-to-br ${a.color} border border-slate-800 hover:border-slate-600 rounded-xl p-6 text-left transition-all group`}>
            <div className="text-3xl mb-3">{a.icon}</div>
            <h4 className="text-white font-medium mb-1 group-hover:text-sky-300 transition-colors">{a.title}</h4>
            <p className="text-slate-500 text-sm">{a.desc}</p>
          </button>
        ))}
      </div>

      {/* Today's exercise plan */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-6">
        <div className="flex items-center justify-between mb-5">
          <h3 className="text-white font-medium">Today's Exercise Plan</h3>
          <button onClick={() => setPage('exercise')} className="text-sky-400 hover:text-sky-300 text-sm transition-colors">
            View all →
          </button>
        </div>
        {exercises.length === 0 ? (
          <div className="text-center py-8">
            <p className="text-slate-500 text-sm mb-3">No exercise plan yet</p>
            <button onClick={() => setPage('exercise')}
              className="bg-sky-500 hover:bg-sky-400 text-white px-4 py-2 rounded-lg text-sm transition-colors">
              Generate My Plan
            </button>
          </div>
        ) : (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {exercises.slice(0, 3).map((ex, i) => (
              <div key={i} className="bg-slate-800/50 border border-slate-700 rounded-lg p-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs text-sky-400 bg-sky-500/10 border border-sky-500/20 px-2 py-0.5 rounded capitalize">
                    {ex.category}
                  </span>
                  <span className="text-xs text-slate-500">{ex.sets}×{ex.reps}</span>
                </div>
                <p className="text-white text-sm font-medium">{ex.name}</p>
                <p className="text-slate-500 text-xs mt-1 capitalize">{ex.difficulty}</p>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
