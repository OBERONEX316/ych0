const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const cookieParser = require('cookie-parser');
require('dotenv').config();

// 数据库连接
const connectDB = require('./config/database');

// 聊天会话分配服务
const chatAssignmentService = require('./services/chatAssignmentService');

// AI推荐服务
const aiRecommendationService = require('./services/aiRecommendationService');
const odooSyncService = require('./services/odooSyncService');

const app = express();
const server = http.createServer(app);
const PORT = process.env.PORT || 5000;
const path = require('path');

// 配置Socket.io
const rawOrigins = process.env.FRONTEND_URL;
const allowedOrigins = rawOrigins ? rawOrigins.split(',').map(s => s.trim()).filter(Boolean) : ['http://localhost:3000', 'http://localhost:3001'];
const io = new Server(server, {
  cors: {
    origin: allowedOrigins,
    methods: ['GET', 'POST'],
    credentials: true
  }
});

// 中间件
app.use(cors({
  origin: (origin, callback) => {
    if (!origin) return callback(null, true);
    try {
      const host = new URL(origin).hostname;
      if (
        allowedOrigins.includes(origin) ||
        /\.vercel\.app$/.test(host) ||
        /\.pages\.dev$/.test(host)
      ) return callback(null, true);
    } catch (e) {}
    callback(new Error('Not allowed by CORS'));
  },
  credentials: true
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

// 静态资源：上传文件访问
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));
// 上传接口
app.use('/api/upload', require('./routes/uploadRoutes'));

// 国际化中间件
const { i18nMiddleware } = require('./middleware/i18n');
app.use(i18nMiddleware);

// 用户行为追踪中间件
const userBehaviorTracker = require('./middleware/userBehaviorTracker');
app.use(userBehaviorTracker.middleware());

// 健康检查路由
app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'OK', 
    message: req.t('common.success'),
    timestamp: new Date().toISOString(),
    language: req.getLocale()
  });
});

// 商品路由
app.use('/api/products', require('./routes/products'));

// 认证路由
app.use('/api/auth', require('./routes/auth'));

// 购物车路由
app.use('/api/cart', require('./routes/cart'));

// 订单路由
app.use('/api/orders', require('./routes/orders'));

// 用户路由（心愿单等）
app.use('/api/users', require('./routes/users'));

// 管理员用户路由
app.use('/api/users/admin', require('./routes/adminUsers'));

// 评价路由
app.use('/api/reviews', require('./routes/reviews'));

// 聊天路由
app.use('/api/chat', require('./routes/chat'));

// 优惠券路由
app.use('/api/coupons', require('./routes/coupons'));

// 库存预警路由
app.use('/api/stock-alerts', require('./routes/stockAlerts'));

// 推荐系统路由
app.use('/api/recommendations', require('./routes/recommendations'));

// 分析路由
app.use('/api/analytics', require('./routes/analytics'));

// 用户行为追踪路由
app.use('/api/user-activities', require('./routes/userActivity'));

// 个性化促销路由
app.use('/api/promotions', require('./routes/personalizedPromotion'));

// 会员等级路由
// app.use('/api/loyalty', require('./routes/loyaltyRoutes'));

// 社交路由
app.use('/api/social', require('./routes/socialRoutes'));

// 社交分享路由
app.use('/api/social/share', require('./routes/socialShareRoutes'));

// 支付路由
app.use('/api/payment', require('./routes/paymentRoutes'));
// 购物车路由
app.use('/api/cart', require('./routes/cart'));

// 物流配送路由
app.use('/api/shipping', require('./routes/shippingRoutes'));

// 退款路由
app.use('/api/refunds', require('./routes/refundRoutes'));

// 设置路由
app.use('/api/settings', require('./routes/settingsRoutes'));

// 通知路由（若加载失败不阻塞服务）
try {
  app.use('/api/notifications', require('./routes/notificationRoutes'));
} catch (e) {
  console.warn('⚠️ 通知路由未加载:', e.message);
}

// Odoo Webhook 路由
app.use('/api/webhooks/odoo', require('./routes/odooWebhookRoutes'));

// 数据导出路由
app.use('/api/export', require('./routes/exportRoutes'));

// 报表路由
app.use('/api/reports', require('./routes/reportRoutes'));

// 秒杀活动路由
app.use('/api/flash-sales', require('./routes/flashSales'));

// 团购活动路由
app.use('/api/group-buying', require('./routes/groupBuying'));

// 会员等级路由
app.use('/api/membership', require('./routes/membershipRoutes'));

// 用户行为分析路由
app.use('/api/user-behavior-analytics', require('./routes/userBehaviorAnalytics'));

// 推荐奖励路由
app.use('/api/referral', require('./routes/referralRoutes'));

// 销售预测路由
app.use('/api/sales-predictions', require('./routes/salesPredictionRoutes'));

// 库存优化路由
app.use('/api/inventory-optimization', require('./routes/inventoryOptimizationRoutes'));

// A/B 测试路由
app.use('/api/experiments', require('./routes/experiments'));
// 报表读取（Postgres）
app.use('/api/reports', require('./routes/reportingPg'));
// 生命周期分析与分层优惠
app.use('/api/lifecycle', require('./routes/lifecycleRoutes'));

// 文件上传路由
app.use('/api/upload', require('./routes/upload'));

// Socket.io连接处理
io.on('connection', (socket) => {
  console.log(`🔗 用户连接: ${socket.id}`);
  
  // 用户加入自己的房间
  socket.on('join-user-room', (userId) => {
    socket.join(`user-${userId}`);
    console.log(`👤 用户 ${userId} 加入房间: user-${userId}`);
  });
  
  // 客服加入客服房间
  socket.on('join-support-room', async (data) => {
    try {
      const { userId } = data;
      
      // 添加客服到可用列表
      const success = await chatAssignmentService.addAgent(userId, socket.id);
      
      if (success) {
        socket.join('support-room');
        console.log(`🛠️  客服 ${userId} 加入支持房间: ${socket.id}`);
        
        // 通知客服当前系统状态
        socket.emit('support-status', {
          status: 'online',
          systemStatus: chatAssignmentService.getStatus()
        });
      } else {
        socket.emit('error', { message: '加入客服房间失败：权限不足或用户不存在' });
      }
    } catch (error) {
      console.error('加入客服房间错误:', error);
      socket.emit('error', { message: '加入客服房间失败' });
    }
  });
  
  // 加入特定会话房间
  socket.on('join-session', (sessionId) => {
    socket.join(`session-${sessionId}`);
    console.log(`💬 加入会话房间: session-${sessionId}`);
  });
  
  // 发送消息
  socket.on('send-message', async (data) => {
    try {
      const { sessionId, content, sender } = data;
      
      // 广播消息给会话中的所有用户
      socket.to(`session-${sessionId}`).emit('new-message', {
        ...data,
        timestamp: new Date().toISOString()
      });
      
      console.log(`📨 消息发送到会话 ${sessionId}: ${content.substring(0, 50)}...`);
      
      // 通知客服房间有新消息（如果是用户发送的）
      if (sender.role === 'user') {
        socket.to('support-room').emit('user-message', {
          sessionId,
          message: content,
          sender: sender.username,
          timestamp: new Date().toISOString()
        });
      }
      
    } catch (error) {
      console.error('Socket消息发送错误:', error);
      socket.emit('error', { message: '发送消息失败' });
    }
  });
  
  // 用户输入中
  socket.on('typing', (data) => {
    const { sessionId, userId, isTyping } = data;
    socket.to(`session-${sessionId}`).emit('user-typing', {
      userId,
      isTyping
    });
  });
  
  // 消息已读
  socket.on('mark-read', (data) => {
    const { sessionId, messageIds, userId } = data;
    socket.to(`session-${sessionId}`).emit('messages-read', {
      messageIds,
      userId
    });
  });
  
  // 撤回消息
  socket.on('recall-message', async (data) => {
    try {
      const { messageId, sessionId, reason } = data;
      
      // 广播撤回消息通知
      socket.to(`session-${sessionId}`).emit('message-recalled', {
        messageId,
        sessionId,
        reason,
        timestamp: new Date().toISOString()
      });
      
      console.log(`🗑️ 消息撤回: ${messageId} in session ${sessionId}`);
      
    } catch (error) {
      console.error('Socket消息撤回错误:', error);
      socket.emit('error', { message: '撤回消息失败' });
    }
  });
  
  // 编辑消息
  socket.on('edit-message', async (data) => {
    try {
      const { messageId, sessionId, content, richContent } = data;
      
      // 广播编辑消息通知
      socket.to(`session-${sessionId}`).emit('message-edited', {
        messageId,
        sessionId,
        content,
        richContent,
        timestamp: new Date().toISOString()
      });
      
      console.log(`✏️ 消息编辑: ${messageId} in session ${sessionId}`);
      
    } catch (error) {
      console.error('Socket消息编辑错误:', error);
      socket.emit('error', { message: '编辑消息失败' });
    }
  });
  
  // 断开连接
  socket.on('disconnect', async () => {
    console.log(`🔌 用户断开连接: ${socket.id}`);
    
    // 从可用客服列表中移除
    for (const [userId, agent] of chatAssignmentService.availableAgents) {
      if (agent.socketId === socket.id) {
        await chatAssignmentService.removeAgent(userId);
        break;
      }
    }
  });
});

// 将io实例附加到app上，方便其他地方使用
app.set('io', io);

// 错误处理中间件
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ 
    error: req.t('errors.server_error'),
    message: process.env.NODE_ENV === 'development' ? err.message : req.t('errors.server_error')
  });
});

// 404 处理
app.use((req, res) => {
  res.status(404).json({ 
    error: req.t('errors.not_found'),
    message: req.t('errors.not_found')
  });
});

// 启动服务器
const startServer = async () => {
  try {
    // 连接数据库
    await connectDB();
    
    // 初始化推荐服务（异步，不阻塞服务器启动）
    aiRecommendationService.initialize().catch(error => {
      console.warn('⚠️ AI推荐服务初始化警告:', error.message);
    });
    
    server.listen(PORT, () => {
      console.log(`🚀 服务器运行在端口 ${PORT}`);
      console.log(`📍 本地访问: http://localhost:${PORT}`);
      console.log(`📊 健康检查: http://localhost:${PORT}/api/health`);
      console.log(`🗄️  MongoDB: ${process.env.MONGODB_URI || 'mongodb://localhost:27017/ecommerce'}`);
      console.log(`💬 WebSocket 已启用`);
      console.log(`🤖 AI推荐服务: ${aiRecommendationService.isModelLoaded ? '✅ 已加载' : '⏳ 初始化中'}`);
    });
    // 启动 Odoo 状态同步（可选）
    try { odooSyncService.start(app); } catch (e) { console.warn('⚠️ Odoo同步启动失败:', e.message); }
  } catch (error) {
    console.error('❌ 服务器启动失败:', error.message);
    process.exit(1);
  }
};

startServer();

module.exports = app;
app.post('/api/analytics/ab/significance', async (req, res) => {
  try {
    const axios = require('axios');
    const r = await axios.post(process.env.ANALYTICS_URL || 'http://localhost:8000/api/ab/significance', req.body, { timeout: 2000 });
    res.json({ success: true, data: r.data });
  } catch (e) {
    const a_success = parseInt(req.body?.a_success || 0);
    const a_total = parseInt(req.body?.a_total || 1);
    const b_success = parseInt(req.body?.b_success || 0);
    const b_total = parseInt(req.body?.b_total || 1);
    const pa = a_success / a_total;
    const pb = b_success / b_total;
    const p = (a_success + b_success) / (a_total + b_total);
    const se = Math.sqrt(p * (1 - p) * (1 / a_total + 1 / b_total));
    const z = se > 0 ? (pb - pa) / se : 0;
    const p_value = 2 * (1 - 0.5 * (1 + erf(Math.abs(z) / Math.sqrt(2))));
    res.json({ success: true, data: { z, p_value, lift: pb - pa, fallback: true } });
  }
});

function erf(x) {
  const a1 = 0.254829592, a2 = -0.284496736, a3 = 1.421413741, a4 = -1.453152027, a5 = 1.061405429, p = 0.3275911;
  const sign = x < 0 ? -1 : 1; const absx = Math.abs(x);
  const t = 1.0 / (1.0 + p * absx);
  const y = 1.0 - (((((a5 * t + a4) * t) + a3) * t + a2) * t + a1) * t * Math.exp(-absx * absx);
  return sign * y;
}
