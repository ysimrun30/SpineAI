import React, { useState, useEffect } from 'react';
import API from '../utils/api';

const CATEGORY_ICONS = {
  stretching: '🧘',
  strengthening: '💪',
  mobility: '🔄',
  breathing: '🌬️',
  posture: '🧍',
};

const DIFFICULTY_COLORS = {
  beginner: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20',
  intermediate: 'text-amber-400 bg-amber-500/10 border-amber-500/20',
  advanced: 'text-rose-400 bg-rose-500/10 border-rose-500/20',
};

function extractYouTubeId(url) {
  if (!url) return null;
  const match = url.match(/(?:youtube\.com\/(?:watch\?v=|embed\/|shorts\/|live\/)|youtu\.be\/)([a-zA-Z0-9_-]{11})/);
  return match ? match[1] : null;
}

export default function VideoPreviewPage({ exercise, onStartSession, onBack }) {
  const [preview, setPreview] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showVideo, setShowVideo] = useState(false);

  useEffect(() => {
    if (!exercise?.name) return;

    setLoading(true);
    setError('');

    API.get(`/exercises/video-preview/${encodeURIComponent(exercise.name)}`)
      .then(r => {
        setPreview(r.data);
        setLoading(false);
      })
      .catch(err => {
        // Fallback: construct from exercise data directly
        const videoId = extractYouTubeId(exercise.youtubeUrl);
        if (videoId) {
          setPreview({
            ...exercise,
            videoId,
            embedUrl: `https://www.youtube.com/embed/${videoId}?rel=0&modestbranding=1`,
            thumbnails: {
              high: `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`,
              maxres: `https://img.youtube.com/vi/${videoId}/maxresdefault.jpg`,
            }
          });
        } else {
          setError('Video preview not available');
        }
        setLoading(false);
      });
  }, [exercise]);

  const videoId = preview?.videoId || extractYouTubeId(exercise?.youtubeUrl);
  const embedUrl = preview?.embedUrl || (videoId ? `https://www.youtube.com/embed/${videoId}?rel=0&modestbranding=1` : null);
  const thumbnail = preview?.thumbnails?.maxres || preview?.thumbnails?.high || (videoId ? `https://img.youtube.com/vi/${videoId}/hqdefault.jpg` : null);

  const diffStyle = DIFFICULTY_COLORS[exercise?.difficulty] || DIFFICULTY_COLORS.beginner;
  const categoryIcon = CATEGORY_ICONS[exercise?.category] || '🏋️';

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <div className="text-center">
        <div className="w-10 h-10 border-2 border-sky-500 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
        <p className="text-slate-400 text-sm">Loading exercise preview...</p>
      </div>
    </div>
  );

  return (
    <div className="max-w-5xl mx-auto px-4 py-6">
      {/* Header */}
      <div className="flex items-center gap-4 mb-6">
        <button onClick={onBack}
          className="w-10 h-10 bg-slate-800 hover:bg-slate-700 rounded-xl flex items-center justify-center text-slate-400 hover:text-white transition-all"
          id="video-preview-back-btn">
          ←
        </button>
        <div>
          <p className="text-sky-400 text-xs font-medium uppercase tracking-wider mb-0.5">Exercise Preview</p>
          <h2 className="font-display text-2xl text-white">{exercise?.name || 'Exercise'}</h2>
        </div>
      </div>

      <div className="grid lg:grid-cols-5 gap-6">
        {/* Video Section — larger column */}
        <div className="lg:col-span-3 space-y-4">
          {/* Video Player */}
          <div className="relative bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden" style={{ aspectRatio: '16/9' }}>
            {embedUrl && showVideo ? (
              <iframe
                src={`${embedUrl}&autoplay=1`}
                title={`${exercise?.name} - Exercise Preview`}
                className="w-full h-full absolute inset-0"
                frameBorder="0"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
                id="exercise-video-player"
              />
            ) : thumbnail ? (
              <button
                onClick={() => setShowVideo(true)}
                className="w-full h-full absolute inset-0 group cursor-pointer"
                id="video-thumbnail-play-btn"
              >
                <img
                  src={thumbnail}
                  alt={exercise?.name}
                  className="w-full h-full object-cover"
                  onError={(e) => {
                    // Fallback to medium quality thumbnail
                    e.target.src = preview?.thumbnails?.medium || `https://img.youtube.com/vi/${videoId}/mqdefault.jpg`;
                  }}
                />
                {/* Dark overlay */}
                <div className="absolute inset-0 bg-slate-950/40 group-hover:bg-slate-950/30 transition-all" />
                {/* Play button */}
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="w-20 h-20 bg-red-600 hover:bg-red-500 rounded-2xl flex items-center justify-center shadow-2xl shadow-red-500/30 group-hover:scale-110 transition-all duration-300">
                    <svg className="w-8 h-8 text-white ml-1" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M8 5v14l11-7z"/>
                    </svg>
                  </div>
                </div>
                {/* Label */}
                <div className="absolute bottom-4 left-4 right-4">
                  <div className="bg-slate-950/80 backdrop-blur-sm rounded-xl px-4 py-2 flex items-center gap-2">
                    <svg className="w-4 h-4 text-red-500 flex-shrink-0" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814z"/>
                      <path d="M9.545 15.568V8.432L15.818 12l-6.273 3.568z" fill="#fff"/>
                    </svg>
                    <span className="text-white text-sm font-medium">Watch exercise demonstration</span>
                  </div>
                </div>
              </button>
            ) : (
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="text-center">
                  <div className="text-4xl mb-2">{categoryIcon}</div>
                  <p className="text-slate-500 text-sm">No video preview available</p>
                </div>
              </div>
            )}
          </div>

          {/* Quick info bar */}
          <div className="grid grid-cols-4 gap-2">
            <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-3 text-center">
              <p className="text-slate-500 text-[10px] uppercase tracking-wider mb-1">Sets</p>
              <p className="text-white text-lg font-display">{exercise?.sets || '—'}</p>
            </div>
            <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-3 text-center">
              <p className="text-slate-500 text-[10px] uppercase tracking-wider mb-1">Reps</p>
              <p className="text-white text-lg font-display">{exercise?.reps || '—'}</p>
            </div>
            <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-3 text-center">
              <p className="text-slate-500 text-[10px] uppercase tracking-wider mb-1">Duration</p>
              <p className="text-white text-lg font-display">{exercise?.duration ? `${Math.ceil(exercise.duration / 60)}m` : '—'}</p>
            </div>
            <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-3 text-center">
              <p className="text-slate-500 text-[10px] uppercase tracking-wider mb-1">Level</p>
              <p className={`text-sm font-medium capitalize ${diffStyle.split(' ')[0]}`}>{exercise?.difficulty || '—'}</p>
            </div>
          </div>

          {/* Start Button */}
          <button
            onClick={() => onStartSession(exercise)}
            className="w-full bg-gradient-to-r from-emerald-500 to-sky-500 hover:from-emerald-400 hover:to-sky-400 text-white py-4 rounded-xl font-medium text-lg transition-all flex items-center justify-center gap-3 shadow-lg shadow-emerald-500/20 hover:shadow-emerald-500/30 hover:scale-[1.01] active:scale-[0.99]"
            id="start-camera-session-btn"
          >
            <span className="text-xl">📷</span>
            Start Exercise with Camera Tracking
          </button>
        </div>

        {/* Details Panel */}
        <div className="lg:col-span-2 space-y-4">
          {/* Exercise details card */}
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-5">
            <div className="flex items-center gap-2 mb-3">
              <span className="text-2xl">{categoryIcon}</span>
              <div>
                <h3 className="text-white font-medium">{exercise?.name}</h3>
                <div className="flex items-center gap-2 mt-0.5">
                  <span className={`text-[10px] border px-2 py-0.5 rounded-full capitalize ${diffStyle}`}>
                    {exercise?.difficulty}
                  </span>
                  <span className="text-slate-600 text-[10px]">•</span>
                  <span className="text-slate-400 text-xs capitalize">{exercise?.category}</span>
                </div>
              </div>
            </div>
            <p className="text-slate-400 text-sm leading-relaxed">{exercise?.description}</p>
          </div>

          {/* Instructions */}
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-5">
            <h4 className="text-white font-medium mb-3 flex items-center gap-2">
              <span className="w-6 h-6 bg-sky-500/20 rounded-lg flex items-center justify-center text-sky-400 text-xs">📋</span>
              How to Perform
            </h4>
            <ol className="space-y-2.5">
              {(exercise?.instructions || []).map((ins, i) => (
                <li key={i} className="flex gap-3 text-sm">
                  <span className="w-5 h-5 rounded-full bg-sky-500/10 border border-sky-500/20 text-sky-400 text-xs flex items-center justify-center flex-shrink-0 mt-0.5">
                    {i + 1}
                  </span>
                  <span className="text-slate-300">{ins}</span>
                </li>
              ))}
            </ol>
          </div>

          {/* Safety Notes */}
          {exercise?.safetyNotes && (
            <div className="bg-sky-500/5 border border-sky-500/15 rounded-xl p-4">
              <h4 className="text-sky-400 text-xs font-medium uppercase tracking-wider mb-2 flex items-center gap-1.5">
                <span>🛡️</span> Safety Notes
              </h4>
              <p className="text-sky-300/80 text-sm leading-relaxed">{exercise.safetyNotes}</p>
            </div>
          )}

          {/* Warnings */}
          {exercise?.warnings?.length > 0 && (
            <div className="bg-amber-500/5 border border-amber-500/15 rounded-xl p-4">
              <h4 className="text-amber-400 text-xs font-medium uppercase tracking-wider mb-2 flex items-center gap-1.5">
                <span>⚠️</span> Warnings
              </h4>
              <ul className="space-y-1.5">
                {exercise.warnings.map((w, i) => (
                  <li key={i} className="text-amber-300/80 text-sm flex gap-2">
                    <span className="text-amber-500 mt-0.5">•</span>{w}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* YouTube link */}
          {exercise?.youtubeUrl && (
            <a
              href={exercise.youtubeUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-3 bg-slate-900 border border-slate-800 hover:border-red-500/30 rounded-xl p-4 transition-all group"
              id="open-youtube-link"
            >
              <div className="w-9 h-9 bg-red-600 rounded-lg flex items-center justify-center flex-shrink-0 group-hover:scale-110 transition-transform">
                <svg className="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814z"/>
                  <path d="M9.545 15.568V8.432L15.818 12l-6.273 3.568z" fill="#fff"/>
                </svg>
              </div>
              <div>
                <p className="text-white text-sm font-medium group-hover:text-red-400 transition-colors">Watch on YouTube</p>
                <p className="text-slate-500 text-xs">Open in new tab for full-screen viewing</p>
              </div>
              <svg className="w-4 h-4 text-slate-600 ml-auto group-hover:text-slate-400 transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
              </svg>
            </a>
          )}
        </div>
      </div>
    </div>
  );
}