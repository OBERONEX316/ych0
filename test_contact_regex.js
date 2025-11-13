const intelligentRoutingService = require('./backend/services/intelligentRoutingService');

console.log('🧪 测试联系客服自动回复的正则表达式...\n');

// 获取联系客服的模板
const contactTemplate = intelligentRoutingService.autoReplyTemplates.get('contact');
console.log('联系客服模板:', JSON.stringify(contactTemplate, null, 2));

// 测试各种消息
const testMessages = [
  '怎么联系客服',
  '联系方式',
  '客服电话',
  '邮箱',
  'email',
  'phone',
  'contact',
  '你们的电话是多少',
  '怎么联系你们',
  '客服联系方式'
];

console.log('\n🔍 测试消息匹配:');
for (const message of testMessages) {
  const matches = contactTemplate.pattern.test(message);
  console.log(`"${message}" -> ${matches ? '✅ 匹配' : '❌ 不匹配'}`);
}

// 测试自动回复功能
console.log('\n🤖 测试自动回复功能:');
for (const message of testMessages) {
  const mockMessage = { content: message };
  const autoReply = intelligentRoutingService.getAutoReply(mockMessage);
  
  if (autoReply && autoReply.shouldReply) {
    console.log(`"${message}" -> ✅ 自动回复: ${autoReply.templateKey}`);
  } else {
    console.log(`"${message}" -> ❌ 无自动回复`);
  }
}

console.log('\n🎯 测试完成！');