const express = require('express');
const router = express.Router();
const {
  getUserSettings,
  updateUserSettings,
  getSupportedLanguages,
  updateUserLanguage
} = require('../controllers/settingsController');
const { protect } = require('../middleware/auth');

// 获取用户设置
router.get('/', protect, getUserSettings);

// 更新用户设置
router.put('/', protect, updateUserSettings);

// 获取支持的语言列表
router.get('/languages', getSupportedLanguages);

// 更新用户语言偏好
router.put('/language', protect, updateUserLanguage);

module.exports = router;
