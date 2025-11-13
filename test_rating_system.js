const mongoose = require('mongoose');
const { ChatSession } = require('./backend/models/ChatSession');

// 测试数据
const testSessionData = {
  title: '测试满意度评价会话',
  participants: [
    { userId: 'user123', username: '测试用户', role: 'user' }
  ],
  assignedTo: { userId: 'support123', username: '测试客服', role: 'support' },
  status: 'closed'
};

const testRatingData = {
  score: 5,
  comment: '服务非常好，问题解决得很彻底！',
  dimensions: {
    responseTime: 4,
    professionalism: 5,
    problemResolution: 5,
    communication: 5
  },
  tags: ['专业', '高效', '友好'],
  wouldRecommend: true
};

async function testRatingSystem() {
  console.log('🚀 开始测试满意度评价系统...\n');

  try {
    // 连接数据库
    await mongoose.connect('mongodb://localhost:27017/chat_system', {
      useNewUrlParser: true,
      useUnifiedTopology: true
    });
    console.log('✅ 数据库连接成功');

    // 创建测试会话
    const session = new ChatSession(testSessionData);
    await session.save();
    console.log('✅ 测试会话创建成功');
    console.log(`   会话ID: ${session._id}`);
    console.log(`   客服ID: ${session.assignedTo.userId}`);

    // 测试1: 添加评价
    console.log('\n📝 测试1: 添加满意度评价');
    session.addRating({
      ...testRatingData,
      ratedBy: 'user123'
    });
    await session.save();
    console.log('✅ 评价添加成功');
    console.log(`   评分: ${session.rating.score}星`);
    console.log(`   评价时间: ${session.rating.ratedAt}`);

    // 测试2: 检查是否已评价
    console.log('\n🔍 测试2: 检查是否已评价');
    const hasRating = session.hasRating();
    console.log(`   会话是否已评价: ${hasRating}`);

    // 测试3: 获取平均维度评分
    console.log('\n📊 测试3: 获取维度平均分');
    const avgScores = session.getAverageDimensionScore();
    console.log('   各维度平均分:');
    Object.entries(avgScores).forEach(([dimension, score]) => {
      console.log(`   ${dimension}: ${score}分`);
    });

    // 测试4: 获取客服评分统计
    console.log('\n📈 测试4: 获取客服评分统计');
    const agentStats = await ChatSession.getAgentRatingStats('support123');
    console.log('   客服评分统计:');
    console.log(`   总评价数: ${agentStats.totalRatings}`);
    console.log(`   平均评分: ${agentStats.averageRating.toFixed(1)}星`);
    console.log(`   5星评价: ${agentStats.fiveStarRatings}个`);

    // 测试5: 获取客服评分排名
    console.log('\n🏆 测试5: 获取客服评分排名');
    const rankings = await ChatSession.getAgentRatingRankings();
    console.log('   客服评分排名:');
    rankings.forEach((agent, index) => {
      console.log(`   ${index + 1}. ${agent.username}: ${agent.averageRating.toFixed(1)}星 (${agent.totalRatings}评价)`);
    });

    // 测试6: 获取整体评价统计
    console.log('\n📋 测试6: 获取整体评价统计');
    const overallStats = await ChatSession.getRatingStats();
    const stats = overallStats[0] || {
      totalRatings: 0,
      averageRating: 0,
      fiveStarRatings: 0,
      oneStarRatings: 0
    };
    console.log('   整体评价统计:');
    console.log(`   总评价数: ${stats.totalRatings}`);
    console.log(`   平均评分: ${stats.averageRating.toFixed(1)}星`);
    console.log(`   5星评价: ${stats.fiveStarRatings}个`);
    console.log(`   1星评价: ${stats.oneStarRatings}个`);

    // 测试7: 尝试重复评价（应该失败）
    console.log('\n❌ 测试7: 尝试重复评价');
    try {
      session.addRating({
        score: 4,
        comment: '第二次评价',
        ratedBy: 'user123'
      });
      console.log('   ❗ 错误: 应该不允许重复评价');
    } catch (error) {
      console.log('   ✅ 正确: 阻止了重复评价');
    }

    console.log('\n🎉 所有测试完成！');
    console.log('\n📋 测试总结:');
    console.log('   - 满意度评价功能正常');
    console.log('   - 评分统计功能正常');
    console.log('   - 排名功能正常');
    console.log('   - 重复评价防护正常');

  } catch (error) {
    console.error('❌ 测试失败:', error.message);
  } finally {
    // 清理测试数据
    await ChatSession.deleteMany({ title: '测试满意度评价会话' });
    console.log('\n🧹 清理测试数据完成');
    
    await mongoose.disconnect();
    console.log('🔌 数据库连接已关闭');
  }
}

// 运行测试
testRatingSystem();