import React, { useState } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import AuthPage from './pages/AuthPage';
import OnboardingPage from './pages/OnboardingPage';
import Dashboard from './pages/Dashboard';
import ChatPage from './pages/ChatPage';
import ExercisePage from './pages/ExercisePage';
import VideoPreviewPage from './pages/VideoPreviewPage';
import PosturePage from './pages/PosturePage';
import ProfilePage from './pages/ProfilePage';
import ExerciseSessionPage from './pages/ExerciseSessionPage';
import AnalyticsPage from './pages/AnalyticsPage';
import DataCapturePage from './pages/DataCapturePage';
import Navbar from './components/Navbar';

function AppRoutes() {
  const { user, loading } = useAuth();
  const [page, setPage] = useState('dashboard');
  const [activeExercise, setActiveExercise] = useState(null);
  const [previewExercise, setPreviewExercise] = useState(null);

  const startExerciseSession = (exercise) => {
    setActiveExercise(exercise);
    setPage('exercise-session');
  };

  const openExercisePreview = (exercise) => {
    setPreviewExercise(exercise);
    setPage('exercise-preview');
  };

  if (loading) return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center">
      <div className="text-center">
        <div className="w-12 h-12 border-4 border-sky-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
        <p className="text-slate-400 font-body">Loading SpineAI...</p>
      </div>
    </div>
  );

  if (!user) return <AuthPage />;

  // Show onboarding if not completed
  if (!user.onboardingComplete) return <OnboardingPage />;

  // Exercise session mode
  if (page === 'exercise-session' && activeExercise) {
    return (
      <div className="min-h-screen bg-slate-950 font-body">
        <Navbar currentPage="exercise" setPage={(p) => { setPage(p); setActiveExercise(null); }} />
        <main className="pt-16">
          <ExerciseSessionPage
            exercise={activeExercise}
            onBack={() => { setPage('exercise'); setActiveExercise(null); }}
            onEndSession={() => { setPage('analytics'); setActiveExercise(null); }}
          />
        </main>
      </div>
    );
  }

  // Exercise preview mode
  if (page === 'exercise-preview' && previewExercise) {
    return (
      <div className="min-h-screen bg-slate-950 font-body">
        <Navbar
          currentPage="exercise"
          setPage={(p) => { setPage(p); setPreviewExercise(null); }}
        />
        <main className="pt-16">
          <VideoPreviewPage
            exercise={previewExercise}
            onStartSession={(exercise) => { setPreviewExercise(null); startExerciseSession(exercise); }}
            onBack={() => { setPage('exercise'); setPreviewExercise(null); }}
          />
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 font-body">
      <Navbar currentPage={page} setPage={setPage} />
      <main className="pt-16">
        {page === 'dashboard' && <Dashboard setPage={setPage} />}
        {page === 'chat' && <ChatPage />}
        {page === 'exercise' && (
          <ExercisePage
            onStartSession={startExerciseSession}
            onPreviewExercise={openExercisePreview}
          />
        )}
        {page === 'analytics' && <AnalyticsPage />}
        {page === 'posture' && <PosturePage onEndSession={() => setPage('analytics')} />}
        {page === 'profile' && <ProfilePage />}
        {page === 'capture' && <DataCapturePage />}
      </main>
    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <AppRoutes />
    </AuthProvider>
  );
}
