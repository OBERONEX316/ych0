const Order = require('../models/Order');
const axios = require('axios');
const crypto = require('crypto');
const qs = require('qs');
const { sendPaymentSuccessNotification } = require('../utils/notificationUtils');
const PAYMENT_CONFIG = require('../config/payment.config');

// 支付状态枚举
const PAYMENT_STATUS = {
  PENDING: 'pending',
  PAID: 'paid',
  FAILED: 'failed',
  REFUNDED: 'refunded',
  CANCELLED: 'cancelled'
};

// 支付方式枚举
const PAYMENT_METHODS = {
  ALIPAY: 'alipay',
  WECHAT: 'wechat',
  STRIPE: 'stripe',
  BANK_TRANSFER: 'bank'
};

// 创建支付订单
const createPayment = async (req, res) => {
  try {
    const { orderId, paymentMethod } = req.body;
    const { userId } = req.user;

    // 验证订单
    const order = await Order.findOne({ _id: orderId, user: userId });
    if (!order) {
      return res.status(404).json({
        success: false,
        message: '订单不存在'
      });
    }

    if (order.isPaid) {
      return res.status(400).json({
        success: false,
        message: '订单已支付'
      });
    }

    // 根据支付方式创建支付请求
    let paymentData;
    
    switch (paymentMethod) {
      case 'alipay':
        paymentData = await createAlipayPayment(order);
        break;
      case 'wechat':
        paymentData = await createWechatPayment(order);
        break;
      case 'stripe':
        paymentData = await createStripePayment(order);
        break;
      default:
        return res.status(400).json({
          success: false,
          message: '不支持的支付方式'
        });
    }

    // 更新订单支付方式
    order.paymentMethod = paymentMethod;
    await order.save();

    res.json({
      success: true,
      data: {
        orderId: order._id,
        paymentMethod,
        paymentData,
        amount: order.finalPrice
      }
    });

  } catch (error) {
    console.error('创建支付失败:', error);
    res.status(500).json({
      success: false,
      message: '创建支付失败',
      error: error.message
    });
  }
};

// 创建支付宝支付（支持真实和模拟环境）
const createAlipayPayment = async (order) => {
  const config = PAYMENT_CONFIG.alipay;
  const timestamp = new Date().getTime();
  
  // 检查是否为真实环境配置
  const isRealEnvironment = config.appId && config.appId !== 'mock_alipay_app_id' &&
                           config.merchantPrivateKey && config.merchantPrivateKey !== 'mock_private_key';
  
  if (isRealEnvironment) {
    // 真实支付宝支付集成
    try {
      const bizContent = {
        subject: `订单支付-${order.orderNumber}`,
        out_trade_no: order.orderNumber,
        total_amount: order.finalPrice.toFixed(2),
        product_code: 'FAST_INSTANT_TRADE_PAY'
      };
      
      const params = {
        app_id: config.appId,
        method: 'alipay.trade.page.pay',
        charset: config.charset,
        sign_type: config.signType,
        timestamp: new Date().toISOString().replace(/\..+/, ''),
        version: config.version,
        biz_content: JSON.stringify(bizContent),
        return_url: config.returnUrl,
        notify_url: config.notifyUrl
      };
      
      // 生成签名（实际项目中需要使用支付宝SDK进行签名）
      const sign = generateAlipaySignature(params, config.merchantPrivateKey);
      params.sign = sign;
      
      return {
        tradeNo: order.orderNumber,
        paymentUrl: `${config.gateway}?${qs.stringify(params)}`,
        qrCode: generateQRCode(`${config.gateway}?${qs.stringify(params)}`),
        expiresAt: new Date(Date.now() + 30 * 60 * 1000)
      };
      
    } catch (error) {
      console.error('支付宝支付创建失败:', error);
      throw new Error('支付宝支付创建失败');
    }
  } else {
    // 模拟环境
    return {
      tradeNo: `ALIPAY${timestamp}${order.orderNumber}`,
      qrCode: `data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAwIiBoZWlnaHQ9IjIwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iMjAwIiBoZWlnaHQ9IjIwMCIgZmlsbD0iI2ZmZiIvPjx0ZXh0IHg9IjEwMCIgeT0iMTAwIiB0ZXh0LWFuY2hvcj0ibWlkZGxlIiBmb250LXNpemU9IjEyIiBmaWxsPSIjMDAwIj7ms6jmhI/kuIDkuKrmlbDlrZc8L3RleHQ+PC9zdmc+`,
      paymentUrl: `https://mock.alipay.com/pay?order=${order.orderNumber}&amount=${order.finalPrice}`,
      expiresAt: new Date(Date.now() + 30 * 60 * 1000)
    };
  }
};

// 生成支付宝签名（示例实现）
const generateAlipaySignature = (params, privateKey) => {
  // 实际项目中应使用支付宝官方SDK进行签名
  const signContent = Object.keys(params)
    .filter(key => params[key] !== '' && key !== 'sign')
    .sort()
    .map(key => `${key}=${params[key]}`)
    .join('&');
  
  return crypto.createSign('RSA-SHA256')
    .update(signContent, 'utf8')
    .sign(privateKey, 'base64');
};

// 创建微信支付（支持真实和模拟环境）
const createWechatPayment = async (order) => {
  const config = PAYMENT_CONFIG.wechat;
  const timestamp = new Date().getTime();
  
  // 检查是否为真实环境配置
  const isRealEnvironment = config.appId && config.appId !== 'mock_wechat_app_id' &&
                           config.mchId && config.mchId !== 'mock_mch_id';
  
  if (isRealEnvironment) {
    // 真实微信支付集成
    try {
      const nonceStr = crypto.randomBytes(16).toString('hex');
      const params = {
        appid: config.appId,
        mch_id: config.mchId,
        nonce_str: nonceStr,
        body: `订单支付-${order.orderNumber}`,
        out_trade_no: order.orderNumber,
        total_fee: Math.round(order.finalPrice * 100), // 转换为分
        spbill_create_ip: req.ip || '127.0.0.1',
        notify_url: config.notifyUrl,
        trade_type: config.tradeType,
        product_id: order._id.toString()
      };
      
      // 生成签名
      params.sign = generateWechatSignature(params, config.apiKey);
      
      // 调用微信支付API（实际项目中应使用微信支付SDK）
      const response = await axios.post(config.gateway, 
        `<xml>${Object.entries(params).map(([key, value]) => `<${key}>${value}</${key}>`).join('')}</xml>`,
        { headers: { 'Content-Type': 'application/xml' } }
      );
      
      // 解析响应
      const result = parseWechatResponse(response.data);
      
      return {
        prepayId: result.prepay_id,
        qrCode: generateQRCode(result.code_url),
        paymentUrl: result.code_url,
        expiresAt: new Date(Date.now() + 30 * 60 * 1000)
      };
      
    } catch (error) {
      console.error('微信支付创建失败:', error);
      throw new Error('微信支付创建失败');
    }
  } else {
    // 模拟环境
    return {
      prepayId: `WX${timestamp}${order.orderNumber}`,
      qrCode: `data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAwIiBoZWlnaHQ9IjIwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iMjAwIiBoZWlnaHQ9IjIwMCIgZmlsbD0iI2ZmZiIvPjx0ZXh0IHg9IjEwMCIgeT0iMTAwIiB0ZXh0LWFuY2hvcj0ibWlkZGxlIiBmb250LXNpemU9IjEyIiBmaWxsPSIjMDAwIj7nmb3oibLkuIDkuKrmlbDlrZc8L3RleHQ+PC9zdmc+`,
      paymentUrl: `https://mock.wechatpay.com/pay?order=${order.orderNumber}&amount=${order.finalPrice}`,
      expiresAt: new Date(Date.now() + 30 * 60 * 1000)
    };
  }
};

// 创建Stripe支付（国际支付）
const createStripePayment = async (order) => {
  const config = PAYMENT_CONFIG.stripe;
  
  // 检查是否为真实环境配置
  const isRealEnvironment = config.secretKey && config.secretKey !== 'sk_test_mock';
  
  if (isRealEnvironment) {
    try {
      // 实际项目中应使用Stripe SDK
      const stripe = require('stripe')(config.secretKey);
      
      const session = await stripe.checkout.sessions.create({
        payment_method_types: ['card'],
        line_items: [
          {
            price_data: {
              currency: 'cny',
              product_data: {
                name: `订单 ${order.orderNumber}`,
                description: `商品订单支付`
              },
              unit_amount: Math.round(order.finalPrice * 100),
            },
            quantity: 1,
          },
        ],
        mode: 'payment',
        success_url: `${process.env.FRONTEND_URL || 'http://localhost:3000'}/payment/success?session_id={CHECKOUT_SESSION_ID}`,
        cancel_url: `${process.env.FRONTEND_URL || 'http://localhost:3000'}/payment/cancel`,
        client_reference_id: order.orderNumber,
        metadata: {
          order_id: order._id.toString(),
          user_id: order.user.toString()
        }
      });
      
      return {
        sessionId: session.id,
        paymentUrl: session.url,
        expiresAt: new Date(session.expires_at * 1000)
      };
      
    } catch (error) {
      console.error('Stripe支付创建失败:', error);
      throw new Error('Stripe支付创建失败');
    }
  } else {
    // 模拟环境
    return {
      sessionId: `stripe_${Date.now()}_${order.orderNumber}`,
      paymentUrl: 'https://checkout.stripe.com/mock',
      expiresAt: new Date(Date.now() + 30 * 60 * 1000)
    };
  }
};

// 生成微信支付签名
const generateWechatSignature = (params, apiKey) => {
  const stringA = Object.keys(params)
    .filter(key => params[key] !== '' && key !== 'sign')
    .sort()
    .map(key => `${key}=${params[key]}`)
    .join('&');
  
  const stringSignTemp = `${stringA}&key=${apiKey}`;
  return crypto.createHash('md5').update(stringSignTemp, 'utf8').digest('hex').toUpperCase();
};

// 解析微信支付响应
const parseWechatResponse = (xmlData) => {
  // 简化实现，实际项目中应使用XML解析器
  const result = {};
  const matches = xmlData.match(/<([^>]+)>([^<]+)<\/\1>/g);
  if (matches) {
    matches.forEach(match => {
      const key = match.match(/<([^>]+)>/)[1];
      const value = match.match(/>(.*?)<\//)[1];
      result[key] = value;
    });
  }
  return result;
};

// 生成二维码（简化实现）
const generateQRCode = (url) => {
  // 实际项目中应使用二维码生成库
  return `data:image/svg+xml;base64,${Buffer.from(`<svg width="200" height="200" xmlns="http://www.w3.org/2000/svg"><rect width="200" height="200" fill="white"/><text x="100" y="100" text-anchor="middle" font-size="12" fill="black">支付二维码</text></svg>`).toString('base64')}`;
};

// 查询支付状态
const checkPaymentStatus = async (req, res) => {
  try {
    const { orderId } = req.params;
    const { userId } = req.user;

    const order = await Order.findOne({ _id: orderId, user: userId });
    if (!order) {
      return res.status(404).json({
        success: false,
        message: '订单不存在'
      });
    }

    let paymentStatus = order.isPaid ? 'paid' : 'pending';
    
    // 如果是处理中的状态，根据支付方式查询真实状态
    if (paymentStatus === 'pending') {
      switch (order.paymentMethod) {
        case 'alipay':
          // 支付宝状态查询逻辑
          paymentStatus = await queryAlipayStatus(order);
          break;
        case 'wechat':
          // 微信支付状态查询逻辑
          paymentStatus = await queryWechatStatus(order);
          break;
        case 'stripe':
          // Stripe支付状态查询逻辑
          paymentStatus = await queryStripeStatus(order);
          break;
        default:
          // 默认模拟查询
          paymentStatus = await simulatePaymentStatus(order);
      }
      
      // 更新订单状态
      if (paymentStatus === 'paid') {
        order.isPaid = true;
        order.paidAt = new Date();
        order.status = 'confirmed';
        await order.save();
      }
    }

    res.json({
      success: true,
      data: {
        orderId: order._id,
        orderNumber: order.orderNumber,
        status: paymentStatus,
        paidAt: order.paidAt,
        amount: order.finalPrice
      }
    });

  } catch (error) {
    console.error('查询支付状态失败:', error);
    res.status(500).json({
      success: false,
      message: '查询支付状态失败',
      error: error.message
    });
  }
};

// 查询支付宝支付状态
const queryAlipayStatus = async (order) => {
  const config = PAYMENT_CONFIG.alipay;
  const isRealEnvironment = config.appId && config.appId !== 'mock_alipay_app_id';
  
  if (isRealEnvironment) {
    try {
      // 实际项目中应调用支付宝查询接口
      // 这里简化实现
      return Math.random() < 0.8 ? 'paid' : 'pending';
    } catch (error) {
      console.error('支付宝状态查询失败:', error);
      return 'pending';
    }
  } else {
    return await simulatePaymentStatus(order);
  }
};

// 查询微信支付状态
const queryWechatStatus = async (order) => {
  const config = PAYMENT_CONFIG.wechat;
  const isRealEnvironment = config.appId && config.appId !== 'mock_wechat_app_id';
  
  if (isRealEnvironment) {
    try {
      // 实际项目中应调用微信支付查询接口
      // 这里简化实现
      return Math.random() < 0.8 ? 'paid' : 'pending';
    } catch (error) {
      console.error('微信支付状态查询失败:', error);
      return 'pending';
    }
  } else {
    return await simulatePaymentStatus(order);
  }
};

// 查询Stripe支付状态
const queryStripeStatus = async (order) => {
  const config = PAYMENT_CONFIG.stripe;
  const isRealEnvironment = config.secretKey && config.secretKey !== 'sk_test_mock';
  
  if (isRealEnvironment) {
    try {
      // 实际项目中应使用Stripe SDK查询支付状态
      const stripe = require('stripe')(config.secretKey);
      const sessionId = order.paymentData?.sessionId;
      
      if (sessionId) {
        const session = await stripe.checkout.sessions.retrieve(sessionId);
        return session.payment_status === 'paid' ? 'paid' : 'pending';
      }
      return 'pending';
    } catch (error) {
      console.error('Stripe状态查询失败:', error);
      return 'pending';
    }
  } else {
    return await simulatePaymentStatus(order);
  }
};

// 模拟支付状态查询
const simulatePaymentStatus = async (order) => {
  // 模拟支付成功概率
  if (Math.random() > 0.7 && !order.isPaid) {
    return 'paid';
  }
  
  return 'pending';
};

// 支付回调处理（支付宝）
const handleAlipayNotify = async (req, res) => {
  try {
    const params = req.method === 'GET' ? req.query : req.body;
    const config = PAYMENT_CONFIG.alipay;
    
    // 检查是否为真实环境
    const isRealEnvironment = config.appId && config.appId !== 'mock_alipay_app_id';
    
    if (isRealEnvironment) {
      // 真实环境：验证支付宝签名
      const signVerified = verifyAlipaySignature(params, config.alipayPublicKey);
      if (!signVerified) {
        return res.status(400).send('fail');
      }
    }
    
    const { out_trade_no, trade_status, total_amount } = params;
    
    // 查找订单
    const order = await Order.findOne({ orderNumber: out_trade_no });
    if (!order) {
      return res.status(404).send('fail');
    }

    if (trade_status === 'TRADE_SUCCESS' || trade_status === 'TRADE_FINISHED') {
      // 支付成功
      order.isPaid = true;
      order.paidAt = new Date();
      order.status = 'confirmed';
      order.paymentResult = {
        id: params.trade_no,
        status: trade_status,
        update_time: params.gmt_payment,
        email_address: params.buyer_logon_id
      };
      
      await order.save();
      
      // 这里可以触发支付成功的事件或通知
      console.log(`💰 订单支付成功: ${order.orderNumber}, 金额: ${total_amount}`);
    } else if (trade_status === 'TRADE_CLOSED') {
      // 交易关闭
      order.paymentStatus = 'failed';
      await order.save();
    }

    res.send('success');

  } catch (error) {
    console.error('支付宝回调处理失败:', error);
    res.status(500).send('fail');
  }
};

// 验证支付宝签名
const verifyAlipaySignature = (params, publicKey) => {
  try {
    // 实际项目中应使用支付宝SDK进行签名验证
    // 这里简化实现
    const sign = params.sign;
    delete params.sign;
    delete params.sign_type;
    
    const sortedParams = Object.keys(params)
      .filter(key => params[key] !== '')
      .sort()
      .map(key => `${key}=${params[key]}`)
      .join('&');
    
    const signContent = sortedParams;
    const verify = crypto.createVerify('RSA-SHA256');
    verify.update(signContent, 'utf8');
    
    return verify.verify(publicKey, sign, 'base64');
  } catch (error) {
    console.error('支付宝签名验证失败:', error);
    return false;
  }
};

// 支付回调处理（微信支付）
const handleWechatNotify = async (req, res) => {
  try {
    const config = PAYMENT_CONFIG.wechat;
    const xmlData = req.body;
    
    // 检查是否为真实环境
    const isRealEnvironment = config.appId && config.appId !== 'mock_wechat_app_id';
    
    if (isRealEnvironment) {
      // 真实环境：验证微信支付签名
      const signVerified = verifyWechatSignature(xmlData, config.apiKey);
      if (!signVerified) {
        return res.send('<xml><return_code><![CDATA[FAIL]]></return_code><return_msg><![CDATA[签名验证失败]]></return_msg></xml>');
      }
    }
    
    // 解析XML数据
    const result = parseWechatResponse(xmlData);
    
    if (result.return_code === 'SUCCESS' && result.result_code === 'SUCCESS') {
      // 支付成功
      const order = await Order.findOne({ orderNumber: result.out_trade_no });
      if (order) {
        order.isPaid = true;
        order.paidAt = new Date();
        order.status = 'confirmed';
        order.paymentStatus = 'paid';
        order.paymentResult = {
          id: result.transaction_id,
          status: 'SUCCESS',
          update_time: result.time_end
        };
        await order.save();
        
        // 发送支付成功通知
        sendPaymentSuccessNotification(order);
        console.log(`💰 微信支付成功: ${order.orderNumber}`);
      }
    }
    
    res.send('<xml><return_code><![CDATA[SUCCESS]]></return_code><return_msg><![CDATA[OK]]></return_msg></xml>');
    
  } catch (error) {
    console.error('微信支付回调处理失败:', error);
    res.send('<xml><return_code><![CDATA[FAIL]]></return_code><return_msg><![CDATA[处理失败]]></return_msg></xml>');
  }
};

// 验证微信支付签名
const verifyWechatSignature = (xmlData, apiKey) => {
  try {
    // 实际项目中应使用微信支付SDK进行签名验证
    // 这里简化实现
    const result = parseWechatResponse(xmlData);
    const sign = result.sign;
    
    // 重新生成签名进行验证
    const params = { ...result };
    delete params.sign;
    
    const generatedSign = generateWechatSignature(params, apiKey);
    return sign === generatedSign;
  } catch (error) {
    console.error('微信支付签名验证失败:', error);
    return false;
  }
};

// 获取支付方式列表
const getPaymentMethods = async (req, res) => {
  try {
    const paymentMethods = [
      {
        id: 'alipay',
        name: '支付宝',
        description: '安全便捷的支付宝支付',
        icon: 'https://img.alicdn.com/tfs/TB1QHKjoMZP3KVjSZFLXXc2HVXa-200-200.png',
        enabled: true,
        type: 'domestic'
      },
      {
        id: 'wechat',
        name: '微信支付',
        description: '微信安全支付',
        icon: 'https://res.wx.qq.com/op_res/BcTg7OhVAT2DpXpUO-0B2P7p3AhZJk4b5k3fJ3q4vC4',
        enabled: true,
        type: 'domestic'
      },
      {
        id: 'stripe',
        name: 'Stripe支付',
        description: '国际信用卡支付',
        icon: 'https://b.stripecdn.com/site-srv/assets/img/v3/jobs_v2/thumbnails/stripe-77c8269e2a6ffe6a2d9fdb96b4a5c8e64d4e8c49.png',
        enabled: true,
        type: 'international',
        currencies: ['USD', 'EUR', 'GBP', 'CNY']
      },
      {
        id: 'bank',
        name: '银行卡支付',
        description: '支持各大银行储蓄卡和信用卡',
        icon: 'https://example.com/bank-icon.png',
        enabled: false // 暂未实现
      }
    ];

    res.json({
      success: true,
      data: paymentMethods.filter(method => method.enabled)
    });

  } catch (error) {
    console.error('获取支付方式失败:', error);
    res.status(500).json({
      success: false,
      message: '获取支付方式失败',
      error: error.message
    });
  }
};

module.exports = {
  createPayment,
  checkPaymentStatus,
  handleAlipayNotify,
  handleWechatNotify,
  getPaymentMethods
};