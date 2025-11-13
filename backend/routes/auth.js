const express = require('express');
const router = express.Router();

// 导入认证控制器
const {
  register,
  login,
  logout,
  getMe,
  updateMe,
  updatePassword
} = require('../controllers/authController');

// 导入认证中间件
const { protect } = require('../middleware/auth');

// 公开路由
router.post('/register', register);
router.post('/login', login);
router.get('/logout', logout);

// 需要认证的路由
router.get('/me', protect, getMe);
router.put('/me', protect, updateMe);
router.put('/password', protect, updatePassword);

module.exports = router;
