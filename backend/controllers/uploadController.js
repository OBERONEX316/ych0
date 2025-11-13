const fs = require('fs');
const path = require('path');

exports.ensureDir = (dir) => {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
};

exports.single = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, error: '未接收到文件' });
    }
    const rel = `/uploads/avatars/${req.file.filename}`;
    return res.json({ success: true, file: { url: rel, size: req.file.size, original: req.file.originalname } });
  } catch (e) {
    res.status(500).json({ success: false, error: e.message });
  }
};
