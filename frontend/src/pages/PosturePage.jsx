import React, { useEffect, useRef, useState, useCallback } from 'react';
import API from '../utils/api';

const STATUS_CONFIG = {
  good:    { color: 'text-emerald-400', bg: 'bg-emerald-500/10 border-emerald-500/30', bar: 'bg-emerald-500', icon: '✓' },
  warning: { color: 'text-amber-400',   bg: 'bg-amber-500/10 border-amber-500/30',    bar: 'bg-amber-400',   icon: '⚠' },
  bad:     { color: 'text-red-400',     bg: 'bg-red-500/10 border-red-500/30',         bar: 'bg-red-500',     icon: '✗' },
  unknown: { color: 'text-slate-400',   bg: 'bg-slate-800 border-slate-700',           bar: 'bg-slate-600',   icon: '?' },
};

export default function PosturePage({ onEndSession }) {
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const poseRef = useRef(null);
  const cameraRef = useRef(null);
  const wsRef = useRef(null);
  const sessionRef = useRef({ start: null, snapshots: [], scores: [] });
  const activeRef = useRef(false);

  const [status, setStatus] = useState('unknown');
  const [message, setMessage] = useState('Initializing camera...');
  const [score, setScore] = useState(0);
  const [issues, setIssues] = useState([]);
  const [running, setRunning] = useState(false);
  const [loading, setLoading] = useState(false);
  const [sessionDuration, setSessionDuration] = useState(0);
  const [sessionComplete, setSessionComplete] = useState(false);
  const timerRef = useRef(null);

  // Connect WebSocket
  const connectWS = useCallback(() => {
    wsRef.current = new WebSocket('ws://localhost:9000/ws/posture');
    wsRef.current.onmessage = (e) => {
      const data = JSON.parse(e.data);
      setStatus(data.status || 'unknown');
      setMessage(data.message || '');
      setScore(data.score || 0);
      setIssues(data.issues || []);

      // Track for session
      const snap = { timestamp: new Date(), score: data.score, status: data.status, issues: data.issues || [] };
      sessionRef.current.snapshots.push(snap);
      if (data.score > 0) sessionRef.current.scores.push(data.score);
    };
    wsRef.current.onerror = () => {
      // Fallback: analyze locally if WS fails
      setMessage('Running local analysis...');
    };
  }, []);

  // Load MediaPipe Pose
  const initPose = useCallback(async () => {
    setLoading(true);
    setMessage('Loading pose detection...');

    try {
      if (!poseRef.current) {
        const { Pose, POSE_CONNECTIONS } = await import('@mediapipe/pose');
        const { drawConnectors, drawLandmarks } = await import('@mediapipe/drawing_utils');

        const pose = new Pose({
          locateFile: (file) => `https://cdn.jsdelivr.net/npm/@mediapipe/pose@0.5/${file}`
        });

        pose.setOptions({
          modelComplexity: 1,
          smoothLandmarks: true,
          enableSegmentation: false,
          minDetectionConfidence: 0.5,
          minTrackingConfidence: 0.5,
        });

        pose.onResults((results) => {
          if (!activeRef.current) return;
          const canvas = canvasRef.current;
          const video = videoRef.current;
          if (!canvas || !video) return;

          const ctx = canvas.getContext('2d');
          canvas.width = video.videoWidth;
          canvas.height = video.videoHeight;

          ctx.save();
          ctx.clearRect(0, 0, canvas.width, canvas.height);
          ctx.drawImage(results.image, 0, 0, canvas.width, canvas.height);

          if (results.poseLandmarks) {
            // Draw skeleton
            drawConnectors(ctx, results.poseLandmarks, POSE_CONNECTIONS, { color: 'rgba(14,165,233,0.6)', lineWidth: 2 });
            drawLandmarks(ctx, results.poseLandmarks, { color: 'rgba(14,165,233,0.9)', lineWidth: 1, radius: 3 });

            // Send to backend WS
            const landmarks = results.poseLandmarks.map(l => ({ x: l.x, y: l.y, z: l.z, visibility: l.visibility }));
            if (wsRef.current?.readyState === WebSocket.OPEN) {
              wsRef.current.send(JSON.stringify({ landmarks }));
            } else {
              // Local fallback analysis
              analyzeLocally(landmarks);
            }
          } else {
            setStatus('unknown');
            setMessage('Position yourself fully in frame');
            setScore(0);
            setIssues([]);
          }
          ctx.restore();
        });

        poseRef.current = pose;
      }

      const { Camera } = await import('@mediapipe/camera_utils');
      const camera = new Camera(videoRef.current, {
        onFrame: async () => {
          const poseInstance = poseRef.current;
          if (!activeRef.current || !poseInstance) return;
          try {
            await poseInstance.send({ image: videoRef.current });
          } catch (err) {
            if (activeRef.current) console.error('Pose send failed', err);
          }
        },
        width: 640, height: 480
      });

      cameraRef.current = camera;
      await camera.start();
      setRunning(true);
      setLoading(false);
      setMessage('Stand or sit in frame — analysis starting...');
    } catch (err) {
      console.error('MediaPipe load failed:', err);
      setLoading(false);
      setMessage('Could not load pose detection. Check browser compatibility.');
    }
  }, []);

  // Local posture analysis (fallback when WS unavailable)
  const analyzeLocally = useCallback((landmarks) => {
    if (!landmarks || landmarks.length < 25) {
      setStatus('unknown'); setMessage('Cannot detect full body'); setScore(0); return;
    }
    const lS = landmarks[11], rS = landmarks[12], lH = landmarks[23], rH = landmarks[24], nose = landmarks[0];
    if (!lS || !rS || !lH || !rH) { setStatus('unknown'); return; }

    const issueList = []; let s = 100;
    if (Math.abs(lS.y - rS.y) > 0.05) { issueList.push('Shoulders uneven — level them'); s -= 25; }
    if (Math.abs(lH.y - rH.y) > 0.05) { issueList.push('Hips tilted — sit evenly'); s -= 25; }
    const sCX = (lS.x + rS.x) / 2, hCX = (lH.x + rH.x) / 2;
    if (Math.abs(sCX - hCX) > 0.08) { issueList.push('Spine not straight — sit upright'); s -= 30; }
    const sCY = (lS.y + rS.y) / 2;
    if (nose && nose.y > sCY - 0.1) { issueList.push('Head forward — pull chin back'); s -= 20; }
    s = Math.max(0, s);

    setScore(s);
    setIssues(issueList);
    if (s >= 80) { setStatus('good'); setMessage('Great posture! Keep it up.'); }
    else if (s >= 50) { setStatus('warning'); setMessage('Minor posture issues detected'); }
    else { setStatus('bad'); setMessage('Poor posture — correct now'); }
  }, []);

  const startSession = async () => {
    activeRef.current = true;
    setSessionComplete(false);
    sessionRef.current = { start: new Date(), snapshots: [], scores: [] };
    connectWS();
    await initPose();
    timerRef.current = setInterval(() => setSessionDuration(d => d + 1), 1000);
  };

  const stopSession = async () => {
    activeRef.current = false;
    cameraRef.current?.stop();
    cameraRef.current = null;
    wsRef.current?.close();
    wsRef.current = null;
    if (timerRef.current) clearInterval(timerRef.current);
    setRunning(false);

    // Save session
    const { snapshots, scores, start } = sessionRef.current;
    if (snapshots.length > 0) {
      const avg = scores.length ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length) : 0;
      try {
        await API.post('/progress/posture', { startTime: start, endTime: new Date(), averageScore: avg, snapshots: snapshots.slice(-10) });
      } catch (e) { console.error('Failed to save session', e); }
    }

    setStatus('unknown');
    setMessage('Session ended');
    setScore(0);
    setIssues([]);
    setSessionDuration(0);
    setSessionComplete(true);
  };

  useEffect(() => () => {
    activeRef.current = false;
    cameraRef.current?.stop();
    poseRef.current?.close();
    poseRef.current = null;
    wsRef.current?.close();
    if (timerRef.current) clearInterval(timerRef.current);
  }, []);

  const cfg = STATUS_CONFIG[status];
  const fmt = (s) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      <div className="mb-6">
        <h2 className="font-display text-3xl text-white mb-1">Posture Monitor</h2>
        <p className="text-slate-400 text-sm">Real-time spine alignment analysis using your camera</p>
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Camera feed */}
        <div className="lg:col-span-2">
          <div className="relative bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden aspect-video">
            <video ref={videoRef} className="absolute inset-0 w-full h-full object-cover" muted playsInline />
            <canvas ref={canvasRef} className="absolute inset-0 w-full h-full object-cover" />

            {!running && sessionComplete && (
              <div className="absolute inset-0 flex flex-col items-center justify-center bg-slate-950/85">
                <div className="text-5xl mb-3">✅</div>
                <p className="text-white text-lg font-medium mb-2">Session saved</p>
                <p className="text-slate-400 text-sm mb-6 text-center max-w-xs">
                  Continue posture monitoring or review your analytics.
                </p>
                <div className="flex gap-3">
                  <button onClick={startSession}
                    className="bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 px-6 py-2.5 rounded-lg text-sm font-medium">
                    ↻ Continue Posture
                  </button>
                  <button onClick={() => onEndSession && onEndSession()}
                    className="bg-emerald-500 hover:bg-emerald-400 text-white px-6 py-2.5 rounded-lg text-sm font-medium">
                    View Analytics
                  </button>
                </div>
              </div>
            )}

            {!running && !sessionComplete && (
              <div className="absolute inset-0 flex flex-col items-center justify-center bg-slate-950/80">
                <div className="text-6xl mb-4">📷</div>
                <p className="text-white text-lg font-medium mb-2">Camera Ready</p>
                <p className="text-slate-400 text-sm mb-6 text-center max-w-xs">
                  SpineAI will analyze your posture in real-time using your webcam
                </p>
                <button onClick={startSession} disabled={loading}
                  className="bg-sky-500 hover:bg-sky-400 text-white px-8 py-3 rounded-xl font-medium transition-all flex items-center gap-2 disabled:opacity-50">
                  {loading && <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />}
                  {loading ? 'Loading AI...' : 'Start Posture Check'}
                </button>
              </div>
            )}

            {/* Live overlay */}
            {running && (
              <>
                <div className={`absolute top-4 left-4 border rounded-xl px-4 py-2 text-sm font-medium flex items-center gap-2 ${cfg.bg} ${cfg.color}`}>
                  <span className="text-lg">{cfg.icon}</span>
                  {message}
                </div>
                <div className="absolute top-4 right-4 bg-slate-950/80 border border-slate-700 rounded-xl px-3 py-2">
                  <p className="text-slate-400 text-xs">Session</p>
                  <p className="text-white font-medium text-sm">{fmt(sessionDuration)}</p>
                </div>
                <div className="absolute bottom-4 left-4 right-4">
                  <div className="bg-slate-950/80 rounded-xl p-3 border border-slate-800">
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="text-slate-400 text-xs">Posture Score</span>
                      <span className={`text-sm font-bold ${cfg.color}`}>{score}%</span>
                    </div>
                    <div className="h-1.5 bg-slate-800 rounded-full overflow-hidden">
                      <div className={`h-full rounded-full transition-all duration-500 ${cfg.bar}`} style={{ width: `${score}%` }} />
                    </div>
                  </div>
                </div>
              </>
            )}
          </div>

          {running && (
            <button onClick={stopSession}
              className="w-full mt-4 bg-red-500/10 hover:bg-red-500/20 border border-red-500/30 text-red-400 py-3 rounded-xl font-medium transition-all">
              ■ Stop Session & Save
            </button>
          )}
        </div>

        {/* Side panel */}
        <div className="space-y-4">
          {/* Score card */}
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-5">
            <h3 className="text-white font-medium mb-4">Posture Score</h3>
            <div className="relative w-28 h-28 mx-auto mb-4">
              <svg className="w-full h-full -rotate-90" viewBox="0 0 112 112">
                <circle cx="56" cy="56" r="44" fill="none" stroke="#1e293b" strokeWidth="8" />
                <circle cx="56" cy="56" r="44" fill="none"
                  stroke={status === 'good' ? '#10b981' : status === 'warning' ? '#f59e0b' : status === 'bad' ? '#ef4444' : '#475569'}
                  strokeWidth="8" strokeLinecap="round"
                  strokeDasharray={`${2 * Math.PI * 44}`}
                  strokeDashoffset={`${2 * Math.PI * 44 * (1 - score / 100)}`}
                  className="transition-all duration-700" />
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className={`text-2xl font-display ${cfg.color}`}>{score}</span>
                <span className="text-slate-500 text-xs">/100</span>
              </div>
            </div>
            <p className={`text-center text-sm font-medium ${cfg.color}`}>{message}</p>
          </div>

          {/* Issues */}
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-5">
            <h3 className="text-white font-medium mb-3">Issues Detected</h3>
            {issues.length === 0 ? (
              <p className="text-slate-500 text-sm">{running ? 'No issues detected!' : 'Start monitoring to see feedback'}</p>
            ) : (
              <div className="space-y-2">
                {issues.map((issue, i) => (
                  <div key={i} className="flex gap-2 items-start">
                    <span className="text-amber-400 text-sm mt-0.5">⚠</span>
                    <p className="text-slate-300 text-sm">{issue}</p>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Tips */}
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-5">
            <h3 className="text-white font-medium mb-3">Posture Tips</h3>
            <div className="space-y-2.5">
              {[
                { icon: '💺', tip: 'Keep hips level with seat height' },
                { icon: '📏', tip: 'Ears over shoulders, shoulders over hips' },
                { icon: '🖥️', tip: 'Screen at eye level, arm\'s length away' },
                { icon: '🦶', tip: 'Feet flat on the floor' },
                { icon: '⏱️', tip: 'Take breaks every 30 minutes' },
              ].map(({ icon, tip }) => (
                <div key={tip} className="flex gap-2.5 items-start">
                  <span className="text-lg">{icon}</span>
                  <p className="text-slate-400 text-xs leading-relaxed mt-0.5">{tip}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
