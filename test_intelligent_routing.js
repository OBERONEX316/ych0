const mongoose = require('mongoose');
const ChatSession = require('./backend/models/ChatSession');
const ChatMessage = require('./backend/models/ChatMessage');
const User = require('./backend/models/User');
const chatAssignmentService = require('./backend/services/chatAssignmentService');
const intelligentRoutingService = require('./backend/services/intelligentRoutingService');
const aiChatbotService = require('./backend/services/aiChatbotService');

// 连接数据库
async function connectDB() {
  try {
    await mongoose.connect('mongodb://localhost:27017/customer_support', {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    console.log('✅ 数据库连接成功');
  } catch (error) {
    console.error('❌ 数据库连接失败:', error);
    process.exit(1);
  }
}

// 创建测试数据
async function createTestData() {
  console.log('\n📝 创建测试数据...');
  
  // 创建测试客服
  const agents = [
    {
      username: 'tech_support',
      email: 'tech@example.com',
      password: 'password123',
      role: 'support',
      supportSettings: {
        specialties: ['技术问题', '账号问题', '支付问题'],
        maxSessions: 5,
        responseTime: 120
      }
    },
    {
      username: 'billing_support',
      email: 'billing@example.com',
      password: 'password123',
      role: 'support',
      supportSettings: {
        specialties: ['账单问题', '退款问题', '支付问题'],
        maxSessions: 3,
        responseTime: 180
      }
    }
  ];

  for (const agentData of agents) {
    let agent = await User.findOne({ email: agentData.email });
    if (!agent) {
      agent = new User(agentData);
      await agent.save();
      console.log(`✅ 创建客服: ${agent.username}`);
    }
    
    // 添加到在线客服列表
    chatAssignmentService.addAgent({
      userId: agent._id.toString(),
      username: agent.username,
      specialties: agent.supportSettings.specialties,
      maxSessions: agent.supportSettings.maxSessions,
      responseTime: agent.supportSettings.responseTime
    });
  }

  console.log('✅ 测试客服已添加到在线列表');
}

// 测试智能路由
async function testIntelligentRouting() {
  console.log('\n🧠 测试智能路由功能...');

  // 测试不同场景的会话
  const testScenarios = [
    {
      title: '技术问题会话',
      message: '我的账号无法登录，提示密码错误',
      expectedTags: ['技术问题', '账号问题'],
      expectedPriority: 'medium'
    },
    {
      title: '紧急账单问题',
      message: '我的账单被错误扣款了，需要立即处理！',
      expectedTags: ['账单问题', '紧急'],
      expectedPriority: 'high'
    },
    {
      title: '一般咨询',
      message: '你好，我想了解一下你们的产品',
      expectedTags: ['咨询'],
      expectedPriority: 'low'
    }
  ];

  for (const scenario of testScenarios) {
    console.log(`\n📋 测试场景: ${scenario.title}`);
    console.log(`💬 消息内容: ${scenario.message}`);

    // 分析会话
    const analysis = intelligentRoutingService.analyzeSession(scenario.message);
    console.log(`🏷️  分析结果 - 标签: ${analysis.tags.join(', ')}`);
    console.log(`🚦 优先级: ${analysis.priority}`);
    console.log(`📊 置信度: ${analysis.confidence}`);

    // 验证分析结果
    const hasExpectedTags = scenario.expectedTags.every(tag => 
      analysis.tags.includes(tag)
    );
    const priorityMatch = analysis.priority === scenario.expectedPriority;

    if (hasExpectedTags && priorityMatch) {
      console.log('✅ 路由分析测试通过');
    } else {
      console.log('❌ 路由分析测试失败');
      console.log(`   期望标签: ${scenario.expectedTags.join(', ')}`);
      console.log(`   期望优先级: ${scenario.expectedPriority}`);
    }
  }
}

// 测试自动回复
async function testAutoReply() {
  console.log('\n🤖 测试自动回复功能...');

  const testMessages = [
    '你好',
    '谢谢',
    '你们的工作时间是什么时候？',
    '怎么联系客服？',
    '我有一个复杂的技术问题需要帮助'
  ];

  for (const message of testMessages) {
    console.log(`\n💬 测试消息: ${message}`);
    
    const autoReply = intelligentRoutingService.getAutoReply(message);
    if (autoReply && autoReply.shouldReply) {
      console.log(`✅ 需要自动回复: ${autoReply.response.substring(0, 50)}...`);
      console.log(`📋 回复类型: ${autoReply.type}`);
    } else {
      console.log('❌ 不需要自动回复');
    }
  }
}

// 测试AI回复
async function testAIResponse() {
  console.log('\n🤖 测试AI回复功能...');

  const testMessages = [
    '我的订单123456在哪里？',
    '如何退款？',
    '产品使用遇到问题',
    '简单的问候消息不需要AI回复'
  ];

  for (const message of testMessages) {
    console.log(`\n💬 测试消息: ${message}`);
    
    const shouldUseAI = aiChatbotService.shouldUseAI(message);
    console.log(`🤖 是否需要AI回复: ${shouldUseAI}`);
    
    if (shouldUseAI) {
      try {
        // 模拟AI回复
        const mockSession = { _id: 'test-session-id' };
        const mockHistory = [
          { content: '你好，我需要帮助', sender: { role: 'user' } }
        ];
        
        const aiResponse = await aiChatbotService.generateAIResponse(
          message, 
          mockSession, 
          mockHistory
        );
        
        console.log(`💡 AI回复: ${aiResponse.substring(0, 80)}...`);
        
        // 测试是否需要转接人工
        const shouldEscalate = aiChatbotService.shouldEscalateToHuman(aiResponse, message);
        console.log(`🚨 是否需要转接人工: ${shouldEscalate}`);
        
      } catch (error) {
        console.log('❌ AI回复测试失败:', error.message);
      }
    }
  }
}

// 测试会话分配
async function testSessionAssignment() {
  console.log('\n🎯 测试会话分配功能...');

  // 创建测试会话
  const testSession = new ChatSession({
    participants: [
      {
        userId: new mongoose.Types.ObjectId(),
        username: 'test_user',
        role: 'user'
      }
    ],
    status: 'active',
    priority: 'medium',
    tags: ['技术问题', '账号问题']
  });

  await testSession.save();
  console.log(`✅ 创建测试会话: ${testSession._id}`);

  // 测试分配
  try {
    const assignmentResult = await chatAssignmentService.assignSession(testSession);
    
    if (assignmentResult.success) {
      console.log('✅ 会话分配成功');
      console.log(`👤 分配给的客服: ${assignmentResult.agent.username}`);
      console.log(`🎯 匹配分数: ${assignmentResult.score}`);
    } else {
      console.log('⏳ 会话加入队列');
      console.log(`📊 队列位置: ${assignmentResult.queuePosition}`);
    }

    // 检查队列状态
    const queueStatus = chatAssignmentService.getStatus();
    console.log(`📊 队列状态: ${queueStatus.queueSize} 个会话在队列中`);
    console.log(`👥 在线客服: ${queueStatus.availableAgents} 人`);

  } catch (error) {
    console.log('❌ 会话分配测试失败:', error.message);
  }

  // 清理测试会话
  await ChatSession.findByIdAndDelete(testSession._id);
}

// 主测试函数
async function main() {
  console.log('🚀 开始测试智能路由和自动回复功能\n');

  await connectDB();
  await createTestData();

  // 运行各项测试
  await testIntelligentRouting();
  await testAutoReply();
  await testAIResponse();
  await testSessionAssignment();

  console.log('\n🎉 所有测试完成！');
  
  // 显示最终状态
  const status = chatAssignmentService.getStatus();
  console.log('\n📊 最终状态:');
  console.log(`  在线客服: ${status.availableAgents}`);
  console.log(`  队列会话: ${status.queueSize}`);
  console.log(`  处理中会话: ${status.activeSessions}`);

  // 关闭数据库连接
  await mongoose.connection.close();
  console.log('\n✅ 数据库连接已关闭');
}

// 运行测试
main().catch(console.error);