const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const User = require('./models/User');

const testLogin = async () => {
  try {
    await mongoose.connect('mongodb://localhost:27017/ecommerce');
    console.log('✅ MongoDB 连接成功');

    // 首先尝试查找现有的demo用户
    let testUser = await User.findOne({ username: 'demo_user' }).select('+password');
    
    if (!testUser) {
      // 创建测试用户
      testUser = new User({
        username: 'demo_user',
        email: 'demo@example.com',
        password: '$2b$10$qqfJXTy6MTSoAqh5c3vrXOeX4NdpgPkNkxb0D74HhgVbf4ELjT5Ry', // password
        firstName: 'Demo',
        lastName: 'User',
        phone: '13800138000',
        addresses: [{
          recipient: 'Demo User',
          phone: '13800138000',
          province: '北京',
          city: '北京',
          district: '朝阳区',
          detail: '测试街道123号',
          isDefault: true,
          postalCode: '100000'
        }],
        roles: ['user']
      });

      await testUser.save();
      console.log('✅ 测试用户创建成功');
    } else {
      console.log('✅ 使用现有测试用户');
    }

    // 验证密码
    console.log('测试用户密码哈希:', testUser.password);
    const isPasswordValid = await bcrypt.compare('password', testUser.password);
    console.log('密码验证结果:', isPasswordValid);

    // 测试不同的用户名查找方式
    const foundByUsername = await User.findOne({ username: 'demo_user' }).select('+password');
    if (foundByUsername) {
      const isValidByUsername = await bcrypt.compare('password', foundByUsername.password);
      console.log('通过用户名找到的用户的密码验证结果:', isValidByUsername);
    }

    // 测试email查找方式
    const foundByEmail = await User.findOne({ email: 'demo@example.com' }).select('+password');
    if (foundByEmail) {
      const isValidByEmail = await bcrypt.compare('password', foundByEmail.password);
      console.log('通过email找到的用户的密码验证结果:', isValidByEmail);
    }

  } catch (error) {
    console.error('❌ 测试失败:', error);
  } finally {
    await mongoose.disconnect();
    console.log('👋 数据库连接已关闭');
  }
};

testLogin();