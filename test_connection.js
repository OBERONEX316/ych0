const axios = require('axios');

async function testConnection() {
  console.log('🔍 测试网络连接...');
  
  try {
    // 测试健康检查API
    console.log('\n1. 测试健康检查API...');
    const healthResponse = await axios.get('http://localhost:5000/api/health');
    console.log('✅ 健康检查API正常:', healthResponse.data);
    
    // 测试认证API（不带token）
    console.log('\n2. 测试认证API（不带token）...');
    try {
      const authResponse = await axios.get('http://localhost:5000/api/auth/me');
      console.log('✅ 认证API响应:', authResponse.data);
    } catch (authError) {
      if (authError.response?.status === 401) {
        console.log('✅ 认证API正常（返回401认证错误）:', authError.response.data);
      } else {
        console.log('❌ 认证API错误:', authError.message);
      }
    }
    
    // 测试带无效token的认证API
    console.log('\n3. 测试带无效token的认证API...');
    try {
      const authWithTokenResponse = await axios.get('http://localhost:5000/api/auth/me', {
        headers: {
          'Authorization': 'Bearer invalid_token'
        }
      });
      console.log('✅ 带token认证API响应:', authWithTokenResponse.data);
    } catch (tokenError) {
      if (tokenError.response?.status === 401) {
        console.log('✅ 带token认证API正常（返回401认证错误）:', tokenError.response.data);
      } else {
        console.log('❌ 带token认证API错误:', tokenError.message);
      }
    }
    
    console.log('\n🎉 所有API测试完成！');
    
  } catch (error) {
    console.log('❌ 连接测试失败:', error.message);
    
    if (error.code === 'ECONNREFUSED') {
      console.log('💡 提示: 后端服务器可能未启动或端口被占用');
    } else if (error.code === 'ENOTFOUND') {
      console.log('💡 提示: 无法解析localhost，请检查网络配置');
    }
  }
}

testConnection();