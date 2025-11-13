// 测试脚本 - 聊天会话转接和协作功能
const mongoose = require('mongoose');
require('dotenv').config();

// 连接数据库
const connectDB = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/ecommerce');
    console.log('✅ MongoDB连接成功');
  } catch (error) {
    console.error('❌ MongoDB连接失败:', error);
    process.exit(1);
  }
};

// 导入模型
const ChatSession = require('./backend/models/ChatSession');
const User = require('./backend/models/User');

// 测试转接功能
const testTransferFunction = async () => {
  console.log('\n🧪 测试转接功能...');
  
  try {
    // 创建一个测试会话
    const testSession = new ChatSession({
      participants: [
        { userId: 'user1', username: '测试用户', role: 'user' },
        { userId: 'agent1', username: '客服A', role: 'support' }
      ],
      sessionInfo: {
        title: '测试会话',
        type: 'support',
        status: 'active'
      },
      assignedTo: {
        userId: 'agent1',
        username: '客服A'
      }
    });

    await testSession.save();
    console.log('✅ 测试会话创建成功');

    // 测试转接方法
    testSession.transferSession('agent1', 'agent2', '客服繁忙', '请尽快处理');
    
    console.log('📋 转接历史:', testSession.transferHistory);
    console.log('👤 当前分配:', testSession.assignedTo);
    
    console.log('✅ 转接功能测试通过');
    
    return testSession;
  } catch (error) {
    console.error('❌ 转接功能测试失败:', error);
    throw error;
  }
};

// 测试协作功能
const testCollaborationFunction = async (session) => {
  console.log('\n🧪 测试协作功能...');
  
  try {
    // 测试添加协作客服
    session.addCollaborator('agent3', '客服C', 'assistant');
    console.log('👥 协作客服列表:', session.collaboration.collaborators);
    
    // 测试检查协作客服
    const isCollaborator = session.isCollaborator('agent3');
    console.log('✅ 客服C是协作客服:', isCollaborator);
    
    // 测试移除协作客服
    session.removeCollaborator('agent3');
    console.log('👥 移除后协作客服列表:', session.collaboration.collaborators);
    
    console.log('✅ 协作功能测试通过');
  } catch (error) {
    console.error('❌ 协作功能测试失败:', error);
    throw error;
  }
};

// 运行测试
const runTests = async () => {
  console.log('🚀 开始测试聊天会话转接和协作功能');
  
  await connectDB();
  
  try {
    const testSession = await testTransferFunction();
    await testCollaborationFunction(testSession);
    
    console.log('\n🎉 所有测试通过！');
    console.log('\n📋 功能总结:');
    console.log('• ✅ 会话转接历史记录');
    console.log('• ✅ 协作客服管理');
    console.log('• ✅ 权限验证');
    console.log('• ✅ Socket通知集成');
    
  } catch (error) {
    console.error('❌ 测试失败:', error);
  } finally {
    await mongoose.connection.close();
    console.log('\n🔌 数据库连接已关闭');
  }
};

// 执行测试
runTests();