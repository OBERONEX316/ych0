const intelligentRoutingService = require('./backend/services/intelligentRoutingService');

console.log('🐛 调试FAQ功能...\n');

// 添加测试FAQ
console.log('📝 添加测试FAQ...');
intelligentRoutingService.addFAQ('如何重置密码？', '您可以在登录页面点击"忘记密码"链接，按照提示操作重置密码。', ['账号', '密码', '登录']);
intelligentRoutingService.addFAQ('订单多久发货？', '一般情况下，订单会在24小时内发货，节假日可能会延迟。', ['订单', '发货', '物流']);
intelligentRoutingService.addFAQ('如何申请退款？', '您可以在订单详情页面申请退款，客服会在1-3个工作日内处理。', ['退款', '订单', '支付']);

// 检查FAQ知识库内容
console.log('📋 FAQ知识库内容:');
const stats = intelligentRoutingService.getRoutingStats();
console.log(`   总FAQ数量: ${stats.totalFAQs}`);
console.log(`   FAQ分类: ${stats.faqCategories.join(', ')}`);

// 直接访问内部数据进行检查
console.log('\n🔍 直接检查FAQ数据:');
console.log('FAQ知识库数组长度:', intelligentRoutingService.faqKnowledgeBase.length);

if (intelligentRoutingService.faqKnowledgeBase.length > 0) {
  console.log('第一条FAQ:', JSON.stringify(intelligentRoutingService.faqKnowledgeBase[0], null, 2));
  console.log('所有FAQ:', JSON.stringify(intelligentRoutingService.faqKnowledgeBase, null, 2));
} else {
  console.log('❌ FAQ知识库为空');
}

// 测试简单的字符串匹配
console.log('\n🧪 测试字符串匹配:');
const testQuery = '密码';
const testFAQ = {
  question: '如何重置密码？',
  answer: '您可以在登录页面点击"忘记密码"链接，按照提示操作重置密码。',
  tags: ['账号', '密码', '登录']
};

console.log(`查询: "${testQuery}"`);
console.log(`问题包含查询: ${testFAQ.question.toLowerCase().includes(testQuery.toLowerCase())}`);
console.log(`答案包含查询: ${testFAQ.answer.toLowerCase().includes(testQuery.toLowerCase())}`);
console.log(`标签包含查询: ${testFAQ.tags.some(tag => tag.toLowerCase().includes(testQuery.toLowerCase()))}`);

// 手动实现搜索逻辑
console.log('\n🔍 手动搜索测试:');
const queryLower = '密码'.toLowerCase();
let score = 0;

if (testFAQ.question.toLowerCase().includes(queryLower)) {
  score += 3;
  console.log('✅ 问题匹配 +3');
}

if (testFAQ.answer.toLowerCase().includes(queryLower)) {
  score += 1;
  console.log('✅ 答案匹配 +1');
}

if (testFAQ.tags.some(tag => tag.toLowerCase().includes(queryLower))) {
  score += 2;
  console.log('✅ 标签匹配 +2');
}

console.log(`总分数: ${score}`);

console.log('\n🎯 调试完成！');