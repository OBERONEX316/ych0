const mongoose = require('mongoose');

const connectDB = async () => {
  try {
    const conn = await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/ecommerce');
    
    console.log(`✅ MongoDB 连接成功: ${conn.connection.host}`);
    console.log(`📊 数据库名称: ${conn.connection.name}`);
    
    return conn;
  } catch (error) {
    console.error('❌ MongoDB 连接失败:', error.message);
    process.exit(1);
  }
};

module.exports = connectDB;