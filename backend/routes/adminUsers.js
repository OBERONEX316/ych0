const express = require('express');
const router = express.Router();

// 导入用户控制器
const {
  getAllUsers,
  getUser,
  updateUserStatus,
  updateUserRole,
  deleteUser
} = require('../controllers/userController');

// 导入认证和授权中间件
const { protect, authorize } = require('../middleware/auth');

// 所有路由都需要认证和授权（仅限管理员）
router.use(protect);
router.use(authorize('admin'));

// GET /api/users/admin/all - 获取所有用户（管理员）
router.get('/admin/all', getAllUsers);

// GET /api/users/:id - 获取单个用户详情（管理员）
router.get('/:id', getUser);

// PATCH /api/users/:id/status - 更新用户状态（管理员）
router.patch('/:id/status', updateUserStatus);

// PATCH /api/users/:id/role - 更新用户角色（管理员）
router.patch('/:id/role', updateUserRole);

// DELETE /api/users/:id - 删除用户（管理员）
router.delete('/:id', deleteUser);

module.exports = router;
