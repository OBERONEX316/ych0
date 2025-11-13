const jwt = require('jsonwebtoken');
const User = require('../models/User');

// JWT验证中间件
const protect = async (req, res, next) => {
  try {
    let token;

    // 从Authorization头获取token
    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
      token = req.headers.authorization.split(' ')[1];
    }
    // 从cookie获取token
    else if (req.cookies && req.cookies.token) {
      token = req.cookies.token;
    }

    if (!token) {
      return res.status(401).json({
        success: false,
        error: '请登录以访问此资源'
      });
    }

    try {
      // 验证token
      const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key');

      // 获取用户信息（排除密码字段）
      const user = await User.findById(decoded.userId).select('-password');

      if (!user) {
        return res.status(401).json({
          success: false,
          error: '用户不存在，token无效'
        });
      }

      // 检查用户账户状态
      if (!user.isActive) {
        return res.status(401).json({
          success: false,
          error: '账户已被禁用'
        });
      }

      // 将用户信息添加到请求对象
      req.user = user;
      next();
    } catch (jwtError) {
      return res.status(401).json({
        success: false,
        error: 'Token无效或已过期'
      });
    }
  } catch (error) {
    console.error('认证中间件错误:', error);
    res.status(500).json({
      success: false,
      error: '服务器认证错误',
      message: error.message
    });
  }
};

// 权限控制中间件
const authorize = (...roles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        error: '请先登录'
      });
    }

    if (!roles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        error: `权限不足，需要 ${roles.join(', ')} 角色`
      });
    }

    next();
  };
};

// 可选认证中间件（不强制要求登录）
const optionalAuth = async (req, res, next) => {
  try {
    let token;

    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
      token = req.headers.authorization.split(' ')[1];
    } else if (req.cookies && req.cookies.token) {
      token = req.cookies.token;
    }

    if (token) {
      try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key');
        const user = await User.findById(decoded.userId).select('-password');
        
        if (user && user.isActive) {
          req.user = user;
        }
      } catch (error) {
        // Token无效，但不阻止请求
        console.log('可选认证：Token无效');
      }
    }

    next();
  } catch (error) {
    console.error('可选认证中间件错误:', error);
    next(); // 继续执行，不阻止请求
  }
};

module.exports = {
  protect,
  authorize,
  optionalAuth
};