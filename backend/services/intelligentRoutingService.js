const ChatSession = require('../models/ChatSession');
const User = require('../models/User');

class IntelligentRoutingService {
  constructor() {
    this.routingRules = [];
    this.faqKnowledgeBase = [];
    this.autoReplyTemplates = new Map();
    this.initDefaultRules();
    this.initAutoReplyTemplates();
  }

  /**
   * 初始化默认路由规则
   */
  initDefaultRules() {
    // 基于标签的路由规则
    this.routingRules = [
      {
        name: '技术问题路由',
        condition: (session, message) => session.tags.includes('technical') || 
                                        message?.content?.toLowerCase().includes('技术') ||
                                        message?.content?.toLowerCase().includes('technical'),
        priority: 'high',
        requiredSpecialties: ['technical'],
        weight: 10
      },
      {
        name: '账单问题路由',
        condition: (session, message) => session.tags.includes('billing') || 
                                        message?.content?.toLowerCase().includes('账单') ||
                                        message?.content?.toLowerCase().includes('billing') ||
                                        message?.content?.toLowerCase().includes('支付') ||
                                        message?.content?.toLowerCase().includes('payment'),
        priority: 'high',
        requiredSpecialties: ['billing'],
        weight: 9
      },
      {
        name: '产品问题路由',
        condition: (session, message) => session.tags.includes('product') || 
                                        message?.content?.toLowerCase().includes('产品') ||
                                        message?.content?.toLowerCase().includes('product'),
        priority: 'normal',
        requiredSpecialties: ['product'],
        weight: 8
      },
      {
        name: '物流问题路由',
        condition: (session, message) => session.tags.includes('shipping') || 
                                        message?.content?.toLowerCase().includes('物流') ||
                                        message?.content?.toLowerCase().includes('shipping') ||
                                        message?.content?.toLowerCase().includes('配送') ||
                                        message?.content?.toLowerCase().includes('delivery'),
        priority: 'normal',
        requiredSpecialties: ['shipping'],
        weight: 7
      },
      {
        name: '退款问题路由',
        condition: (session, message) => session.tags.includes('refund') || 
                                        message?.content?.toLowerCase().includes('退款') ||
                                        message?.content?.toLowerCase().includes('refund'),
        priority: 'high',
        requiredSpecialties: ['refund'],
        weight: 9
      },
      {
        name: '紧急问题路由',
        condition: (session, message) => session.priority === 'urgent' ||
                                        message?.content?.toLowerCase().includes('紧急') ||
                                        message?.content?.toLowerCase().includes('urgent') ||
                                        message?.content?.toLowerCase().includes('急') ||
                                        message?.content?.toLowerCase().includes('emergency'),
        priority: 'urgent',
        requiredSpecialties: [],
        weight: 15
      }
    ];
  }

  /**
   * 初始化自动回复模板
   */
  initAutoReplyTemplates() {
    this.autoReplyTemplates.set('greeting', {
      pattern: /^(你好|您好|hello|hi|嗨|早上好|下午好|晚上好)/i,
      response: "您好！欢迎使用我们的客服系统。请问有什么可以帮助您的吗？",
      priority: 'low'
    });

    this.autoReplyTemplates.set('thanks', {
      pattern: /^(谢谢|感谢|多谢|thx|thanks)/i,
      response: "不客气！很高兴能为您提供帮助。如果还有其他问题，请随时告诉我。",
      priority: 'low'
    });

    this.autoReplyTemplates.set('working_hours', {
      pattern: /(工作时间|营业时间|几点上班|几点下班|working hours)/i,
      response: "我们的工作时间是周一至周五 9:00-18:00，周末和节假日休息。如有紧急问题，请留言，我们会在工作时间内尽快回复。",
      priority: 'normal'
    });

    this.autoReplyTemplates.set('contact', {
      pattern: /(联系方式|电话|邮箱|email|phone|contact|客服|怎么联系|联系你们|联系客服)/i,
      response: "客服电话：400-123-4567\n客服邮箱：support@example.com\n工作时间：周一至周五 9:00-18:00",
      priority: 'normal'
    });
  }

  /**
   * 分析会话并应用路由规则
   */
  analyzeSession(session = {}, message = null) {
    const appliedRules = [];
    let finalPriority = session.priority || 'normal';
    const requiredSpecialties = new Set();

    // 确保session有必要的属性
    const safeSession = {
      tags: session.tags || [],
      priority: session.priority || 'normal',
      ...session
    };

    // 应用所有匹配的路由规则
    for (const rule of this.routingRules) {
      if (rule.condition(safeSession, message)) {
        appliedRules.push(rule.name);
        
        // 更新优先级（取最高优先级）
        const priorityWeights = { 'low': 1, 'normal': 2, 'high': 3, 'urgent': 4 };
        if (priorityWeights[rule.priority] > priorityWeights[finalPriority]) {
          finalPriority = rule.priority;
        }

        // 添加所需专业领域
        rule.requiredSpecialties.forEach(specialty => {
          requiredSpecialties.add(specialty);
        });
      }
    }

    return {
      appliedRules,
      priority: finalPriority,
      requiredSpecialties: Array.from(requiredSpecialties),
      shouldAutoReply: this.shouldAutoReply(message)
    };
  }

  /**
   * 检查是否应该自动回复
   */
  shouldAutoReply(message) {
    if (!message || !message.content) return {
      shouldReply: false,
      templateKey: null,
      response: null,
      priority: null
    };
    
    const content = message.content.toLowerCase();
    
    // 检查是否匹配任何自动回复模板
    for (const [key, template] of this.autoReplyTemplates) {
      if (template.pattern.test(content)) {
        return {
          shouldReply: true,
          templateKey: key,
          response: template.response,
          priority: template.priority
        };
      }
    }

    return {
      shouldReply: false,
      templateKey: null,
      response: null,
      priority: null
    };
  }

  /**
   * 获取自动回复
   */
  getAutoReply(message) {
    const autoReplyInfo = this.shouldAutoReply(message);
    return autoReplyInfo;
  }

  /**
   * 添加自定义路由规则
   */
  addRoutingRule(rule) {
    this.routingRules.push(rule);
    // 按权重排序
    this.routingRules.sort((a, b) => b.weight - a.weight);
  }

  /**
   * 添加FAQ知识库条目
   */
  addFAQ(question, answer, tags = []) {
    this.faqKnowledgeBase.push({
      question,
      answer,
      tags,
      createdAt: new Date()
    });
  }

  /**
   * 搜索FAQ知识库
   */
  searchFAQ(query, limit = 5) {
    const results = [];
    const queryLower = query.toLowerCase();

    for (const faq of this.faqKnowledgeBase) {
      let score = 0;

      // 问题匹配度
      if (faq.question.toLowerCase().includes(queryLower)) {
        score += 3;
      }

      // 答案匹配度
      if (faq.answer.toLowerCase().includes(queryLower)) {
        score += 1;
      }

      // 标签匹配度
      if (faq.tags.some(tag => tag.toLowerCase().includes(queryLower))) {
        score += 2;
      }

      if (score > 0) {
        results.push({ ...faq, score });
      }
    }

    // 按分数排序并限制数量
    return results
      .sort((a, b) => b.score - a.score)
      .slice(0, limit);
  }

  /**
   * 获取路由统计信息
   */
  getRoutingStats() {
    const stats = {
      totalRules: this.routingRules.length,
      totalFAQs: this.faqKnowledgeBase.length,
      autoReplyTemplates: this.autoReplyTemplates.size,
      ruleUsage: {},
      faqCategories: new Set()
    };

    // 统计FAQ标签
    this.faqKnowledgeBase.forEach(faq => {
      faq.tags.forEach(tag => stats.faqCategories.add(tag));
    });

    stats.faqCategories = Array.from(stats.faqCategories);

    return stats;
  }
}

// 创建单例实例
const intelligentRoutingService = new IntelligentRoutingService();

module.exports = intelligentRoutingService;