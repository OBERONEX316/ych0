const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const User = require('../models/User');

// 数据库连接配置
const connectDB = require('../config/database');

// 测试用户数据
const users = [
  {
    username: 'admin',
    email: 'admin@example.com',
    password: 'admin123',
    firstName: '系统',
    lastName: '管理员',
    role: 'admin',
    phone: '13800138000',
    isActive: true,
    emailVerified: true
  },
  {
    username: 'johndoe',
    email: 'john@example.com',
    password: 'user123',
    firstName: 'John',
    lastName: 'Doe',
    role: 'user',
    phone: '13900139000',
    isActive: true,
    emailVerified: true
  },
  {
    username: 'janesmith',
    email: 'jane@example.com',
    password: 'user123',
    firstName: 'Jane',
    lastName: 'Smith',
    role: 'user',
    phone: '13700137000',
    isActive: true,
    emailVerified: true
  }
];

const seedUsers = async () => {
  try {
    // 连接数据库
    await connectDB();
    console.log('✅ MongoDB连接成功');

    // 清空现有用户数据
    await User.deleteMany({});
    console.log('🗑️ 已清空用户数据');

    // 创建用户
    const createdUsers = [];
    for (const userData of users) {
      // 直接创建用户，让模型处理密码加密
      const user = new User(userData);
      const savedUser = await user.save();
      createdUsers.push(savedUser);
    }

    console.log(`✅ 成功创建 ${createdUsers.length} 个用户`);
    
    // 输出用户信息
    createdUsers.forEach(user => {
      console.log(`👤 ${user.username} (${user.role}) - ${user.email}`);
    });

    console.log('\n📝 测试账号信息:');
    console.log('管理员账号: admin@example.com / admin123');
    console.log('普通用户账号: john@example.com / user123');
    console.log('普通用户账号: jane@example.com / user123');

  } catch (error) {
    console.error('❌ 用户种子数据创建失败:', error.message);
    process.exit(1);
  } finally {
    // 关闭数据库连接
    await mongoose.connection.close();
    console.log('\n🔌 数据库连接已关闭');
    process.exit(0);
  }
};

// 如果是直接运行此脚本
if (require.main === module) {
  seedUsers();
}

module.exports = seedUsers;