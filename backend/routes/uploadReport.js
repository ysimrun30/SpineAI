const router = require('express').Router();
const auth = require('../middleware/auth');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const User = require('../models/User');

// Ensure uploads directory exists
const uploadsDir = path.join(__dirname, '..', 'uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

// Multer configuration
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadsDir),
  filename: (req, file, cb) => {
    const uniqueName = `${req.userId}_${Date.now()}_${file.originalname.replace(/\s+/g, '_')}`;
    cb(null, uniqueName);
  }
});

const fileFilter = (req, file, cb) => {
  const allowed = ['.pdf', '.jpg', '.jpeg', '.png', '.webp', '.dicom'];
  const ext = path.extname(file.originalname).toLowerCase();
  if (allowed.includes(ext)) cb(null, true);
  else cb(new Error(`File type ${ext} not allowed. Allowed: ${allowed.join(', ')}`));
};

const upload = multer({
  storage,
  fileFilter,
  limits: { fileSize: 10 * 1024 * 1024 } // 10MB
});

// POST /api/upload-report — upload medical report
router.post('/', auth, upload.single('report'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'No file uploaded' });

    const ext = path.extname(req.file.originalname).toLowerCase();
    const fileTypeMap = {
      '.pdf': 'pdf', '.jpg': 'image', '.jpeg': 'image',
      '.png': 'image', '.webp': 'image', '.dicom': 'dicom'
    };

    const reportData = {
      filename: req.file.filename,
      originalName: req.file.originalname,
      uploadDate: new Date(),
      fileType: fileTypeMap[ext] || 'other',
      fileSize: req.file.size,
      category: req.body.category || 'other'
    };

    const user = await User.findByIdAndUpdate(
      req.userId,
      { $push: { reports: reportData } },
      { new: true }
    ).select('reports');

    res.json({
      message: 'Report uploaded successfully',
      report: user.reports[user.reports.length - 1],
      totalReports: user.reports.length
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/upload-report — list user's reports
router.get('/', auth, async (req, res) => {
  try {
    const user = await User.findById(req.userId).select('reports');
    res.json(user?.reports || []);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE /api/upload-report/:reportId — delete a report
router.delete('/:reportId', auth, async (req, res) => {
  try {
    const user = await User.findById(req.userId).select('reports');
    const report = user.reports.id(req.params.reportId);

    if (!report) return res.status(404).json({ error: 'Report not found' });

    // Delete file from disk
    const filePath = path.join(uploadsDir, report.filename);
    if (fs.existsSync(filePath)) fs.unlinkSync(filePath);

    // Remove from user's reports array
    user.reports.pull(req.params.reportId);
    await user.save();

    res.json({ message: 'Report deleted', totalReports: user.reports.length });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
