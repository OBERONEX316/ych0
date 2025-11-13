const intelligentRoutingService = require('./backend/services/intelligentRoutingService');

console.log('🔍 测试FAQ搜索功能...\n');

// 添加一些测试FAQ
console.log('📝 添加测试FAQ...');
intelligentRoutingService.addFAQ('如何重置密码？', '您可以在登录页面点击"忘记密码"链接，按照提示操作重置密码。', ['账号', '密码', '登录']);
intelligentRoutingService.addFAQ('订单多久发货？', '一般情况下，订单会在24小时内发货，节假日可能会延迟。', ['订单', '发货', '物流']);
intelligentRoutingService.addFAQ('如何申请退款？', '您可以在订单详情页面申请退款，客服会在1-3个工作日内处理。', ['退款', '订单', '支付']);

console.log('✅ 已添加3条FAQ\n');

// 测试FAQ搜索
const searchTests = [
  '忘记密码怎么办',
  '密码重置',
  '订单发货时间', 
  '发货多久',
  '申请退款流程',
  '退款怎么申请',
  '产品使用方法',
  '技术支持'
];

for (const query of searchTests) {
  console.log(`\n🔍 搜索: "${query}"`);
  
  const results = intelligentRoutingService.searchFAQ(query);
  
  if (results.length > 0) {
    console.log(`✅ 找到 ${results.length} 条相关结果:`);
    results.forEach((result, index) => {
      console.log(`   ${index + 1}. ${result.question} (分数: ${result.score})`);
      console.log(`      答案: ${result.answer.substring(0, 30)}...`);
      console.log(`      标签: ${result.tags.join(', ')}`);
    });
  } else {
    console.log('❌ 没有找到相关结果');
  }
}

// 显示FAQ统计
console.log('\n📊 FAQ统计信息:');
const stats = intelligentRoutingService.getRoutingStats();
console.log(`   总FAQ数量: ${stats.totalFAQs}`);
console.log(`   FAQ分类: ${stats.faqCategories.join(', ')}`);

console.log('\n🎉 FAQ搜索功能测试完成！');