require('dotenv').config();

// ====== FIX DNS FOR MONGODB ATLAS SRV LOOKUP ======
const dns = require('dns');
const dnsServers = process.env.DNS_SERVERS
  ? process.env.DNS_SERVERS.split(',').map(s => s.trim())
  : ['8.8.8.8', '8.8.4.4'];
try {
  dns.setServers(dnsServers);
  console.log('🌐 DNS servers set to:', dnsServers);
} catch (err) {
  console.warn('⚠️ Could not set DNS servers:', err.message);
}

const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');
const http = require('http');
const WebSocket = require('ws');
const path = require('path');

// ====== GLOBAL ERROR HANDLERS ======
process.on('uncaughtException', (err) => {
  console.error('💥 Uncaught Exception:', err);
});

process.on('unhandledRejection', (err) => {
  console.error('💥 Unhandled Rejection:', err);
});

// ====== IMPORT ROUTES ======
const authRoutes = require('./routes/auth');
const exerciseRoutes = require('./routes/exercises');
const angleRoutes = require('./routes/angles');
const aiRoutes = require('./routes/ai');
const progressRoutes = require('./routes/progress');
const chatRoutes = require('./routes/chat');
const dietPlanRoutes = require('./routes/dietPlan');
const uploadReportRoutes = require('./routes/uploadReport');
const feedbackRoutes = require('./routes/feedback');

// ====== INIT APP ======
const app = express();
const server = http.createServer(app);

// ====== MIDDLEWARE ======
app.use(cors({
  origin: 'http://localhost:3000',
  credentials: true
}));
app.use(express.json({ limit: '10mb' }));

// ====== STATIC FILES (uploaded reports) ======
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// ====== HEALTH CHECK ======
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', time: new Date() });
});

// ====== ROUTES ======
app.use('/api/auth', authRoutes);
app.use('/api/ai', aiRoutes);
app.use('/api/exercises', exerciseRoutes);
app.use('/api/angles', angleRoutes);
app.use('/api/progress', progressRoutes);
app.use('/api/chat', chatRoutes);
app.use('/api/diet-plan', dietPlanRoutes);
app.use('/api/upload-report', uploadReportRoutes);
app.use('/api/feedback', feedbackRoutes);

// ====== WEBSOCKET (POSTURE TRACKING) ======
const wss = new WebSocket.Server({ server, path: '/ws/posture' });

wss.on('connection', (ws) => {
  console.log('🟢 WebSocket client connected');

  ws.on('message', (data) => {
    try {
      const parsed = JSON.parse(data);
      const feedback = analyzePosture(parsed.landmarks);
      ws.send(JSON.stringify(feedback));
    } catch (err) {
      ws.send(JSON.stringify({ error: 'Invalid data format' }));
    }
  });

  ws.on('close', () => {
    console.log('🔴 WebSocket client disconnected');
  });
});

// ====== POSTURE ANALYSIS ======
function analyzePosture(landmarks) {
  if (!landmarks || landmarks.length < 25) {
    return {
      status: 'unknown',
      message: 'Position yourself properly',
      score: 0
    };
  }

  const leftShoulder = landmarks[11];
  const rightShoulder = landmarks[12];
  const leftHip = landmarks[23];
  const rightHip = landmarks[24];
  const nose = landmarks[0];

  if (!leftShoulder || !rightShoulder || !leftHip || !rightHip) {
    return {
      status: 'unknown',
      message: 'Full body not visible',
      score: 0
    };
  }

  let score = 100;
  const issues = [];

  // Shoulder alignment
  if (Math.abs(leftShoulder.y - rightShoulder.y) > 0.05) {
    issues.push('Shoulders uneven');
    score -= 25;
  }

  // Hip alignment
  if (Math.abs(leftHip.y - rightHip.y) > 0.05) {
    issues.push('Hips uneven');
    score -= 25;
  }

  // Spine alignment
  const shoulderCenterX = (leftShoulder.x + rightShoulder.x) / 2;
  const hipCenterX = (leftHip.x + rightHip.x) / 2;
  if (Math.abs(shoulderCenterX - hipCenterX) > 0.08) {
    issues.push('Spine not straight');
    score -= 30;
  }

  // Head posture
  const shoulderCenterY = (leftShoulder.y + rightShoulder.y) / 2;
  if (nose && nose.y > shoulderCenterY - 0.1) {
    issues.push('Head too forward');
    score -= 20;
  }

  score = Math.max(score, 0);

  if (score >= 80) {
    return { status: 'good', message: 'Great posture!', score, issues: [] };
  } else if (score >= 50) {
    return { status: 'warning', message: 'Minor issues', score, issues };
  } else {
    return { status: 'bad', message: 'Fix posture!', score, issues };
  }
}

// ====== DATABASE CONNECTION + SERVER START ======
const uri = process.env.MONGODB_URI;

if (!uri) {
  console.error('❌ MONGODB_URI missing in .env');
  process.exit(1);
}

mongoose.connect(uri, {
  serverSelectionTimeoutMS: 5000,
})
  .then(() => {
    console.log('✅ MongoDB connected');

    const PORT = process.env.PORT || 9000;
    server.listen(PORT, () => {
      console.log(`🚀 Server running on port ${PORT}`);
    });
  })
  .catch((err) => {
    console.error('❌ MongoDB connection failed:', err.message);
    process.exit(1);
  });