const jwt = require('jsonwebtoken');
const User = require('../models/User');

// 生成JWT Token
const generateToken = (userId) => {
  return jwt.sign(
    { userId },
    process.env.JWT_SECRET || 'your-secret-key',
    { expiresIn: process.env.JWT_EXPIRE || '7d' }
  );
};

// 发送Token响应
const sendTokenResponse = (user, statusCode, res) => {
  const token = generateToken(user._id);
  
  const options = {
    expires: new Date(
      Date.now() + (process.env.JWT_COOKIE_EXPIRE || 7) * 24 * 60 * 60 * 1000
    ),
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production'
  };

  res.status(statusCode)
    .cookie('token', token, options)
    .json({
      success: true,
      token,
      data: {
        user: {
          id: user._id,
          username: user.username,
          email: user.email,
          firstName: user.firstName,
          lastName: user.lastName,
          avatar: user.avatar,
          role: user.role,
          isVerified: user.isVerified
        }
      }
    });
};

// 用户注册
const register = async (req, res) => {
  try {
    const { username, email, password, firstName, lastName } = req.body;

    // 验证必填字段
    if (!username || !email || !password) {
      return res.status(400).json({
        success: false,
        error: '请提供用户名、邮箱和密码'
      });
    }

    // 检查用户是否已存在
    const existingUser = await User.findOne({
      $or: [{ email }, { username }]
    });

    if (existingUser) {
      return res.status(400).json({
        success: false,
        error: existingUser.email === email ? '邮箱已被注册' : '用户名已被使用'
      });
    }

    // 创建新用户
    const user = await User.create({
      username,
      email,
      password,
      firstName,
      lastName
    });

    sendTokenResponse(user, 201, res);
    // 欢迎通知（异步）
    try {
      const { sendWelcomeNotification } = require('../utils/notificationUtils');
      await sendWelcomeNotification(user._id);
    } catch (e) {
      console.warn('欢迎通知失败:', e.message);
    }
  } catch (error) {
    console.error('注册失败:', error);
    
    if (error.name === 'ValidationError') {
      const errors = Object.values(error.errors).map(err => err.message);
      return res.status(400).json({
        success: false,
        error: '验证失败',
        details: errors
      });
    }
    
    res.status(500).json({
      success: false,
      error: '注册失败',
      message: error.message
    });
  }
};

// 用户登录
const login = async (req, res) => {
  try {
    const { identifier, password } = req.body;

    // 验证必填字段
    if (!identifier || !password) {
      return res.status(400).json({
        success: false,
        error: '请提供邮箱/用户名和密码'
      });
    }

    // 查找用户（包含密码字段）
    const user = await User.findOne({
      $or: [
        { email: identifier.toLowerCase() },
        { username: identifier }
      ]
    }).select('+password');

    if (!user) {
      return res.status(401).json({
        success: false,
        error: '无效的登录凭证'
      });
    }

    // 检查账户状态
    if (!user.isActive) {
      return res.status(401).json({
        success: false,
        error: '账户已被禁用'
      });
    }

    // 验证密码
    const isPasswordValid = await user.comparePassword(password);
    if (!isPasswordValid) {
      return res.status(401).json({
        success: false,
        error: '密码错误'
      });
    }

    // 更新最后登录时间
    await user.updateLastLogin();

    sendTokenResponse(user, 200, res);
  } catch (error) {
    console.error('登录失败:', error);
    res.status(500).json({
      success: false,
      error: '登录失败',
      message: error.message
    });
  }
};

// 用户登出
const logout = (req, res) => {
  res.cookie('token', 'none', {
    expires: new Date(Date.now() + 10 * 1000),
    httpOnly: true
  });

  res.status(200).json({
    success: true,
    message: '登出成功'
  });
};

// 获取当前用户信息
const getMe = async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    
    res.status(200).json({
      success: true,
      data: {
        user: {
          id: user._id,
          username: user.username,
          email: user.email,
          firstName: user.firstName,
          lastName: user.lastName,
          avatar: user.avatar,
          phone: user.phone,
          role: user.role,
          isVerified: user.isVerified,
          addresses: user.addresses,
          preferences: user.preferences,
          createdAt: user.createdAt,
          lastLogin: user.lastLogin
        }
      }
    });
  } catch (error) {
    console.error('获取用户信息失败:', error);
    res.status(500).json({
      success: false,
      error: '获取用户信息失败',
      message: error.message
    });
  }
};

// 更新用户信息
const updateMe = async (req, res) => {
  try {
    const { firstName, lastName, phone, avatar, preferences } = req.body;
    
    const updateData = {};
    if (firstName !== undefined) updateData.firstName = firstName;
    if (lastName !== undefined) updateData.lastName = lastName;
    if (phone !== undefined) updateData.phone = phone;
    if (avatar !== undefined) updateData.avatar = avatar;
    if (preferences !== undefined) updateData.preferences = preferences;

    const user = await User.findByIdAndUpdate(
      req.user.id,
      updateData,
      { new: true, runValidators: true }
    );

    res.status(200).json({
      success: true,
      data: {
        user: {
          id: user._id,
          username: user.username,
          email: user.email,
          firstName: user.firstName,
          lastName: user.lastName,
          avatar: user.avatar,
          phone: user.phone,
          preferences: user.preferences
        }
      },
      message: '用户信息更新成功'
    });
  } catch (error) {
    console.error('更新用户信息失败:', error);
    
    if (error.name === 'ValidationError') {
      const errors = Object.values(error.errors).map(err => err.message);
      return res.status(400).json({
        success: false,
        error: '验证失败',
        details: errors
      });
    }
    
    res.status(500).json({
      success: false,
      error: '更新用户信息失败',
      message: error.message
    });
  }
};

// 修改密码
const updatePassword = async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;

    if (!currentPassword || !newPassword) {
      return res.status(400).json({
        success: false,
        error: '请提供当前密码和新密码'
      });
    }

    const user = await User.findById(req.user.id).select('+password');

    // 验证当前密码
    const isPasswordValid = await user.comparePassword(currentPassword);
    if (!isPasswordValid) {
      return res.status(401).json({
        success: false,
        error: '当前密码错误'
      });
    }

    // 更新密码
    user.password = newPassword;
    await user.save();

    sendTokenResponse(user, 200, res);
  } catch (error) {
    console.error('修改密码失败:', error);
    
    if (error.name === 'ValidationError') {
      const errors = Object.values(error.errors).map(err => err.message);
      return res.status(400).json({
        success: false,
        error: '密码验证失败',
        details: errors
      });
    }
    
    res.status(500).json({
      success: false,
      error: '修改密码失败',
      message: error.message
    });
  }
};

module.exports = {
  register,
  login,
  logout,
  getMe,
  updateMe,
  updatePassword
};