const express = require('express');
const {
  handleFileUpload,
  handleMultipleFileUpload,
  deleteUploadedFile
} = require('../controllers/uploadController');
const { protect } = require('../middleware/auth');

const router = express.Router();

// 所有路由都需要认�?router.use(protect);

// 单文件上�?router.post('/single', handleFileUpload);

// 多文件上�?router.post('/multiple', handleMultipleFileUpload);

// 删除上传的文�?router.delete('/:filename', deleteUploadedFile);

module.exports = router;
