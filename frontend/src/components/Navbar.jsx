import React from 'react';
import { useAuth } from '../context/AuthContext';

const NAV = [
  { id: 'dashboard', label: 'Dashboard', icon: '⬡' },
  { id: 'chat', label: 'AI Chat', icon: '◎' },
  { id: 'exercise', label: 'Exercises', icon: '◈' },
  { id: 'analytics', label: 'Analytics', icon: '▣' },
  { id: 'posture', label: 'Posture', icon: '◉' },
  { id: 'capture', label: 'Capture', icon: 'C' },
  { id: 'profile', label: 'Profile', icon: '◇' },
];

export default function Navbar({ currentPage, setPage }) {
  const { user, logout } = useAuth();

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 bg-slate-950/90 backdrop-blur-md border-b border-slate-800">
      <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between">
        <div className="flex items-center gap-2 cursor-pointer" onClick={() => setPage('dashboard')}>
          <div className="w-8 h-8 bg-sky-500 rounded-lg flex items-center justify-center">
            <span className="text-white text-xs font-bold">S</span>
          </div>
          <span className="text-white font-display text-lg">SpineAI</span>
        </div>

        <div className="flex items-center gap-1">
          {NAV.map(n => (
            <button
              key={n.id}
              onClick={() => setPage(n.id)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                currentPage === n.id
                  ? 'bg-sky-500/20 text-sky-400 border border-sky-500/30'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800'
              }`}
            >
              <span className="hidden sm:inline">{n.label}</span>
              <span className="sm:hidden">{n.icon}</span>
            </button>
          ))}
        </div>

        <div className="flex items-center gap-3">
          <div className="hidden md:block text-right">
            <p className="text-white text-sm font-medium">{user?.name}</p>
            <p className="text-slate-500 text-xs capitalize">{user?.condition?.replace(/_/g,' ')}</p>
          </div>
          <button
            onClick={logout}
            className="w-8 h-8 bg-slate-800 hover:bg-slate-700 rounded-full flex items-center justify-center text-slate-400 hover:text-white transition-all text-xs"
          >✕</button>
        </div>
      </div>
    </nav>
  );
}
