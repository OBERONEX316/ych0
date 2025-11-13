const axios = require('axios');

const BASE_URL = 'http://localhost:5000/api';

async function testRecommendationSystem() {
  console.log('🧪 测试推荐系统增强功能...\n');
  
  try {
    // 1. 测试健康检查
    console.log('1. 测试服务器健康检查...');
    const healthResponse = await axios.get(`${BASE_URL}/health`);
    console.log('✅ 健康检查:', healthResponse.data.status);
    
    // 2. 测试推荐系统状态（不需要认证）
    console.log('\n2. 测试推荐系统状态...');
    const statusResponse = await axios.get(`${BASE_URL}/recommendations/status`);
    console.log('✅ 推荐系统状态:', {
      aiEnabled: statusResponse.data.data.ai_recommendation.enabled,
      itemsEmbedded: statusResponse.data.data.ai_recommendation.items_embedded,
      usersEmbedded: statusResponse.data.data.ai_recommendation.users_embedded
    });
    
    // 3. 测试相似商品推荐（不需要认证）
    console.log('\n3. 测试相似商品推荐...');
    const basePopular = await axios.get(`${BASE_URL}/recommendations/popular?limit=1`);
    const baseId = basePopular.data && basePopular.data.data && basePopular.data.data[0] && basePopular.data.data[0]._id;
    if (!baseId) throw new Error('缺少可用商品用于相似推荐');
    const similarResponse = await axios.get(`${BASE_URL}/recommendations/similar/${baseId}?limit=4`);
    console.log('✅ 相似商品推荐:', {
      count: similarResponse.data.data.length,
      algorithm: similarResponse.data.metadata.algorithm
    });
    
    // 4. 测试热门商品推荐（不需要认证）
    console.log('\n4. 测试热门商品推荐...');
    const popularResponse = await axios.get(`${BASE_URL}/recommendations/popular?limit=6`);
    console.log('✅ 热门商品推荐:', {
      count: popularResponse.data.data.length
    });
    
    // 5. 测试新上架商品推荐（不需要认证）
    console.log('\n5. 测试新上架商品推荐...');
    const newResponse = await axios.get(`${BASE_URL}/recommendations/new-arrivals?limit=4`);
    console.log('✅ 新上架商品推荐:', {
      count: newResponse.data.data.length
    });
    
    console.log('\n🎉 推荐系统基础功能测试通过！');
    console.log('📝 注：个性化推荐需要用户认证，请在登录后测试');
    
  } catch (error) {
    console.error('❌ 测试失败:', error.response?.data || error.message);
  }
}

// 如果直接运行此脚本
if (require.main === module) {
  // 等待服务器启动
  setTimeout(() => {
    testRecommendationSystem();
  }, 3000);
}

module.exports = { testRecommendationSystem };
