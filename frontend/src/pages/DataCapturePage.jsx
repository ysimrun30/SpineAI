import React, { useCallback, useEffect, useRef, useState } from 'react';

const REQUIRED_INDICES = [11, 12, 13, 14, 15, 16, 23, 24];
const EXERCISE_OPTIONS = [
  'bird_dog',
  'bridge',
  'cat_cow',
  'chest_stretch',
  'dead_bug',
  'deadlift',
  'diaphragmatic_breathing',
  'heel_slides',
  'knee_to_chest',
  'pelvic_tilt',
  'plank',
  'row_exercise',
  'seated_march',
  'side_plank',
  'side_stretch',
  'squat',
  'thoracic_extension',
  'thoracic_rotation'
];

function safeName(input) {
  const cleaned = String(input || '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '');
  return cleaned || 'pose_capture';
}

function toCsvValue(value) {
  const str = String(value ?? '');
  if (/[,"\n]/.test(str)) return `"${str.replace(/"/g, '""')}"`;
  return str;
}

export default function DataCapturePage() {
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const poseRef = useRef(null);
  const cameraRef = useRef(null);
  const recordsRef = useRef([]);
  const lastCaptureRef = useRef(0);
  const stopRef = useRef(false);
  const recordingRef = useRef(false);
  const exerciseRef = useRef('');
  const labelRef = useRef('');
  const captureIntervalRef = useRef(200);
  const minVisibilityRef = useRef(0.2);

  const [running, setRunning] = useState(false);
  const [recording, setRecording] = useState(false);
  const [exerciseSelect, setExerciseSelect] = useState('side_stretch');
  const [customExerciseName, setCustomExerciseName] = useState('');
  const [label, setLabel] = useState('correct');
  const [captureIntervalMs, setCaptureIntervalMs] = useState(200);
  const [minVisibility, setMinVisibility] = useState(0.1);
  const [minVisibleCount, setMinVisibleCount] = useState(6);
  const [visibleCount, setVisibleCount] = useState(0);
  const [recordCount, setRecordCount] = useState(0);
  const [droppedCount, setDroppedCount] = useState(0);
  const [status, setStatus] = useState('');

  // Keep latest UI state available to the capture loop.
  useEffect(() => { recordingRef.current = recording; }, [recording]);
  const effectiveExerciseName = exerciseSelect === '__custom__'
    ? customExerciseName
    : exerciseSelect;

  useEffect(() => { exerciseRef.current = effectiveExerciseName; }, [effectiveExerciseName]);
  useEffect(() => { labelRef.current = label; }, [label]);
  useEffect(() => { captureIntervalRef.current = captureIntervalMs; }, [captureIntervalMs]);
  useEffect(() => { minVisibilityRef.current = minVisibility; }, [minVisibility]);

  const safeClosePose = () => {
    const pose = poseRef.current;
    if (!pose) return;
    try {
      pose.close();
    } catch (e) {
      // Ignore double-close errors
    }
    poseRef.current = null;
  };

  const stopCamera = useCallback(() => {
    stopRef.current = true;
    setRecording(false);
    cameraRef.current?.stop();
    safeClosePose();
    setRunning(false);
  }, []);

  const resetRecords = () => {
    recordsRef.current = [];
    lastCaptureRef.current = 0;
    setRecordCount(0);
    setDroppedCount(0);
  };

  const buildRecord = (landmarks) => {
    const record = {
      exercise: exerciseRef.current.trim(),
      label: labelRef.current.trim()
    };
    for (let i = 0; i < 33; i += 1) {
      const lm = landmarks[i] || { x: 0, y: 0, z: 0, visibility: 0 };
      record[`lm${i}_x`] = lm.x;
      record[`lm${i}_y`] = lm.y;
      record[`lm${i}_z`] = lm.z;
      record[`lm${i}_v`] = lm.visibility ?? 0;
    }
    return record;
  };

  const maybeCapture = (landmarks) => {
    if (!recordingRef.current) return;
    if (!exerciseRef.current.trim() || !labelRef.current.trim()) {
      setStatus('Set exercise name and label before recording.');
      return;
    }

    const now = Date.now();
    if (now - lastCaptureRef.current < captureIntervalRef.current) return;

    const visibleNow = REQUIRED_INDICES.filter(
      (idx) => (landmarks[idx]?.visibility ?? 0) >= minVisibilityRef.current
    ).length;
    setVisibleCount(visibleNow);

    if (visibleNow < minVisibleCount) {
      setDroppedCount((c) => c + 1);
      return;
    }

    lastCaptureRef.current = now;
    recordsRef.current.push(buildRecord(landmarks));
    setRecordCount(recordsRef.current.length);
  };

  const startCamera = useCallback(async () => {
    if (running) return;
    setStatus('Starting camera...');
    stopRef.current = false;

    try {
      const { Pose } = await import('@mediapipe/pose');
      const { Camera } = await import('@mediapipe/camera_utils');
      const { drawConnectors, drawLandmarks } = await import('@mediapipe/drawing_utils');
      const { POSE_CONNECTIONS } = await import('@mediapipe/pose');

      const pose = new Pose({
        locateFile: (file) => `https://cdn.jsdelivr.net/npm/@mediapipe/pose@0.5/${file}`
      });

      pose.setOptions({
        modelComplexity: 1,
        smoothLandmarks: true,
        enableSegmentation: false,
        minDetectionConfidence: 0.5,
        minTrackingConfidence: 0.5
      });

      pose.onResults((results) => {
        if (stopRef.current) return;
        const canvas = canvasRef.current;
        const video = videoRef.current;
        if (!canvas || !video) return;

        const ctx = canvas.getContext('2d');
        canvas.width = video.videoWidth || 640;
        canvas.height = video.videoHeight || 480;

        ctx.save();
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.drawImage(results.image, 0, 0, canvas.width, canvas.height);

        if (results.poseLandmarks) {
          drawConnectors(ctx, results.poseLandmarks, POSE_CONNECTIONS, {
            color: 'rgba(14,165,233,0.5)', lineWidth: 2
          });
          drawLandmarks(ctx, results.poseLandmarks, {
            color: 'rgba(14,165,233,0.8)', lineWidth: 1, radius: 3
          });
          maybeCapture(results.poseLandmarks);
        }

        ctx.restore();
      });

      poseRef.current = pose;

      const camera = new Camera(videoRef.current, {
        onFrame: async () => {
          if (stopRef.current || !poseRef.current) return;
          await pose.send({ image: videoRef.current });
        },
        width: 640,
        height: 480
      });

      cameraRef.current = camera;
      await camera.start();
      setRunning(true);
      setStatus('Camera running.');
    } catch (err) {
      console.error('Capture init failed:', err);
      setStatus('Failed to start camera.');
      setRunning(false);
    }
  }, [running]);

  const exportJson = () => {
    const data = recordsRef.current;
    if (!data.length) return;

    const fileName = `${safeName(effectiveExerciseName)}_${Date.now()}.json`;
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = fileName;
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  };

  const exportCsv = () => {
    const data = recordsRef.current;
    if (!data.length) return;

    const header = ['exercise', 'label'];
    for (let i = 0; i < 33; i += 1) {
      header.push(`lm${i}_x`, `lm${i}_y`, `lm${i}_z`, `lm${i}_v`);
    }

    const rows = [header.join(',')];
    data.forEach((row) => {
      const values = header.map((h) => toCsvValue(row[h]));
      rows.push(values.join(','));
    });

    const fileName = `${safeName(effectiveExerciseName)}_${Date.now()}.csv`;
    const blob = new Blob([rows.join('\n')], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = fileName;
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  };

  useEffect(() => () => stopCamera(), [stopCamera]);

  return (
    <div className="max-w-6xl mx-auto px-4 py-6">
      <div className="flex items-center justify-between gap-4 mb-6">
        <div>
          <h2 className="font-display text-2xl text-white">Data Capture</h2>
          <p className="text-slate-400 text-sm">Webcam capture with labeled JSON/CSV export.</p>
        </div>
        <div className="text-right">
          <p className="text-slate-400 text-xs">Status</p>
          <p className="text-white text-sm">{status || (running ? 'Ready' : 'Idle')}</p>
        </div>
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <div className="relative bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden aspect-video">
            <video ref={videoRef} className="absolute inset-0 w-full h-full object-cover" muted playsInline />
            <canvas ref={canvasRef} className="absolute inset-0 w-full h-full object-cover" />

            {!running && (
              <div className="absolute inset-0 flex flex-col items-center justify-center bg-slate-950/80">
                <p className="text-white text-lg font-medium mb-2">Camera Off</p>
                <button
                  onClick={startCamera}
                  className="bg-emerald-500 hover:bg-emerald-400 text-white px-6 py-3 rounded-xl font-medium transition-all"
                >
                  Start Camera
                </button>
              </div>
            )}

            {recording && (
              <div className="absolute top-4 left-4 bg-red-500/20 border border-red-500/40 text-red-300 text-xs px-3 py-1 rounded-lg">
                REC
              </div>
            )}
          </div>

          <div className="mt-4 flex flex-wrap gap-3">
            {!recording ? (
              <button
                onClick={() => setRecording(true)}
                disabled={!running}
                className="bg-sky-500/20 border border-sky-500/30 text-sky-300 px-4 py-2 rounded-lg text-sm font-medium disabled:opacity-50"
              >
                Start Recording
              </button>
            ) : (
              <button
                onClick={() => setRecording(false)}
                className="bg-amber-500/20 border border-amber-500/30 text-amber-300 px-4 py-2 rounded-lg text-sm font-medium"
              >
                Stop Recording
              </button>
            )}
            <button
              onClick={stopCamera}
              className="bg-slate-800 hover:bg-slate-700 text-slate-300 px-4 py-2 rounded-lg text-sm font-medium"
            >
              Stop Camera
            </button>
            <button
              onClick={resetRecords}
              className="bg-slate-800 hover:bg-slate-700 text-slate-300 px-4 py-2 rounded-lg text-sm font-medium"
            >
              Clear Records
            </button>
          </div>
        </div>

        <div className="space-y-4">
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-5">
            <h3 className="text-white font-medium mb-3">Labels</h3>
            <label className="block text-slate-400 text-xs mb-1">Exercise name</label>
            <select
              value={exerciseSelect}
              onChange={(e) => setExerciseSelect(e.target.value)}
              className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white"
            >
              {EXERCISE_OPTIONS.map((name) => (
                <option key={name} value={name}>{name}</option>
              ))}
              <option value="__custom__">Custom...</option>
            </select>
            {exerciseSelect === '__custom__' && (
              <input
                value={customExerciseName}
                onChange={(e) => setCustomExerciseName(e.target.value)}
                className="w-full mt-2 bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white"
                placeholder="type exercise label"
              />
            )}
            <p className="text-slate-500 text-xs mt-2">Select from the list or choose Custom.</p>

            <label className="block text-slate-400 text-xs mt-3 mb-1">Label</label>
            <input
              value={label}
              onChange={(e) => setLabel(e.target.value)}
              className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white"
              placeholder="correct"
            />
          </div>

          <div className="bg-slate-900 border border-slate-800 rounded-xl p-5">
            <h3 className="text-white font-medium mb-3">Capture Settings</h3>
            <label className="block text-slate-400 text-xs mb-1">Capture interval (ms)</label>
            <input
              type="number"
              min="50"
              max="2000"
              value={captureIntervalMs}
              onChange={(e) => setCaptureIntervalMs(Number(e.target.value || 0))}
              className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white"
            />

            <label className="block text-slate-400 text-xs mt-3 mb-1">Min visibility (0-1)</label>
            <input
              type="number"
              step="0.05"
              min="0"
              max="1"
              value={minVisibility}
              onChange={(e) => setMinVisibility(Number(e.target.value || 0))}
              className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white"
            />
            <label className="block text-slate-400 text-xs mt-3 mb-1">Min visible landmarks (0-8)</label>
            <input
              type="number"
              min="0"
              max={REQUIRED_INDICES.length}
              value={minVisibleCount}
              onChange={(e) => setMinVisibleCount(Number(e.target.value || 0))}
              className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white"
            />
            <p className="text-slate-500 text-xs mt-2">Frames below this are skipped.</p>
          </div>

          <div className="bg-slate-900 border border-slate-800 rounded-xl p-5">
            <h3 className="text-white font-medium mb-3">Summary</h3>
            <div className="grid grid-cols-2 gap-2 text-center">
              <div className="bg-slate-800/50 rounded-lg p-2">
                <p className="text-slate-500 text-xs">Captured</p>
                <p className="text-emerald-400 text-sm font-medium">{recordCount}</p>
              </div>
              <div className="bg-slate-800/50 rounded-lg p-2">
                <p className="text-slate-500 text-xs">Dropped</p>
                <p className="text-amber-400 text-sm font-medium">{droppedCount}</p>
              </div>
              <div className="bg-slate-800/50 rounded-lg p-2 col-span-2">
                <p className="text-slate-500 text-xs">Visible landmarks</p>
                <p className="text-sky-400 text-sm font-medium">{visibleCount} / {REQUIRED_INDICES.length}</p>
              </div>
            </div>

            <div className="mt-4 flex flex-col gap-2">
              <button
                onClick={exportJson}
                disabled={!recordCount}
                className="bg-emerald-500/20 border border-emerald-500/30 text-emerald-300 px-3 py-2 rounded-lg text-sm font-medium disabled:opacity-50"
              >
                Export JSON
              </button>
              <button
                onClick={exportCsv}
                disabled={!recordCount}
                className="bg-sky-500/20 border border-sky-500/30 text-sky-300 px-3 py-2 rounded-lg text-sm font-medium disabled:opacity-50"
              >
                Export CSV
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
