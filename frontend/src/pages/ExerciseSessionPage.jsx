import React, { useEffect, useRef, useState, useCallback } from 'react';
import API from '../utils/api';
import FeedbackModal from '../components/FeedbackModal';

// ====== REP COUNTING ENGINE ======
class RepCounter {
  constructor() {
    this.state = 'idle'; // idle | down | up
    this.count = 0;
    this.lastAngle = 0;
    this.smoothedAngle = 0;
    this.alpha = 0.3; // smoothing factor
  }

  static calcAngle(a, b, c) {
    const radians = Math.atan2(c.y - b.y, c.x - b.x) - Math.atan2(a.y - b.y, a.x - b.x);
    let angle = Math.abs(radians * 180.0 / Math.PI);
    if (angle > 180) angle = 360 - angle;
    return angle;
  }

  update(angle, downThreshold = 90, upThreshold = 150, isValid = true) {
    this.smoothedAngle = this.alpha * angle + (1 - this.alpha) * this.smoothedAngle;
    const a = this.smoothedAngle;

    if (!isValid) {
      this.lastAngle = a;
      return this.count;
    }

    if (this.state === 'idle' && a < downThreshold) {
      this.state = 'down';
    } else if (this.state === 'down' && a > upThreshold) {
      this.state = 'up';
      this.count++;
    } else if (this.state === 'up' && a < downThreshold) {
      this.state = 'down';
    }

    this.lastAngle = a;
    return this.count;
  }

  reset() {
    this.state = 'idle';
    this.count = 0;
    this.smoothedAngle = 0;
  }
}

// ====== EXERCISE CONFIGURATIONS ======
const SQUAT_CONFIG = {
  joints: [24, 26, 28], altJoints: [23, 25, 27],
  downThreshold: 90, upThreshold: 165, strictMin: 40, strictMax: 180, minRange: 25, label: 'Knee angle',
  formChecks: [
    { name: 'Knee Depth', joints: [24, 26, 28], idealAngle: 100, tolerance: 30, tip: 'Sit back and lower until thighs are near parallel' },
    { name: 'Hip Alignment', joints: [12, 24, 26], idealAngle: 170, tolerance: 25, tip: 'Keep chest up and spine neutral' },
  ]
};

const SEATED_MARCH_CONFIG = {
  joints: [11, 23, 25], altJoints: [12, 24, 26],
  downThreshold: 70, upThreshold: 155, strictMin: 25, strictMax: 180, minRange: 25, label: 'Hip flexion angle',
  formChecks: [
    { name: 'Knee Lift', joints: [11, 23, 25], idealAngle: 120, tolerance: 80, tip: 'Lift and lower the knee with control' },
  ]
};

const EXERCISE_CONFIGS = {
  'Plank': {
    joints: [12, 24, 26], altJoints: [11, 23, 25],
    strictMin: 150, strictMax: 185, label: 'Plank alignment',
    staticHold: true, holdSecondsPerRep: 10,
    formChecks: [
      { name: 'Hip Alignment', joints: [12, 24, 26], idealAngle: 176, tolerance: 15, tip: 'Keep hips level and core tight' },
    ]
  },
  'Squat': SQUAT_CONFIG,
  'squat': SQUAT_CONFIG,
  'Seated March': SEATED_MARCH_CONFIG,
  'seated_march': SEATED_MARCH_CONFIG,
  'Bridge Exercise': {
    joints: [11, 23, 25], altJoints: [12, 24, 26],
    downThreshold: 120, upThreshold: 160, strictMin: 100, strictMax: 175, minRange: 12, label: 'Hip angle',
    formChecks: [
      { name: 'Hip Extension', joints: [11, 23, 25], idealAngle: 170, tolerance: 15, tip: 'Lift hips higher to form a straight line' },
      { name: 'Knee Bend', joints: [23, 25, 27], idealAngle: 90, tolerance: 15, tip: 'Keep knees at 90° — feet flat' },
    ]
  },
  'Pelvic Tilt': {
    joints: [11, 23, 25], altJoints: [12, 24, 26],
    downThreshold: 140, upThreshold: 170, strictMin: 120, strictMax: 180, minRange: 12, label: 'Pelvic tilt angle',
    formChecks: [
      { name: 'Lower Back Flat', joints: [11, 23, 25], idealAngle: 165, tolerance: 15, tip: 'Press lower back into the floor' },
    ]
  },
  'Cat-Cow Stretch': {
    joints: [11, 23, 25], altJoints: [12, 24, 26],
    downThreshold: 130, upThreshold: 170, strictMin: 110, strictMax: 185, minRange: 12, label: 'Spine flexion',
    formChecks: [
      { name: 'Cat Curve', joints: [11, 23, 25], idealAngle: 130, tolerance: 20, tip: 'Round back upward' },
      { name: 'Cow Extension', joints: [11, 23, 25], idealAngle: 170, tolerance: 15, tip: 'Drop belly, look up' },
    ]
  },
  'Knee-to-Chest Stretch': {
    joints: [23, 25, 27], altJoints: [24, 26, 28],
    downThreshold: 60, upThreshold: 130, strictMin: 40, strictMax: 150, minRange: 12, label: 'Knee angle',
    formChecks: [ { name: 'Knee Pull', joints: [23, 25, 27], idealAngle: 50, tolerance: 15, tip: 'Pull knee closer to chest' } ]
  },
  'Bird Dog': {
    joints: [23, 11, 15], altJoints: [24, 12, 16],
    downThreshold: 90, upThreshold: 160, strictMin: 70, strictMax: 175, minRange: 12, label: 'Arm extension',
    formChecks: [
      { name: 'Arm Extension', joints: [23, 11, 15], idealAngle: 170, tolerance: 15, tip: 'Extend arm parallel to ground' },
      { name: 'Leg Extension', joints: [23, 25, 27], idealAngle: 170, tolerance: 15, tip: 'Extend opposite leg straight back' },
    ]
  },
  'Side Stretch': {
    joints: [13, 11, 23], altJoints: [14, 12, 24],
    downThreshold: 55, upThreshold: 85, strictMin: 42, strictMax: 110, minRange: 6, label: 'Shoulder angle',
    angleTolerance: 6, anglePassCount: 4, requireDatasetMatch: true,
    formChecks: [ { name: 'Side Lean', joints: [13, 11, 23], idealAngle: 75, tolerance: 15, tip: 'Reach further over your head' } ]
  },
  'default': {
    joints: [11, 23, 25], altJoints: [12, 24, 26],
    downThreshold: 100, upThreshold: 155, strictMin: 80, strictMax: 175, minRange: 12, label: 'Motion angle',
    formChecks: [ { name: 'Posture', joints: [11, 23, 25], idealAngle: 170, tolerance: 20, tip: 'Maintain alignment' } ]
  }
};

// ====== POSTURE & FORM ANALYZERS ======
function analyzePosture(landmarks) {
  if (!landmarks || landmarks.length < 25) return { status: 'unknown', score: 0, issues: [] };
  const lS = landmarks[11], rS = landmarks[12], lH = landmarks[23], rH = landmarks[24], nose = landmarks[0];
  if (!lS || !rS || !lH || !rH) return { status: 'unknown', score: 0, issues: [] };

  let score = 100;
  const issues = [];
  if (Math.abs(lS.y - rS.y) > 0.05) { issues.push('Level shoulders'); score -= 25; }
  if (Math.abs(lH.y - rH.y) > 0.05) { issues.push('Even hips'); score -= 25; }
  const sCX = (lS.x + rS.x) / 2, hCX = (lH.x + rH.x) / 2;
  if (Math.abs(sCX - hCX) > 0.08) { issues.push('Straighten spine'); score -= 30; }

  score = Math.max(0, score);
  const status = score >= 80 ? 'good' : score >= 50 ? 'warning' : 'bad';
  return { status, score, issues };
}

function analyzeForm(landmarks, formChecks) {
  if (!landmarks || !formChecks) return { score: 0, checks: [], overallStatus: 'unknown' };
  const results = formChecks.map(check => {
    const [iA, iB, iC] = check.joints;
    const a = landmarks[iA], b = landmarks[iB], c = landmarks[iC];
    if (!a || !b || !c || (b.visibility || 0) < 0.3) return { ...check, angle: null, status: 'unknown', matchPct: 0 };

    const angle = RepCounter.calcAngle(a, b, c);
    const deviation = Math.abs(angle - check.idealAngle);
    const matchPct = Math.max(0, Math.round(100 - (deviation / check.tolerance) * 50));
    const status = deviation <= check.tolerance * 0.5 ? 'perfect' : deviation <= check.tolerance ? 'good' : deviation <= check.tolerance * 2 ? 'adjust' : 'wrong';
    return { ...check, angle: Math.round(angle), status, matchPct: Math.min(100, matchPct) };
  });

  const valid = results.filter(r => r.angle !== null);
  const avg = valid.length ? Math.round(valid.reduce((s, r) => s + r.matchPct, 0) / valid.length) : 0;
  return { score: avg, checks: results, overallStatus: avg >= 85 ? 'perfect' : avg >= 65 ? 'good' : avg >= 40 ? 'adjust' : 'wrong' };
}

// ====== CONSTANTS & HELPERS ======
const extractYouTubeId = (url) => url?.match(/(?:youtube\.com\/(?:watch\?v=|embed\/|shorts\/|live\/)|youtu\.be\/)([a-zA-Z0-9_-]{11})/)?.[1];
const STATUS_STYLES = {
  good: { color: 'text-emerald-400', bg: 'bg-emerald-500/20 border-emerald-500/40', label: '✓ Correct Form' },
  warning: { color: 'text-amber-400', bg: 'bg-amber-500/20 border-amber-500/40', label: '⚠ Adjust Form' },
  bad: { color: 'text-red-400', bg: 'bg-red-500/20 border-red-500/40', label: '✗ Fix Posture' },
  unknown: { color: 'text-slate-400', bg: 'bg-slate-800 border-slate-700', label: '? Position Yourself' },
};
const FORM_STATUS_STYLES = {
  perfect: { color: 'text-emerald-400', icon: '✓', barColor: 'bg-emerald-500' },
  good: { color: 'text-sky-400', icon: '●', barColor: 'bg-sky-500' },
  adjust: { color: 'text-amber-400', icon: '⚠', barColor: 'bg-amber-500' },
  wrong: { color: 'text-red-400', icon: '✗', barColor: 'bg-red-500' },
  unknown: { color: 'text-slate-500', icon: '?', barColor: 'bg-slate-600' },
};

export default function ExerciseSessionPage({ exercise, onBack, onShowAnalysis, onEndSession }) {
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const poseRef = useRef(null);
  const cameraRef = useRef(null);
  const repCounterRef = useRef(new RepCounter());
  const repCountRef = useRef(0);
  const holdSecondsRef = useRef(0);
  const lastHoldTimeRef = useRef(null);
  const currentSetRef = useRef(1);
  const lastTimelineSecondRef = useRef(-1);

  const [running, setRunning] = useState(false);
  const [loading, setLoading] = useState(false);
  const [repCount, setRepCount] = useState(0);
  const [currentSet, setCurrentSet] = useState(1);
  const [postureStatus, setPostureStatus] = useState('unknown');
  const [postureScore, setPostureScore] = useState(0);
  const [postureIssues, setPostureIssues] = useState([]);
  const [remainingTime, setRemainingTime] = useState(180);
  const [sessionComplete, setSessionComplete] = useState(false);
  const [formAnalysis, setFormAnalysis] = useState({ score: 0, checks: [], overallStatus: 'unknown' });
  const [showRefVideo, setShowRefVideo] = useState(true);
  const [angleRanges, setAngleRanges] = useState(null);

  const postureFramesRef = useRef({ total: 0, good: 0, valid: 0 });
  const formFramesRef = useRef({ total: 0, sum: 0 });
  const formHistoryRef = useRef([]);
  const checkAccumulatorRef = useRef({});
  const activeRef = useRef(false);
  const timerRef = useRef(null);
  const stopRef = useRef(false);
  const sessionTimeRef = useRef(0);
  const angleHistoryRef = useRef([]);

  const config = EXERCISE_CONFIGS[exercise?.name] || EXERCISE_CONFIGS.default;
  const totalReps = Math.max(1, Number(exercise?.reps) || 10);
  const totalSets = Math.max(1, Number(exercise?.sets) || 1);
  const youtubeId = extractYouTubeId(exercise?.youtubeUrl);
  const embedUrl = youtubeId ? `https://www.youtube.com/embed/${youtubeId}?rel=0&modestbranding=1&loop=1&playlist=${youtubeId}` : null;

  useEffect(() => {
    API.get('/angles/ranges').then(r => setAngleRanges(r.data || {})).catch(() => {});
    return () => {
      activeRef.current = false;
      cameraRef.current?.stop();
      if (poseRef.current) poseRef.current.close();
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, []);

  useEffect(() => {
    currentSetRef.current = currentSet;
  }, [currentSet]);

  const stopSession = useCallback(async (autoComplete = false) => {
    if (stopRef.current) return;
    stopRef.current = true; activeRef.current = false;
    cameraRef.current?.stop();
    if (timerRef.current) clearInterval(timerRef.current);
    setRunning(false); setSessionComplete(true);

    const pF = postureFramesRef.current;
    const postSucc = pF.total > 0 ? Math.round((pF.good / pF.total) * 100) : 0;
    const fF = formFramesRef.current;
    const formSucc = fF.total > 0 ? Math.round(fF.sum / fF.total) : 0;
    const combined = Math.round((postSucc * 0.4 + formSucc * 0.6));

    const finalData = {
      exerciseName: exercise?.name, successScore: combined, formMatchScore: formSucc, postureScore: postSucc,
      repsCompleted: repCountRef.current, setsCompleted: currentSetRef.current, duration: sessionTimeRef.current, autoCompleted: autoComplete,
      formChecks: Object.values(checkAccumulatorRef.current).map(acc => ({
        name: acc.name, avgScore: Math.round(acc.totalScore / acc.totalFrames), idealAngle: acc.idealAngle,
        avgAngle: Math.round(acc.totalAngle / acc.totalFrames), accuracy: Math.round((acc.goodFrames / acc.totalFrames) * 100), tip: acc.tip
      })),
      scoreTimeline: formHistoryRef.current
    };

    try { await API.post('/progress/exercise', finalData); } catch (e) { console.error(e); }
    if (onShowAnalysis) onShowAnalysis(finalData);
  }, [exercise, currentSet, repCount, onShowAnalysis]);

  const handleRetry = () => {
    setSessionComplete(false);
    setRunning(false);
    setRepCount(0);
    setCurrentSet(1);
    setPostureStatus('unknown');
    setPostureScore(0);
    setPostureIssues([]);
    setFormAnalysis({ score: 0, checks: [], overallStatus: 'unknown' });
    startSession();
  };

  const handleEnd = () => {
    if (onEndSession) onEndSession();
    else if (onBack) onBack();
  };

  const startSession = async () => {
    setLoading(true);
    repCounterRef.current.reset();
    repCountRef.current = 0;
    holdSecondsRef.current = 0;
    lastHoldTimeRef.current = null;
    setRepCount(0); setCurrentSet(1); sessionTimeRef.current = 0; setRemainingTime(180);
    currentSetRef.current = 1;
    lastTimelineSecondRef.current = -1;
    postureFramesRef.current = { total: 0, good: 0, valid: 0 };
    formFramesRef.current = { total: 0, sum: 0 };
    formHistoryRef.current = []; checkAccumulatorRef.current = {};
    stopRef.current = false; activeRef.current = true;

    try {
      const { Pose, POSE_CONNECTIONS } = await import('@mediapipe/pose');
      const { Camera } = await import('@mediapipe/camera_utils');
      const { drawConnectors, drawLandmarks } = await import('@mediapipe/drawing_utils');

      const pose = new Pose({ locateFile: (file) => `https://cdn.jsdelivr.net/npm/@mediapipe/pose@0.5/${file}` });
      pose.setOptions({ modelComplexity: 1, smoothLandmarks: true, minDetectionConfidence: 0.5, minTrackingConfidence: 0.5 });

      pose.onResults((results) => {
        if (!activeRef.current || stopRef.current || !results.poseLandmarks) return;
        const canvas = canvasRef.current; const ctx = canvas.getContext('2d');
        canvas.width = videoRef.current.videoWidth; canvas.height = videoRef.current.videoHeight;
        ctx.save(); ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.drawImage(results.image, 0, 0, canvas.width, canvas.height);

        drawConnectors(ctx, results.poseLandmarks, POSE_CONNECTIONS, { color: 'rgba(14,165,233,0.5)', lineWidth: 2 });
        const landmarks = results.poseLandmarks;
        const lmarks = landmarks.map(l => ({ x: l.x, y: l.y, z: l.z, visibility: l.visibility }));

        // Posture & Form Logic
        const posture = analyzePosture(lmarks);
        setPostureStatus(posture.status); setPostureScore(posture.score);
        postureFramesRef.current.total++; if (posture.status === 'good') postureFramesRef.current.good++;

        const form = analyzeForm(lmarks, config.formChecks);
        setFormAnalysis(form);
        formFramesRef.current.total++; formFramesRef.current.sum += form.score;

        // Rep Counting
        const joints = (landmarks[config.altJoints?.[0]]?.visibility > landmarks[config.joints[0]]?.visibility) ? config.altJoints : config.joints;
        const [iA, iB, iC] = joints;
        if (landmarks[iA] && landmarks[iB] && landmarks[iC]) {
          const angle = RepCounter.calcAngle(landmarks[iA], landmarks[iB], landmarks[iC]);
          const inRange = angle >= (config.strictMin || 80) && angle <= (config.strictMax || 180);
          const isValid = inRange && landmarks[iB].visibility > 0.4 && (posture.status !== 'bad');

          if (config.staticHold) {
            const now = performance.now();
            if (isValid) {
              if (lastHoldTimeRef.current == null) lastHoldTimeRef.current = now;
              const dt = (now - lastHoldTimeRef.current) / 1000;
              lastHoldTimeRef.current = now;
              holdSecondsRef.current += dt;
              const targetSeconds = Math.max(3, Number(config.holdSecondsPerRep) || 10);
              if (holdSecondsRef.current >= targetSeconds) {
                const add = Math.floor(holdSecondsRef.current / targetSeconds);
                holdSecondsRef.current -= add * targetSeconds;
                repCountRef.current += add;
                setRepCount(repCountRef.current);
              }
            } else {
              lastHoldTimeRef.current = now;
              holdSecondsRef.current = 0;
            }
          } else {
            const nextCount = repCounterRef.current.update(angle, config.downThreshold, config.upThreshold, isValid);
            repCountRef.current = nextCount;
            setRepCount(nextCount);
          }

          if (repCountRef.current >= totalReps) {
            if (currentSetRef.current >= totalSets) {
              setCurrentSet(totalSets);
              stopSession(true);
              return;
            }

            currentSetRef.current += 1;
            setCurrentSet(currentSetRef.current);
            repCounterRef.current.reset();
            repCountRef.current = 0;
            holdSecondsRef.current = 0;
            lastHoldTimeRef.current = null;
            setRepCount(0);
          }

          // Data Collection
          if (sessionTimeRef.current !== lastTimelineSecondRef.current) {
            lastTimelineSecondRef.current = sessionTimeRef.current;
            const hasValidForm = form.checks.some(c => c.angle !== null);
            const hasValidPosture = posture.status !== 'unknown';
            const timelineFormScore = hasValidForm ? form.score : null;
            const timelinePostureScore = hasValidPosture ? posture.score : null;
            const combinedScore = (timelineFormScore != null && timelinePostureScore != null)
              ? Math.round(timelinePostureScore * 0.4 + timelineFormScore * 0.6)
              : null;
            formHistoryRef.current.push({
              time: sessionTimeRef.current,
              score: timelineFormScore,
              postureScore: timelinePostureScore,
              combinedScore,
              repCount: repCountRef.current
            });
            form.checks.forEach(c => {
              if (!checkAccumulatorRef.current[c.name]) checkAccumulatorRef.current[c.name] = { ...c, totalScore: 0, totalAngle: 0, goodFrames: 0, totalFrames: 0 };
              const acc = checkAccumulatorRef.current[c.name];
              acc.totalScore += c.matchPct; acc.totalAngle += (c.angle || 0); acc.totalFrames++;
              if (c.status === 'perfect' || c.status === 'good') acc.goodFrames++;
            });
          }
        }
        ctx.restore();
      });

      const camera = new Camera(videoRef.current, {
        onFrame: async () => { if (activeRef.current && !stopRef.current) await pose.send({ image: videoRef.current }); },
        width: 640, height: 480
      });
      cameraRef.current = camera; await camera.start();
      setRunning(true); setLoading(false);
      timerRef.current = setInterval(() => {
        sessionTimeRef.current++;
        setRemainingTime(t => { if (t <= 1) { stopSession(true); return 0; } return t - 1; });
      }, 1000);
    } catch (e) { console.error(e); setLoading(false); }
  };

  const fmt = (s) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
  const statusStyle = STATUS_STYLES[postureStatus];
  const formStyle = FORM_STATUS_STYLES[formAnalysis.overallStatus] || FORM_STATUS_STYLES.unknown;

  return (
    <div className="max-w-7xl mx-auto px-4 py-6">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-4">
          <button onClick={onBack} className="w-10 h-10 bg-slate-800 rounded-xl flex items-center justify-center text-slate-400">←</button>
          <div><h2 className="text-2xl text-white font-display">{exercise?.name}</h2><p className="text-slate-400 text-sm">Real-time AI form tracking</p></div>
        </div>
        {embedUrl && (
          <button onClick={() => setShowRefVideo(!showRefVideo)} className={`px-4 py-2 rounded-lg text-sm font-medium border transition-all ${showRefVideo ? 'bg-red-500/10 border-red-500/30 text-red-400' : 'bg-slate-800 border-slate-700 text-slate-400'}`}>
            {showRefVideo ? 'Hide Reference' : 'Show Reference'}
          </button>
        )}
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-4">
          <div className={`grid gap-3 ${running && showRefVideo && embedUrl ? 'grid-cols-2' : 'grid-cols-1'}`}>
            <div className="relative bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden aspect-video">
              <video ref={videoRef} className="absolute inset-0 w-full h-full object-cover" muted playsInline />
              <canvas ref={canvasRef} className="absolute inset-0 w-full h-full object-cover" />
              {!running && !sessionComplete && (
                <div className="absolute inset-0 flex flex-col items-center justify-center bg-slate-950/80">
                  <p className="text-white mb-6 text-center">{exercise?.sets} sets × {exercise?.reps} reps<br/><span className="text-slate-500 text-xs">{config.label} tracking</span></p>
                  <button onClick={startSession} disabled={loading} className="bg-emerald-500 px-8 py-3 rounded-xl font-medium text-white disabled:opacity-50">
                    {loading ? 'Initializing AI...' : '▶ Start Exercise'}
                  </button>
                </div>
              )}
              {sessionComplete && !running && (
                <div className="absolute inset-0 flex flex-col items-center justify-center bg-slate-950/85">
                  <p className="text-white text-lg font-medium mb-4">Session complete</p>
                  <div className="flex gap-3">
                    <button onClick={handleRetry} className="bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 px-6 py-2.5 rounded-lg text-sm font-medium">
                      ↻ Retry Session
                    </button>
                    <button onClick={handleEnd} className="bg-emerald-500 hover:bg-emerald-400 text-white px-6 py-2.5 rounded-lg text-sm font-medium">
                      View Analytics
                    </button>
                  </div>
                </div>
              )}
              {running && (
                <>
                  <div className={`absolute top-3 left-3 border rounded-lg px-3 py-1.5 text-xs font-medium ${statusStyle.bg} ${statusStyle.color}`}>{statusStyle.label}</div>
                  <div className="absolute top-3 right-3 bg-slate-950/80 border border-slate-700 rounded-lg px-2.5 py-1.5 text-white text-sm font-medium">{fmt(remainingTime)}</div>
                  <div className="absolute bottom-3 left-3 right-3 bg-slate-950/85 rounded-lg p-3 border border-slate-800">
                    <div className="flex justify-between text-white mb-1.5"><span className="text-xl font-display">{repCount} <small className="text-slate-500">/ {totalReps}</small></span><span className="text-sky-400 text-xs font-medium">Set {currentSet}/{totalSets}</span></div>
                    <div className="h-1.5 bg-slate-800 rounded-full overflow-hidden"><div className="h-full bg-gradient-to-r from-emerald-500 to-sky-500 transition-all" style={{ width: `${(repCount/totalReps)*100}%` }} /></div>
                  </div>
                </>
              )}
            </div>
            {running && showRefVideo && embedUrl && (
              <div className="relative bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden aspect-video">
                <iframe src={embedUrl} className="absolute inset-0 w-full h-full" frameBorder="0" allowFullScreen />
                <div className="absolute top-2 left-2 bg-red-600 rounded px-2 py-0.5 text-[10px] text-white uppercase font-bold">Reference</div>
              </div>
            )}
          </div>
          {running && <button onClick={() => stopSession(false)} className="w-full bg-red-500/10 border border-red-500/30 text-red-400 py-3 rounded-xl font-medium">■ End Session</button>}
        </div>

        <div className="space-y-4">
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-5">
            <div className="flex justify-between mb-4"><h3 className="text-white font-medium">Form Match</h3><span className={`text-xs font-medium ${formStyle.color}`}>{formAnalysis.score}%</span></div>
            <div className="space-y-2">
              {formAnalysis.checks.map((check, i) => {
                const st = FORM_STATUS_STYLES[check.status] || FORM_STATUS_STYLES.unknown;
                return (
                  <div key={i} className="bg-slate-800/40 rounded-lg p-2.5">
                    <div className="flex justify-between mb-1"><span className="text-slate-300 text-xs">{check.name}</span><span className={`text-[10px] ${st.color}`}>{st.icon}</span></div>
                    <div className="h-1 bg-slate-700 rounded-full overflow-hidden"><div className={`h-full ${st.barColor}`} style={{ width: `${check.matchPct}%` }} /></div>
                    {(check.status === 'adjust' || check.status === 'wrong') && <p className={`${st.color} text-[10px] mt-1 italic`}>💡 {check.tip}</p>}
                  </div>
                );
              })}
            </div>
          </div>
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-5">
            <h3 className="text-white font-medium mb-3">Posture</h3>
            <div className="flex items-center gap-4">
               <div className={`text-2xl font-display ${statusStyle.color}`}>{postureScore}%</div>
               <div className="text-slate-500 text-xs leading-tight">{postureIssues.length ? postureIssues.join(', ') : 'Ideal alignment detected'}</div>
            </div>
          </div>
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 text-slate-400 text-sm space-y-2">
            <h3 className="text-white font-medium">Instructions</h3>
            {exercise?.instructions?.map((ins, i) => <div key={i} className="flex gap-2"><span>{i+1}.</span><p>{ins}</p></div>)}
          </div>
        </div>
      </div>
    </div>
  );
}