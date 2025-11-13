const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const User = require('./models/User');

const fixDemoPasswords = async () => {
  try {
    await mongoose.connect('mongodb://localhost:27017/ecommerce');
    console.log('✅ MongoDB 连接成功');

    const correctPasswordHash = '$2b$10$qqfJXTy6MTSoAqh5c3vrXOeX4NdpgPkNkxb0D74HhgVbf4ELjT5Ry'; // password

    // 更新普通用户 - 使用 updateOne 避免触发 pre-save 钩子
    const regularUserResult = await User.updateOne(
      { username: 'demo_user' },
      { $set: { password: correctPasswordHash } }
    );
    if (regularUserResult.modifiedCount > 0) {
      console.log('✅ 普通用户密码已更新');
    }

    // 更新管理员用户 - 使用 updateOne 避免触发 pre-save 钩子
    const adminUserResult = await User.updateOne(
      { username: 'demo_admin' },
      { $set: { password: correctPasswordHash } }
    );
    if (adminUserResult.modifiedCount > 0) {
      console.log('✅ 管理员用户密码已更新');
    }

    console.log('🎉 演示用户密码修复完成！');
  } catch (error) {
    console.error('❌ 修复失败:', error);
  } finally {
    await mongoose.disconnect();
    console.log('👋 数据库连接已关闭');
  }
};

fixDemoPasswords();