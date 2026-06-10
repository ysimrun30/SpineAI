const fs = require('fs');
const path = require('path');
const router = require('express').Router();

let cachedRanges = null;

function normalizeLabel(label) {
  return String(label || '').toLowerCase().replace(/[_\s-]+/g, ' ').trim();
}

function buildRanges() {
  if (cachedRanges) return cachedRanges;

  const csvPath = path.join(__dirname, '..', '..', 'exercise_angles.csv');
  const data = fs.readFileSync(csvPath, 'utf8');
  const lines = data.split(/\r?\n/).filter(Boolean);
  const header = lines.shift().split(',');

  const idx = (name) => header.indexOf(name);
  const iLabel = idx('Label');
  const iSide = idx('Side');
  const iShoulder = idx('Shoulder_Angle');
  const iElbow = idx('Elbow_Angle');
  const iHip = idx('Hip_Angle');
  const iKnee = idx('Knee_Angle');
  const iAnkle = idx('Ankle_Angle');

  const ranges = {};

  lines.forEach((line) => {
    const cols = line.split(',');
    const label = normalizeLabel(cols[iLabel]);
    if (!label) return;

    const angles = {
      shoulder: parseFloat(cols[iShoulder]),
      elbow: parseFloat(cols[iElbow]),
      hip: parseFloat(cols[iHip]),
      knee: parseFloat(cols[iKnee]),
      ankle: parseFloat(cols[iAnkle])
    };

    if (!ranges[label]) {
      ranges[label] = {
        label: cols[iLabel],
        side: cols[iSide] || 'left',
        count: 0,
        angles: {
          shoulder: { min: angles.shoulder, max: angles.shoulder },
          elbow: { min: angles.elbow, max: angles.elbow },
          hip: { min: angles.hip, max: angles.hip },
          knee: { min: angles.knee, max: angles.knee },
          ankle: { min: angles.ankle, max: angles.ankle }
        }
      };
    } else {
      const a = ranges[label].angles;
      a.shoulder.min = Math.min(a.shoulder.min, angles.shoulder);
      a.shoulder.max = Math.max(a.shoulder.max, angles.shoulder);
      a.elbow.min = Math.min(a.elbow.min, angles.elbow);
      a.elbow.max = Math.max(a.elbow.max, angles.elbow);
      a.hip.min = Math.min(a.hip.min, angles.hip);
      a.hip.max = Math.max(a.hip.max, angles.hip);
      a.knee.min = Math.min(a.knee.min, angles.knee);
      a.knee.max = Math.max(a.knee.max, angles.knee);
      a.ankle.min = Math.min(a.ankle.min, angles.ankle);
      a.ankle.max = Math.max(a.ankle.max, angles.ankle);
    }
    ranges[label].count += 1;
  });

  cachedRanges = ranges;
  return ranges;
}

router.get('/ranges', (req, res) => {
  try {
    const ranges = buildRanges();
    res.json(ranges);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
