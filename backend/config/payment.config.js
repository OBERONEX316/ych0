// 支付配置管理
// 实际项目中应该使用环境变量来配置这些敏感信息

module.exports = {
  // 支付宝配置
  alipay: {
    // 真实环境配置（从环境变量获取）
    appId: process.env.ALIPAY_APP_ID || 'mock_alipay_app_id',
    gateway: process.env.ALIPAY_GATEWAY || 'https://openapi.alipay.com/gateway.do',
    notifyUrl: process.env.ALIPAY_NOTIFY_URL || 'http://your-domain.com/api/payments/alipay/callback',
    returnUrl: process.env.ALIPAY_RETURN_URL || 'http://your-domain.com/payment/success',
    
    // 支付宝RSA密钥配置
    appPrivateKey: process.env.ALIPAY_APP_PRIVATE_KEY || 'mock_private_key',
    alipayPublicKey: process.env.ALIPAY_PUBLIC_KEY || 'mock_public_key',
    
    // 支付宝参数配置
    charset: 'utf-8',
    version: '1.0',
    signType: 'RSA2',
    format: 'json',
    
    // 模拟环境配置
    mock: {
      enabled: process.env.ALIPAY_MOCK_ENABLED === 'true' || true,
      successRate: 0.8 // 模拟支付成功率
    }
  },
  
  // 微信支付配置
  wechat: {
    // 真实环境配置
    appId: process.env.WECHAT_APP_ID || 'mock_wechat_app_id',
    mchId: process.env.WECHAT_MCH_ID || 'mock_mch_id',
    apiKey: process.env.WECHAT_API_KEY || 'mock_api_key',
    gateway: process.env.WECHAT_GATEWAY || 'https://api.mch.weixin.qq.com/pay/unifiedorder',
    notifyUrl: process.env.WECHAT_NOTIFY_URL || 'http://your-domain.com/api/payments/wechat/callback',
    
    // 微信支付参数配置
    tradeType: process.env.WECHAT_TRADE_TYPE || 'NATIVE',
    signType: 'MD5',
    
    // 模拟环境配置
    mock: {
      enabled: process.env.WECHAT_MOCK_ENABLED === 'true' || true,
      successRate: 0.8
    }
  },
  
  // Stripe支付配置（国际支付）
  stripe: {
    // 真实环境配置
    secretKey: process.env.STRIPE_SECRET_KEY || 'sk_test_mock',
    publishableKey: process.env.STRIPE_PUBLISHABLE_KEY || 'pk_test_mock',
    webhookSecret: process.env.STRIPE_WEBHOOK_SECRET || 'whsec_mock',
    
    // Stripe参数配置
    currency: process.env.STRIPE_CURRENCY || 'cny',
    
    // 模拟环境配置
    mock: {
      enabled: process.env.STRIPE_MOCK_ENABLED === 'true' || true,
      successRate: 0.8
    }
  },
  
  // 通用支付配置
  common: {
    // 支付超时时间（分钟）
    paymentTimeout: 30,
    
    // 支付重试次数
    maxRetryCount: 3,
    
    // 支付状态轮询间隔（秒）
    pollInterval: 5,
    
    // 支持的货币
    supportedCurrencies: ['CNY', 'USD', 'EUR', 'GBP'],
    
    // 默认货币
    defaultCurrency: 'CNY'
  },
  
  // 支付环境检测
  getEnvironment: () => {
    const isProduction = process.env.NODE_ENV === 'production';
    const hasRealConfig = 
      (process.env.ALIPAY_APP_ID && process.env.ALIPAY_APP_ID !== 'mock_alipay_app_id') ||
      (process.env.WECHAT_APP_ID && process.env.WECHAT_APP_ID !== 'mock_wechat_app_id') ||
      (process.env.STRIPE_SECRET_KEY && process.env.STRIPE_SECRET_KEY !== 'sk_test_mock');
    
    return {
      isProduction,
      hasRealConfig,
      isMock: !hasRealConfig,
      description: hasRealConfig ? '真实支付环境' : '模拟支付环境'
    };
  }
};