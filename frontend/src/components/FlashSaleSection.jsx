import React, { useState, useEffect, useCallback } from 'react';
import { Clock, Users, TrendingUp, ShoppingCart, Eye, Heart, Share2, Bell } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useCart } from '../contexts/CartContext';
import { flashSaleAPI } from '../services/api';
import { toast } from 'sonner';

const FlashSaleCard = ({ sale, onParticipate }) => {
  const { isAuthenticated } = useAuth();
  const { addToCart } = useCart();
  const [timeLeft, setTimeLeft] = useState({});
  const [isParticipating, setIsParticipating] = useState(false);

  // 计算剩余时间
  const calculateTimeLeft = useCallback(() => {
    const now = new Date();
    let targetTime;
    
    if (sale.isActive) {
      targetTime = new Date(sale.endTime);
    } else if (sale.isUpcoming) {
      targetTime = new Date(sale.startTime);
    } else {
      return {};
    }
    
    const difference = targetTime - now;
    
    if (difference > 0) {
      const days = Math.floor(difference / (1000 * 60 * 60 * 24));
      const hours = Math.floor((difference % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
      const minutes = Math.floor((difference % (1000 * 60 * 60)) / (1000 * 60));
      const seconds = Math.floor((difference % (1000 * 60)) / 1000);
      
      return { days, hours, minutes, seconds };
    }
    
    return {};
  }, [sale]);

  useEffect(() => {
    const timer = setInterval(() => {
      setTimeLeft(calculateTimeLeft());
    }, 1000);

    return () => clearInterval(timer);
  }, [calculateTimeLeft]);

  // 参与秒杀
  const handleParticipate = async (product) => {
    if (!isAuthenticated) {
      toast.error('请先登录');
      return;
    }

    if (!sale.canParticipate) {
      toast.error('您不符合参与条件');
      return;
    }

    setIsParticipating(true);
    
    try {
      const response = await flashSaleAPI.participate({
        flashSaleId: sale._id,
        productId: product.product._id,
        quantity: 1
      });

      if (response.success) {
        // 添加到购物车
        await addToCart(product.product._id, 1, response.data.orderItem);
        
        toast.success('秒杀商品已添加到购物车！');
        if (onParticipate) {
          onParticipate(sale._id, product.product._id);
        }
      } else {
        toast.error(response.error || '参与失败');
      }
    } catch (error) {
      console.error('参与秒杀失败:', error);
      toast.error('参与秒杀失败，请重试');
    } finally {
      setIsParticipating(false);
    }
  };

  // 设置提醒
  const handleSetReminder = async () => {
    if (!isAuthenticated) {
      toast.error('请先登录');
      return;
    }

    try {
      const response = await flashSaleAPI.setReminder(sale._id, {
        enabled: true,
        reminderTime: new Date(sale.startTime).getTime() - 5 * 60 * 1000 // 提前5分钟
      });

      if (response.success) {
        toast.success('提醒设置成功！');
      } else {
        toast.error('设置提醒失败');
      }
    } catch (error) {
      console.error('设置提醒失败:', error);
      toast.error('设置提醒失败');
    }
  };

  const formatTime = (time) => {
    return time.toString().padStart(2, '0');
  };

  return (
    <div className="bg-white rounded-xl shadow-lg overflow-hidden border border-gray-200 hover:shadow-xl transition-shadow duration-300">
      {/* 活动头部 */}
      <div className="relative">
        <div className="bg-gradient-to-r from-red-500 to-pink-500 text-white p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <TrendingUp className="h-5 w-5" />
              <span className="font-bold text-lg">{sale.title}</span>
            </div>
            <div className="flex items-center space-x-2">
              {sale.isActive && (
                <span className="bg-white text-red-500 px-2 py-1 rounded-full text-xs font-bold">
                  进行中
                </span>
              )}
              {sale.isUpcoming && (
                <span className="bg-yellow-400 text-yellow-900 px-2 py-1 rounded-full text-xs font-bold">
                  即将开始
                </span>
              )}
            </div>
          </div>
          
          {/* 倒计时 */}
          {Object.keys(timeLeft).length > 0 && (
            <div className="mt-3 flex items-center space-x-2">
              <Clock className="h-4 w-4" />
              <div className="flex space-x-1 text-sm">
                {timeLeft.days > 0 && (
                  <span className="bg-black bg-opacity-20 px-2 py-1 rounded">
                    {formatTime(timeLeft.days)}天
                  </span>
                )}
                <span className="bg-black bg-opacity-20 px-2 py-1 rounded">
                  {formatTime(timeLeft.hours || 0)}:{formatTime(timeLeft.minutes || 0)}:{formatTime(timeLeft.seconds || 0)}
                </span>
              </div>
            </div>
          )}
        </div>
        
        {/* 活动图片 */}
        <div className="relative h-48 bg-gray-100">
          <img
            src={sale.image || '/images/flash-sale-default.jpg'}
            alt={sale.title}
            className="w-full h-full object-cover"
          />
          <div className="absolute top-2 right-2">
            <button
              onClick={handleSetReminder}
              className="bg-white bg-opacity-90 hover:bg-opacity-100 p-2 rounded-full shadow-md transition-all"
              title="设置提醒"
            >
              <Bell className="h-4 w-4 text-gray-700" />
            </button>
          </div>
        </div>
      </div>

      {/* 活动描述 */}
      <div className="p-4 border-b border-gray-100">
        <p className="text-gray-600 text-sm line-clamp-2">{sale.description}</p>
        
        {/* 统计信息 */}
        <div className="flex items-center justify-between mt-3 text-xs text-gray-500">
          <div className="flex items-center space-x-4">
            <span className="flex items-center">
              <Eye className="h-3 w-3 mr-1" />
              {sale.statistics.totalViews} 浏览
            </span>
            <span className="flex items-center">
              <Users className="h-3 w-3 mr-1" />
              {sale.statistics.totalParticipants} 参与
            </span>
          </div>
          <span>进度: {sale.progress}%</span>
        </div>
      </div>

      {/* 商品列表 */}
      <div className="p-4 space-y-4">
        {sale.products.slice(0, 3).map((product, index) => (
          <div key={product.product._id} className="flex items-center space-x-3 p-3 bg-gray-50 rounded-lg">
            <img
              src={product.product.images[0] || '/images/product-default.jpg'}
              alt={product.product.name}
              className="w-16 h-16 object-cover rounded-lg"
            />
            
            <div className="flex-1 min-w-0">
              <h4 className="font-medium text-sm text-gray-900 truncate">
                {product.product.name}
              </h4>
              <div className="flex items-center space-x-2 mt-1">
                <span className="text-red-600 font-bold text-lg">
                  ¥{product.flashPrice}
                </span>
                <span className="text-gray-400 line-through text-sm">
                  ¥{product.originalPrice}
                </span>
                <span className="bg-red-100 text-red-600 px-2 py-0.5 rounded text-xs font-bold">
                  -{product.discount}%
                </span>
              </div>
              <div className="flex items-center justify-between mt-2">
                <span className="text-xs text-gray-500">
                  库存: {product.stock} | 已售: {product.sold}
                </span>
                <span className="text-xs text-gray-500">
                  限购: {product.limitPerUser}件/人
                </span>
              </div>
            </div>
            
            <button
              onClick={() => handleParticipate(product)}
              disabled={!sale.isActive || isParticipating || product.stock === 0}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                !sale.isActive || product.stock === 0
                  ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                  : sale.isActive
                  ? 'bg-red-500 hover:bg-red-600 text-white'
                  : 'bg-yellow-500 hover:bg-yellow-600 text-white'
              }`}
            >
              {isParticipating ? (
                <div className="flex items-center">
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  抢购中...
                </div>
              ) : product.stock === 0 ? (
                '已售罄'
              ) : sale.isActive ? (
                '立即抢购'
              ) : (
                '即将开始'
              )}
            </button>
          </div>
        ))}
        
        {sale.products.length > 3 && (
          <Link
            to={`/flash-sale/${sale._id}`}
            className="block text-center text-primary-600 hover:text-primary-700 text-sm font-medium py-2"
          >
            查看全部 {sale.products.length} 件商品 →
          </Link>
        )}
      </div>
    </div>
  );
};

const FlashSaleSection = ({ title = '限时秒杀', limit = 4 }) => {
  const [flashSales, setFlashSales] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchFlashSales();
  }, []);

  const fetchFlashSales = async () => {
    try {
      setLoading(true);
      
      // 获取活跃的秒杀活动
      const activeResponse = await flashSaleAPI.getActiveSales();
      
      // 获取即将开始的秒杀活动
      const upcomingResponse = await flashSaleAPI.getUpcomingSales();
      
      if (activeResponse.success && upcomingResponse.success) {
        const allSales = [
          ...activeResponse.data,
          ...upcomingResponse.data
        ].slice(0, limit);
        
        setFlashSales(allSales);
      } else {
        throw new Error('获取秒杀活动失败');
      }
    } catch (err) {
      console.error('获取秒杀活动失败:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="bg-white rounded-xl shadow-lg p-8">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto mb-4"></div>
          <p className="text-gray-600">加载秒杀活动中...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-white rounded-xl shadow-lg p-8">
        <div className="text-center text-red-600">
          <p>加载失败: {error}</p>
          <button
            onClick={fetchFlashSales}
            className="mt-4 bg-primary-600 text-white px-4 py-2 rounded-lg hover:bg-primary-700"
          >
            重新加载
          </button>
        </div>
      </div>
    );
  }

  if (flashSales.length === 0) {
    return null; // 没有秒杀活动时不显示
  }

  return (
    <section className="py-16 bg-gradient-to-br from-red-50 to-pink-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* 头部 */}
        <div className="text-center mb-12">
          <div className="flex items-center justify-center space-x-2 mb-4">
            <TrendingUp className="h-8 w-8 text-red-500" />
            <h2 className="text-3xl font-bold text-gray-900">{title}</h2>
            <TrendingUp className="h-8 w-8 text-red-500" />
          </div>
          <p className="text-lg text-gray-600 max-w-2xl mx-auto">
            限时特惠，错过再等一年！精选商品超低价格，数量有限，先到先得！
          </p>
        </div>

        {/* 秒杀活动网格 */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {flashSales.map((sale) => (
            <FlashSaleCard
              key={sale._id}
              sale={sale}
              onParticipate={fetchFlashSales}
            />
          ))}
        </div>

        {/* 查看更多 */}
        <div className="text-center mt-12">
          <a
            href="/flash-sales"
            className="inline-flex items-center px-8 py-3 bg-red-600 text-white font-medium rounded-lg hover:bg-red-700 transition-colors"
          >
            查看更多秒杀活动
            <TrendingUp className="ml-2 h-5 w-5" />
          </a>
        </div>
      </div>
    </section>
  );
};

export default FlashSaleSection;