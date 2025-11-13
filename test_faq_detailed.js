const intelligentRoutingService = require('./backend/services/intelligentRoutingService');

console.log('🔍 详细测试FAQ搜索功能...\n');

// 清空现有FAQ（如果有）
intelligentRoutingService.faqKnowledgeBase = [];

// 添加测试FAQ
console.log('📝 添加测试FAQ...');
intelligentRoutingService.addFAQ('如何重置密码？', '您可以在登录页面点击"忘记密码"链接，按照提示操作重置密码。', ['账号', '密码', '登录']);
intelligentRoutingService.addFAQ('订单多久发货？', '一般情况下，订单会在24小时内发货，节假日可能会延迟。', ['订单', '发货', '物流']);
intelligentRoutingService.addFAQ('如何申请退款？', '您可以在订单详情页面申请退款，客服会在1-3个工作日内处理。', ['退款', '订单', '支付']);

console.log('✅ 已添加3条FAQ\n');

// 检查FAQ知识库
console.log('📋 FAQ知识库内容:');
console.log('FAQ数量:', intelligentRoutingService.faqKnowledgeBase.length);
intelligentRoutingService.faqKnowledgeBase.forEach((faq, index) => {
  console.log(`${index + 1}. ${faq.question}`);
  console.log(`   标签: ${faq.tags.join(', ')}`);
});

// 测试具体的搜索查询
console.log('\n🧪 测试具体搜索查询:');

const testCases = [
  { query: '密码', expected: '如何重置密码？' },
  { query: '重置', expected: '如何重置密码？' },
  { query: '发货', expected: '订单多久发货？' },
  { query: '订单', expected: ['如何重置密码？', '订单多久发货？', '如何申请退款？'] },
  { query: '退款', expected: '如何申请退款？' },
  { query: '支付', expected: '如何申请退款？' },
  { query: '不存在的内容', expected: null }
];

for (const testCase of testCases) {
  console.log(`\n🔍 搜索: "${testCase.query}"`);
  
  const results = intelligentRoutingService.searchFAQ(testCase.query);
  
  if (results.length > 0) {
    console.log(`✅ 找到 ${results.length} 条结果:`);
    results.forEach((result, index) => {
      console.log(`   ${index + 1}. ${result.question} (分数: ${result.score})`);
    });
    
    // 验证预期结果
    if (Array.isArray(testCase.expected)) {
      const foundExpected = testCase.expected.every(expected => 
        results.some(result => result.question === expected)
      );
      console.log(foundExpected ? '✅ 预期结果匹配' : '❌ 预期结果不匹配');
    } else if (testCase.expected) {
      const foundExpected = results.some(result => result.question === testCase.expected);
      console.log(foundExpected ? '✅ 预期结果匹配' : '❌ 预期结果不匹配');
    }
  } else {
    console.log('❌ 没有找到结果');
    if (testCase.expected === null) {
      console.log('✅ 符合预期（查询不存在的内容）');
    } else {
      console.log('❌ 不符合预期，应该找到结果');
    }
  }
}

// 测试搜索方法的内部逻辑
console.log('\n🔧 测试搜索方法内部逻辑:');
const query = '密码';
console.log(`查询: "${query}"`);

const queryLower = query.toLowerCase();
const faq = intelligentRoutingService.faqKnowledgeBase[0]; // 第一条FAQ

console.log('FAQ问题:', faq.question);
console.log('FAQ答案:', faq.answer.substring(0, 30) + '...');
console.log('FAQ标签:', faq.tags.join(', '));

let score = 0;
if (faq.question.toLowerCase().includes(queryLower)) {
  score += 3;
  console.log('✅ 问题匹配 +3');
}
if (faq.answer.toLowerCase().includes(queryLower)) {
  score += 1;
  console.log('✅ 答案匹配 +1');
}
if (faq.tags.some(tag => tag.toLowerCase().includes(queryLower))) {
  score += 2;
  console.log('✅ 标签匹配 +2');
}
console.log('总分数:', score);

console.log('\n🎯 详细测试完成！');