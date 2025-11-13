const intelligentRoutingService = require('./backend/services/intelligentRoutingService');
const chatAssignmentService = require('./backend/services/chatAssignmentService');

// 模拟客服数据
const mockAgents = [
  {
    userId: 'agent1',
    username: 'tech_support',
    specialties: ['技术问题', '账号问题', '支付问题'],
    maxSessions: 5,
    responseTime: 120,
    currentSessions: 0
  },
  {
    userId: 'agent2', 
    username: 'billing_support',
    specialties: ['账单问题', '退款问题', '支付问题'],
    maxSessions: 3,
    responseTime: 180,
    currentSessions: 0
  }
];

// 添加模拟客服到系统
mockAgents.forEach(agent => {
  chatAssignmentService.addAgent(agent);
});

console.log('🚀 开始测试智能路由和自动回复逻辑\n');

// 测试智能路由分析
console.log('🧠 测试智能路由分析功能...');

const testMessages = [
  {
    message: '我的账号无法登录，提示密码错误',
    expectedTags: ['技术问题', '账号问题'],
    expectedPriority: 'medium'
  },
  {
    message: '我的账单被错误扣款了，需要立即处理！',
    expectedTags: ['账单问题', '紧急'], 
    expectedPriority: 'high'
  },
  {
    message: '你好，我想了解一下你们的产品',
    expectedTags: ['咨询'],
    expectedPriority: 'low'
  },
  {
    message: '我的订单一直没有发货，怎么回事？',
    expectedTags: ['订单问题', '发货问题'],
    expectedPriority: 'medium'
  }
];

for (const test of testMessages) {
  console.log(`\n📋 测试消息: ${test.message}`);
  
  // 创建模拟会话对象
  const mockSession = { tags: [], priority: 'normal' };
  const mockMessage = { content: test.message };
  
  const analysis = intelligentRoutingService.analyzeSession(mockSession, mockMessage);
  console.log(`🏷️  分析结果 - 应用规则: ${analysis.appliedRules.join(', ')}`);
  console.log(`🚦 优先级: ${analysis.priority}`);
  console.log(`🎯 所需专业: ${analysis.requiredSpecialties.join(', ')}`);
  
  // 验证结果 - 检查是否应用了正确的规则
  const hasExpectedRules = analysis.appliedRules.some(rule => 
    rule.includes('技术') || rule.includes('账单') || rule.includes('紧急')
  );
  const priorityMatch = analysis.priority === test.expectedPriority;
  
  if (hasExpectedRules && priorityMatch) {
    console.log('✅ 路由分析测试通过');
  } else {
    console.log('❌ 路由分析测试失败');
    console.log(`   期望优先级: ${test.expectedPriority}`);
    console.log(`   实际优先级: ${analysis.priority}`);
  }
}

// 测试自动回复
console.log('\n🤖 测试自动回复功能...');

const autoReplyTests = [
  '你好',
  '谢谢',
  '你们的工作时间是什么时候？',
  '怎么联系客服？',
  '我有一个复杂的技术问题需要帮助',
  '我的订单号是123456'
];

for (const message of autoReplyTests) {
  console.log(`\n💬 测试消息: ${message}`);
  
  const autoReply = intelligentRoutingService.getAutoReply(message);
  if (autoReply && autoReply.shouldReply) {
    console.log(`✅ 需要自动回复: ${autoReply.response.substring(0, 50)}...`);
    console.log(`📋 回复类型: ${autoReply.type}`);
  } else {
    console.log('❌ 不需要自动回复');
  }
}

// 测试会话分配逻辑
console.log('\n🎯 测试会话分配逻辑...');

const testSessions = [
  {
    tags: ['技术问题', '账号问题'],
    priority: 'medium'
  },
  {
    tags: ['账单问题', '紧急'],
    priority: 'high' 
  },
  {
    tags: ['咨询'],
    priority: 'low'
  }
];

for (const session of testSessions) {
  console.log(`\n📋 测试会话 - 标签: ${session.tags.join(', ')}, 优先级: ${session.priority}`);
  
  // 模拟会话对象
  const mockSession = {
    tags: session.tags,
    priority: session.priority
  };
  
  try {
    // 这里我们直接调用分配逻辑的核心部分
    const availableAgents = chatAssignmentService.getAvailableAgents();
    
    if (availableAgents.length > 0) {
      // 找到最佳匹配的客服
      const bestAgent = availableAgents.find(agent => 
        agent.specialties.some(specialty => 
          session.tags.includes(specialty)
        )
      );
      
      if (bestAgent) {
        console.log(`✅ 找到匹配客服: ${bestAgent.username}`);
        console.log(`🎯 匹配专业: ${bestAgent.specialties.join(', ')}`);
      } else {
        console.log('⏳ 没有完全匹配的客服，将分配给第一个可用客服');
        console.log(`👤 分配给的客服: ${availableAgents[0].username}`);
      }
    } else {
      console.log('📊 所有客服都忙，会话将加入队列');
      const queueSize = chatAssignmentService.getQueue().length;
      console.log(`📊 当前队列大小: ${queueSize}`);
    }
    
  } catch (error) {
    console.log('❌ 会话分配测试失败:', error.message);
  }
}

// 显示系统状态
console.log('\n📊 系统状态统计:');
const status = chatAssignmentService.getStatus();
console.log(`  在线客服: ${status.availableAgents}`);
console.log(`  活跃会话: ${status.activeSessions}`);
console.log(`  队列会话: ${status.queueSize}`);

console.log('\n🎉 智能路由和自动回复逻辑测试完成！');
console.log('💡 注意: 这是一个逻辑测试，不涉及实际的数据库操作。');