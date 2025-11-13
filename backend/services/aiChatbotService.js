const axios = require('axios');

class AIChatbotService {
  constructor() {
    this.enabled = false;
    this.apiEndpoint = process.env.AI_CHATBOT_ENDPOINT || 'https://api.openai.com/v1/chat/completions';
    this.apiKey = process.env.AI_CHATBOT_API_KEY;
    this.maxContextLength = 10; // 保留最近10条消息作为上下文
    this.responseTemplates = this.initResponseTemplates();
  }

  /**
   * 初始化响应模板
   */
  initResponseTemplates() {
    return {
      greeting: "您好！我是智能客服助手，很高兴为您服务。请问有什么可以帮助您的吗？",
      farewell: "感谢您的咨询！如果还有其他问题，请随时联系我们。祝您有愉快的一天！",
      processing: "正在处理您的请求，请稍等...",
      unclear: "抱歉，我没有完全理解您的问题。您可以换种方式描述吗？或者联系人工客服获得更详细的帮助。",
      escalation: "您的问题比较复杂，我已经为您转接给专业客服人员，请稍等片刻。"
    };
  }

  /**
   * 启用/禁用AI聊天机器人
   */
  setEnabled(status) {
    this.enabled = status;
    console.log(`🤖 AI聊天机器人 ${status ? '已启用' : '已禁用'}`);
  }

  /**
   * 检查是否应该使用AI回复
   */
  shouldUseAI(message, session) {
    if (!this.enabled || !this.apiKey) {
      return false;
    }

    // 仅在特定条件下使用AI回复
    const content = message.content.toLowerCase();
    
    // 复杂问题或需要详细解释的情况
    const complexPatterns = [
      /如何.*操作/i,
      /怎么.*使用/i,
      /为什么.*不能/i,
      /怎么办/i,
      /建议/i,
      /推荐/i,
      /比较/i,
      /区别/i,
      /优缺点/i
    ];

    // 简单问候或常见问题使用模板回复
    const simplePatterns = [
      /^(你好|您好|hello|hi|嗨)/i,
      /^(谢谢|感谢|多谢)/i,
      /^(再见|拜拜|晚安)/i,
      /^(工作时间|营业时间)/i,
      /^(联系方式|电话|邮箱)/i
    ];

    // 如果是简单问题，使用模板回复而不是AI
    for (const pattern of simplePatterns) {
      if (pattern.test(content)) {
        return false;
      }
    }

    // 如果是复杂问题，使用AI回复
    for (const pattern of complexPatterns) {
      if (pattern.test(content)) {
        return true;
      }
    }

    // 消息长度较长（可能包含详细问题描述）
    if (content.length > 50) {
      return true;
    }

    return false;
  }

  /**
   * 生成AI回复
   */
  async generateAIResponse(message, session, messageHistory = []) {
    try {
      if (!this.apiKey) {
        return this.responseTemplates.unclear;
      }

      // 构建对话上下文
      const context = this.buildConversationContext(messageHistory, message);

      const response = await axios.post(
        this.apiEndpoint,
        {
          model: 'gpt-3.5-turbo',
          messages: context,
          max_tokens: 500,
          temperature: 0.7,
          presence_penalty: 0.6,
          frequency_penalty: 0.5
        },
        {
          headers: {
            'Authorization': `Bearer ${this.apiKey}`,
            'Content-Type': 'application/json'
          },
          timeout: 10000 // 10秒超时
        }
      );

      const aiResponse = response.data.choices[0]?.message?.content?.trim();
      
      if (!aiResponse) {
        return this.responseTemplates.unclear;
      }

      // 后处理AI回复
      return this.postProcessResponse(aiResponse);

    } catch (error) {
      console.error('AI回复生成失败:', error.message);
      
      // 根据错误类型返回不同的回复
      if (error.code === 'ECONNABORTED') {
        return this.responseTemplates.processing;
      }
      
      if (error.response?.status === 429) {
        return "当前请求过多，请稍后再试或联系人工客服。";
      }
      
      if (error.response?.status === 401) {
        console.error('AI服务认证失败，请检查API密钥配置');
        return this.responseTemplates.unclear;
      }
      
      return this.responseTemplates.unclear;
    }
  }

  /**
   * 构建对话上下文
   */
  buildConversationContext(messageHistory, currentMessage) {
    const context = [
      {
        role: 'system',
        content: `你是一个专业的客服助手，负责回答用户关于产品、服务和技术的问题。请保持友好、专业、简洁的回答风格。

公司信息：
- 公司名称：示例科技有限公司
- 主营业务：软件开发、技术咨询、数字解决方案
- 服务时间：周一至周五 9:00-18:00

回答指南：
1. 保持回答简洁明了，不超过200字
2. 对于技术问题，提供准确的解决方案
3. 对于不确定的问题，建议联系人工客服
4. 避免提供价格、促销等敏感信息
5. 使用中文回复，保持友好语气

如果用户的问题超出你的知识范围，请如实告知并建议联系人工客服。`
      }
    ];

    // 添加历史消息（限制数量）
    const recentHistory = messageHistory.slice(-this.maxContextLength);
    recentHistory.forEach(msg => {
      context.push({
        role: msg.sender.role === 'user' ? 'user' : 'assistant',
        content: msg.content
      });
    });

    // 添加当前消息
    context.push({
      role: 'user',
      content: currentMessage.content
    });

    return context;
  }

  /**
   * 后处理AI回复
   */
  postProcessResponse(response) {
    // 移除可能的多余标记
    let processed = response
      .replace(/^(AI|助手|机器人):\s*/i, '') // 移除开头的AI标记
      .replace(/\[.*?\]/g, '') // 移除方括号内容
      .trim();

    // 确保回复以句号结束
    if (!processed.endsWith('.') && !processed.endsWith('!') && !processed.endsWith('?')) {
      processed += '.';
    }

    // 限制回复长度
    if (processed.length > 300) {
      processed = processed.substring(0, 297) + '...';
    }

    return processed;
  }

  /**
   * 检查是否需要转接人工客服
   */
  shouldEscalateToHuman(aiResponse, userMessage) {
    const content = userMessage.content.toLowerCase();
    const response = aiResponse.toLowerCase();

    // AI表示无法回答或建议联系人工客服
    if (response.includes('人工客服') || 
        response.includes('联系客服') || 
        response.includes('无法回答') || 
        response.includes('超出范围')) {
      return true;
    }

    // 用户明确要求人工客服
    if (content.includes('人工客服') || 
        content.includes('真人') || 
        content.includes('转人工')) {
      return true;
    }

    // 敏感话题（价格、投诉、退款等）
    const sensitiveTopics = [
      /价格|多少钱|报价/i,
      /投诉|不满意|差评/i,
      /退款|退货|赔偿/i,
      /合同|协议|法律/i,
      /紧急|urgent|emergency/i
    ];

    for (const pattern of sensitiveTopics) {
      if (pattern.test(content)) {
        return true;
      }
    }

    return false;
  }

  /**
   * 获取服务状态
   */
  getStatus() {
    return {
      enabled: this.enabled,
      hasApiKey: !!this.apiKey,
      maxContextLength: this.maxContextLength,
      endpoint: this.apiEndpoint
    };
  }
}

// 创建单例实例
const aiChatbotService = new AIChatbotService();

module.exports = aiChatbotService;