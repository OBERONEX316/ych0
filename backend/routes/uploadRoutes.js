const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { protect } = require('../middleware/auth');
const uploadController = require('../controllers/uploadController');

const router = express.Router();

const destDir = path.join(__dirname, '..', 'uploads', 'avatars');
if (!fs.existsSync(destDir)) fs.mkdirSync(destDir, { recursive: true });

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, destDir);
  },
  filename: function (req, file, cb) {
    const ext = path.extname(file.originalname) || '.png';
    const base = path.basename(file.originalname, ext).replace(/[^a-zA-Z0-9_-]/g, '_');
    cb(null, `${Date.now()}_${base}${ext}`);
  }
});

function fileFilter(req, file, cb) {
  const allowed = ['image/png', 'image/jpeg', 'image/gif', 'image/webp'];
  if (allowed.includes(file.mimetype)) cb(null, true); else cb(new Error('不支持的文件类型'));
}

const upload = multer({ storage, fileFilter, limits: { fileSize: 10 * 1024 * 1024 } });

router.post('/single', protect, upload.single('file'), uploadController.single);

module.exports = router;
