const intelligentRoutingService = require('./backend/services/intelligentRoutingService');

console.log('🚀 开始测试智能路由和自动回复核心功能\n');

// 测试智能路由分析
console.log('🧠 测试智能路由分析功能...');

const testMessages = [
  {
    message: '我的账号无法登录，提示密码错误',
    expectedRules: ['技术问题路由'],
    expectedPriority: 'high'
  },
  {
    message: '我的账单被错误扣款了，需要立即处理！',
    expectedRules: ['账单问题路由', '紧急问题路由'], 
    expectedPriority: 'urgent'
  },
  {
    message: '你好，我想了解一下你们的产品',
    expectedRules: ['产品问题路由'],
    expectedPriority: 'normal'
  },
  {
    message: '我的订单一直没有发货，怎么回事？',
    expectedRules: ['物流问题路由'],
    expectedPriority: 'normal'
  }
];

for (const test of testMessages) {
  console.log(`\n📋 测试消息: ${test.message}`);
  
  // 创建模拟会话对象
  const mockSession = { tags: [], priority: 'normal' };
  const mockMessage = { content: test.message };
  
  const analysis = intelligentRoutingService.analyzeSession(mockSession, mockMessage);
  console.log(`🏷️  应用规则: ${analysis.appliedRules.join(', ') || '无'}`);
  console.log(`🚦 优先级: ${analysis.priority}`);
  console.log(`🎯 所需专业: ${analysis.requiredSpecialties.join(', ') || '无'}`);
  
  // 验证结果
  const hasExpectedRules = test.expectedRules.every(expectedRule => 
    analysis.appliedRules.includes(expectedRule)
  );
  const priorityMatch = analysis.priority === test.expectedPriority;
  
  if (hasExpectedRules && priorityMatch) {
    console.log('✅ 路由分析测试通过');
  } else {
    console.log('❌ 路由分析测试失败');
    console.log(`   期望规则: ${test.expectedRules.join(', ')}`);
    console.log(`   期望优先级: ${test.expectedPriority}`);
  }
}

// 测试自动回复
console.log('\n🤖 测试自动回复功能...');

const autoReplyTests = [
  { message: '你好', expectedType: 'greeting' },
  { message: '谢谢', expectedType: 'thanks' },
  { message: '你们的工作时间是什么时候？', expectedType: 'working_hours' },
  { message: '怎么联系客服？', expectedType: 'contact' },
  { message: '我有一个复杂的技术问题需要帮助', expectedType: null },
  { message: '我的订单号是123456', expectedType: null }
];

for (const test of autoReplyTests) {
  console.log(`\n💬 测试消息: ${test.message}`);
  
  const mockMessage = { content: test.message };
  const autoReply = intelligentRoutingService.getAutoReply(mockMessage);
  
  if (autoReply && autoReply.shouldReply) {
    console.log(`✅ 需要自动回复: ${autoReply.response.substring(0, 50)}...`);
    console.log(`📋 回复类型: ${autoReply.templateKey}`);
    
    if (autoReply.templateKey === test.expectedType) {
      console.log('✅ 自动回复类型匹配');
    } else {
      console.log('❌ 自动回复类型不匹配');
      console.log(`   期望类型: ${test.expectedType}`);
    }
  } else {
    if (test.expectedType === null) {
      console.log('✅ 不需要自动回复（符合预期）');
    } else {
      console.log('❌ 需要自动回复但没有触发');
      console.log(`   期望类型: ${test.expectedType}`);
    }
  }
}

// 测试FAQ知识库
console.log('\n📚 测试FAQ知识库功能...');

// 添加一些测试FAQ
intelligentRoutingService.addFAQ('如何重置密码？', '您可以在登录页面点击"忘记密码"链接，按照提示操作重置密码。', ['账号', '密码', '登录']);
intelligentRoutingService.addFAQ('订单多久发货？', '一般情况下，订单会在24小时内发货，节假日可能会延迟。', ['订单', '发货', '物流']);
intelligentRoutingService.addFAQ('如何申请退款？', '您可以在订单详情页面申请退款，客服会在1-3个工作日内处理。', ['退款', '订单', '支付']);

const faqTests = [
  '忘记密码怎么办',
  '订单发货时间',
  '申请退款流程',
  '产品使用方法'
];

for (const query of faqTests) {
  console.log(`\n🔍 搜索FAQ: ${query}`);
  
  const results = intelligentRoutingService.searchFAQ(query);
  if (results.length > 0) {
    console.log(`✅ 找到 ${results.length} 条相关FAQ`);
    results.slice(0, 2).forEach((result, index) => {
      console.log(`   ${index + 1}. ${result.question} - 分数: ${result.score}`);
    });
  } else {
    console.log('❌ 没有找到相关FAQ');
  }
}

// 显示路由统计信息
console.log('\n📊 路由系统统计信息:');
const stats = intelligentRoutingService.getRoutingStats();
console.log(`   路由规则数量: ${stats.totalRules}`);
console.log(`   FAQ数量: ${stats.totalFAQs}`);
console.log(`   自动回复模板: ${stats.autoReplyTemplates}`);
console.log(`   FAQ分类: ${stats.faqCategories.join(', ')}`);

console.log('\n🎉 智能路由和自动回复核心功能测试完成！');
console.log('💡 注意: 此测试专注于路由逻辑，不涉及数据库操作。');