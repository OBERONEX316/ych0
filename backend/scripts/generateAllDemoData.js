const generateUserDemoData = require('./generateUserDemoData');
const generateProductDemoData = require('./generateProductDemoData');
const generateOrderDemoData = require('./generateOrderDemoData');
const generateReviewDemoData = require('./generateReviewDemoData');
const generateMembershipDemoData = require('./createMembershipDemoData');
const generateReferralDemoData = require('./generateReferralDemoData');
const generateUserBehaviorData = require('./generateUserBehaviorData');

const generateAllDemoData = async () => {
  try {
    console.log('🚀 开始生成完整的演示数据...\n');

    // 1. 生成用户数据
    console.log('📊 第一步：生成用户数据');
    await generateUserDemoData();
    console.log('✅ 用户数据生成完成\n');

    // 2. 生成商品数据
    console.log('📊 第二步：生成商品数据');
    await generateProductDemoData();
    console.log('✅ 商品数据生成完成\n');

    // 3. 生成订单数据
    console.log('📊 第三步：生成订单数据');
    await generateOrderDemoData();
    console.log('✅ 订单数据生成完成\n');

    // 4. 生成评价数据
    console.log('📊 第四步：生成评价数据');
    await generateReviewDemoData();
    console.log('✅ 评价数据生成完成\n');

    // 5. 生成会员等级数据
    console.log('📊 第五步：生成会员等级数据');
    await generateMembershipDemoData();
    console.log('✅ 会员等级数据生成完成\n');

    // 6. 生成推荐奖励数据
    console.log('📊 第六步：生成推荐奖励数据');
    await generateReferralDemoData();
    console.log('✅ 推荐奖励数据生成完成\n');

    // 7. 生成用户行为数据
    console.log('📊 第七步：生成用户行为数据');
    await generateUserBehaviorData();
    console.log('✅ 用户行为数据生成完成\n');

    console.log('🎉 所有演示数据生成完成！');
    console.log('📊 数据包括：');
    console.log('  - 用户数据');
    console.log('  - 商品数据');
    console.log('  - 订单数据');
    console.log('  - 评价数据');
    console.log('  - 会员等级数据');
    console.log('  - 推荐奖励数据');
    console.log('  - 用户行为数据');

  } catch (error) {
    console.error('❌ 生成演示数据失败:', error);
    process.exit(1);
  }
};

// 如果直接运行此脚本
if (require.main === module) {
  generateAllDemoData();
}

module.exports = generateAllDemoData;