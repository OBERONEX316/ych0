const UserBehavior = require('../models/UserBehavior');
const geoip = require('geoip-lite');
const UAParser = require('ua-parser-js');

/**
 * 用户行为追踪中间件
 * 用于捕获和记录用户的各种行为数据
 */
class UserBehaviorTracker {
  constructor() {
    this.sessionMap = new Map(); // 简单的会话映射，生产环境应使用Redis
  }

  /**
   * 生成会话ID
   */
  generateSessionId() {
    return `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * 获取或创建会话ID
   */
  getOrCreateSessionId(req) {
    let sessionId = req.cookies?.behavior_session_id;
    
    if (!sessionId) {
      sessionId = this.generateSessionId();
      // 设置cookie，有效期30天
      req.behaviorSessionId = sessionId;
    }
    
    return sessionId;
  }

  /**
   * 解析设备信息
   */
  parseDeviceInfo(userAgent) {
    const parser = new UAParser(userAgent);
    const result = parser.getResult();
    
    return {
      userAgent: userAgent,
      browser: `${result.browser.name} ${result.browser.version}`,
      os: `${result.os.name} ${result.os.version}`,
      deviceType: result.device.type || 'desktop',
      screenResolution: 'unknown', // 需要从客户端获取
      viewport: 'unknown' // 需要从客户端获取
    };
  }

  /**
   * 解析地理位置
   */
  parseLocation(ip) {
    const geo = geoip.lookup(ip);
    
    if (geo) {
      return {
        ip: ip,
        country: geo.country,
        region: geo.region,
        city: geo.city,
        latitude: geo.ll[0],
        longitude: geo.ll[1]
      };
    }
    
    return {
      ip: ip,
      country: 'unknown',
      region: 'unknown',
      city: 'unknown',
      latitude: 0,
      longitude: 0
    };
  }

  /**
   * 记录用户行为
   */
  async trackBehavior(data) {
    try {
      const behavior = new UserBehavior(data);
      await behavior.save();
      return behavior;
    } catch (error) {
      console.error('记录用户行为失败:', error);
      throw error;
    }
  }

  /**
   * Express中间件 - 基础行为追踪
   */
  middleware() {
    return async (req, res, next) => {
      try {
        // 获取会话ID
        const sessionId = this.getOrCreateSessionId(req);
        
        // 设置会话cookie
        if (req.behaviorSessionId) {
          res.cookie('behavior_session_id', req.behaviorSessionId, {
            maxAge: 30 * 24 * 60 * 60 * 1000, // 30天
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production'
          });
        }

        // 记录页面访问
        if (req.method === 'GET' && req.user?._id) {
          const behaviorData = {
            userId: req.user?._id || null,
            sessionId: sessionId,
            action: 'page_view',
            targetType: 'page',
            targetData: {
              pageUrl: req.originalUrl,
              pageTitle: req.headers['x-page-title'] || req.originalUrl,
              referrer: req.get('Referer') || '',
              deviceInfo: this.parseDeviceInfo(req.get('User-Agent') || ''),
              location: this.parseLocation(req.ip || req.connection.remoteAddress),
              duration: 0 // 页面停留时间，需要在页面卸载时更新
            },
            metadata: {
              source: req.headers['x-source'] || 'web',
              version: req.headers['x-app-version'] || '1.0.0',
              campaign: req.headers['x-campaign'] || '',
              utmSource: req.query.utm_source || '',
              utmMedium: req.query.utm_medium || '',
              utmCampaign: req.query.utm_campaign || '',
              utmTerm: req.query.utm_term || '',
              utmContent: req.query.utm_content || ''
            }
          };

          // 异步记录行为，不阻塞主流程
          this.trackBehavior(behaviorData).catch(() => {});
        }

        // 将追踪器附加到请求对象
        req.behaviorTracker = {
          track: async (action, targetType, targetId, additionalData = {}) => {
            if (!req.user?._id) return null;
            return this.trackBehavior({
              userId: req.user._id,
              sessionId: sessionId,
              action: action,
              targetType: targetType,
              targetId: targetId,
              targetData: {
                ...additionalData,
                deviceInfo: this.parseDeviceInfo(req.get('User-Agent') || ''),
                location: this.parseLocation(req.ip || req.connection.remoteAddress)
              },
              metadata: {
                source: req.headers['x-source'] || 'web',
                version: req.headers['x-app-version'] || '1.0.0'
              }
            });
          },
          
          updatePageDuration: async (duration) => {
            // 更新页面停留时间（需要在页面卸载时调用）
            try {
              const recentPageView = await UserBehavior.findOne({
                sessionId: sessionId,
                action: 'page_view',
                'targetData.pageUrl': req.originalUrl
              }).sort({ timestamp: -1 });

              if (recentPageView) {
                recentPageView.targetData.duration = duration;
                await recentPageView.save();
              }
            } catch (error) {
              console.error('更新页面停留时间失败:', error);
            }
          }
        };

        next();
      } catch (error) {
        console.error('行为追踪中间件错误:', error);
        next(); // 不阻塞主流程
      }
    };
  }

  /**
   * 批量记录行为数据（用于批量导入）
   */
  async batchTrackBehaviors(behaviors) {
    try {
      const result = await UserBehavior.insertMany(behaviors, { ordered: false });
      return result;
    } catch (error) {
      console.error('批量记录用户行为失败:', error);
      throw error;
    }
  }

  /**
   * 清理过期数据
   */
  async cleanupOldData(daysToKeep = 90) {
    try {
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - daysToKeep);
      
      const result = await UserBehavior.deleteMany({
        timestamp: { $lt: cutoffDate }
      });
      
      console.log(`清理了 ${result.deletedCount} 条过期用户行为数据`);
      return result;
    } catch (error) {
      console.error('清理过期用户行为数据失败:', error);
      throw error;
    }
  }
}

module.exports = new UserBehaviorTracker();
