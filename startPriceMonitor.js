const priceMonitorService = require('./backend/services/priceMonitorService');

async function startPriceMonitor() {
  try {
    console.log('🚀 启动价格监控服务...');
    
    // 初始化价格监控服务
    await priceMonitorService.initialize();
    
    console.log('✅ 价格监控服务已启动');
    console.log('📊 服务将每30分钟检查一次价格变化');
    console.log('💾 价格历史数据将自动记录到数据库');
    
    // 保持进程运行
    setInterval(() => {
      // 服务会自动运行，这里只是保持进程活跃
    }, 1000 * 60 * 30); // 30分钟
    
  } catch (error) {
    console.error('❌ 启动价格监控服务失败:', error);
    process.exit(1);
  }
}

// 处理进程退出
process.on('SIGINT', () => {
  console.log('\n🛑 正在停止价格监控服务...');
  process.exit(0);
});

process.on('SIGTERM', () => {
  console.log('\n🛑 正在停止价格监控服务...');
  process.exit(0);
});

// 启动服务
startPriceMonitor();