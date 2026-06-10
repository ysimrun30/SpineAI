import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';

const CONDITIONS = [
  { value: 'general_back_pain', label: 'General Back Pain' },
  { value: 'herniated_disc', label: 'Herniated Disc' },
  { value: 'spinal_stenosis', label: 'Spinal Stenosis' },
  { value: 'scoliosis', label: 'Scoliosis' },
  { value: 'post_surgery', label: 'Post Surgery Recovery' },
];

const PHASES = [
  { value: 'acute', label: 'Acute (0–6 weeks)' },
  { value: 'subacute', label: 'Subacute (6–12 weeks)' },
  { value: 'chronic', label: 'Chronic / Long-term' },
  { value: 'maintenance', label: 'Maintenance' },
  { value: 'pre_surgery', label: 'Pre-Surgery' },
];

export default function AuthPage() {
  const { login, register } = useAuth();
  const [mode, setMode] = useState('login');
  const [form, setForm] = useState({ name: '', email: '', password: '', condition: 'general_back_pain', recoveryPhase: 'acute', age: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const submit = async (e) => {
    e.preventDefault();
    setError(''); setLoading(true);
    try {
      if (mode === 'login') await login(form.email, form.password);
      else await register(form);
    } catch (err) {
      setError(err.response?.data?.error || 'Something went wrong');
    } finally { setLoading(false); }
  };

  return (
    <div className="min-h-screen bg-slate-950 flex font-body">
      {/* Left panel */}
      <div className="hidden lg:flex lg:w-1/2 flex-col justify-between p-12 bg-gradient-to-br from-slate-900 via-sky-950 to-slate-900 relative overflow-hidden">
        <div className="absolute inset-0 opacity-10"
          style={{ backgroundImage: 'radial-gradient(circle at 2px 2px, rgb(148 163 184) 1px, transparent 0)', backgroundSize: '32px 32px' }} />
        <div className="relative">
          <div className="flex items-center gap-3 mb-16">
            <div className="w-10 h-10 bg-sky-500 rounded-xl flex items-center justify-center">
              <span className="text-white font-bold text-lg">S</span>
            </div>
            <span className="text-white font-display text-2xl">SpineAI</span>
          </div>
          <h1 className="font-display text-5xl text-white leading-tight mb-6">
            Your spine health,<br />
            <span className="text-sky-400">intelligently guided.</span>
          </h1>
          <p className="text-slate-400 text-lg leading-relaxed max-w-md">
            AI-powered education, personalized physiotherapy, and real-time posture monitoring for spine surgery patients.
          </p>
        </div>
        <div className="relative grid grid-cols-3 gap-4">
          {[
            { icon: '🧠', label: 'AI Chat', desc: 'Surgery education' },
            { icon: '🏃', label: 'Exercises', desc: 'Personalized plans' },
            { icon: '📐', label: 'Posture', desc: 'Real-time detection' },
          ].map(f => (
            <div key={f.label} className="bg-white/5 border border-white/10 rounded-xl p-4">
              <div className="text-2xl mb-2">{f.icon}</div>
              <p className="text-white text-sm font-medium">{f.label}</p>
              <p className="text-slate-500 text-xs mt-1">{f.desc}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Right panel */}
      <div className="w-full lg:w-1/2 flex items-center justify-center p-8">
        <div className="w-full max-w-md">
          <div className="lg:hidden flex items-center gap-2 mb-8">
            <div className="w-8 h-8 bg-sky-500 rounded-lg flex items-center justify-center">
              <span className="text-white font-bold text-sm">S</span>
            </div>
            <span className="text-white font-display text-xl">SpineAI</span>
          </div>

          <h2 className="font-display text-3xl text-white mb-2">
            {mode === 'login' ? 'Welcome back' : 'Start your recovery'}
          </h2>
          <p className="text-slate-400 mb-8">
            {mode === 'login' ? 'Sign in to your account' : 'Create your patient profile'}
          </p>

          {error && (
            <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-3 mb-6 text-red-400 text-sm">{error}</div>
          )}

          <form onSubmit={submit} className="space-y-4">
            {mode === 'register' && (
              <div>
                <label className="block text-slate-400 text-sm mb-1">Full Name</label>
                <input className="w-full bg-slate-800 border border-slate-700 rounded-lg px-4 py-3 text-white placeholder-slate-500 focus:outline-none focus:border-sky-500 transition-colors"
                  placeholder="Dr. / Patient name" value={form.name} onChange={e => set('name', e.target.value)} required />
              </div>
            )}

            <div>
              <label className="block text-slate-400 text-sm mb-1">Email</label>
              <input type="email" className="w-full bg-slate-800 border border-slate-700 rounded-lg px-4 py-3 text-white placeholder-slate-500 focus:outline-none focus:border-sky-500 transition-colors"
                placeholder="you@email.com" value={form.email} onChange={e => set('email', e.target.value)} required />
            </div>

            <div>
              <label className="block text-slate-400 text-sm mb-1">Password</label>
              <input type="password" className="w-full bg-slate-800 border border-slate-700 rounded-lg px-4 py-3 text-white placeholder-slate-500 focus:outline-none focus:border-sky-500 transition-colors"
                placeholder="••••••••" value={form.password} onChange={e => set('password', e.target.value)} required />
            </div>

            {mode === 'register' && (
              <>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-slate-400 text-sm mb-1">Condition</label>
                    <select className="w-full bg-slate-800 border border-slate-700 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-sky-500 transition-colors"
                      value={form.condition} onChange={e => set('condition', e.target.value)}>
                      {CONDITIONS.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-slate-400 text-sm mb-1">Recovery Phase</label>
                    <select className="w-full bg-slate-800 border border-slate-700 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-sky-500 transition-colors"
                      value={form.recoveryPhase} onChange={e => set('recoveryPhase', e.target.value)}>
                      {PHASES.map(p => <option key={p.value} value={p.value}>{p.label}</option>)}
                    </select>
                  </div>
                </div>
                <div>
                  <label className="block text-slate-400 text-sm mb-1">Age</label>
                  <input type="number" className="w-full bg-slate-800 border border-slate-700 rounded-lg px-4 py-3 text-white placeholder-slate-500 focus:outline-none focus:border-sky-500 transition-colors"
                    placeholder="Your age" value={form.age} onChange={e => set('age', e.target.value)} />
                </div>
              </>
            )}

            <button type="submit" disabled={loading}
              className="w-full bg-sky-500 hover:bg-sky-400 disabled:opacity-50 text-white font-medium py-3 rounded-lg transition-all mt-2 flex items-center justify-center gap-2">
              {loading && <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />}
              {mode === 'login' ? 'Sign In' : 'Create Account'}
            </button>
          </form>

          <p className="text-center text-slate-500 mt-6 text-sm">
            {mode === 'login' ? "Don't have an account? " : 'Already have an account? '}
            <button onClick={() => { setMode(m => m === 'login' ? 'register' : 'login'); setError(''); }}
              className="text-sky-400 hover:text-sky-300 transition-colors">
              {mode === 'login' ? 'Sign up' : 'Sign in'}
            </button>
          </p>

          {/* Demo hint */}
          <div className="mt-6 bg-slate-800/50 border border-slate-700 rounded-lg p-3 text-center">
            <p className="text-slate-500 text-xs">
              Demo: Register a new account to get started
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
