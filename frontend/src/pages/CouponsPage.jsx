import React, { useState, useEffect } from 'react';
import { couponAPI } from '../services/api';
import CouponCard from '../components/CouponCard';

const CouponsPage = () => {
  const [availableCoupons, setAvailableCoupons] = useState([]);
  const [usedCoupons, setUsedCoupons] = useState([]);
  const [publicCoupons, setPublicCoupons] = useState([]);
  const [activeTab, setActiveTab] = useState('available');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    loadCoupons();
  }, []);

  const loadCoupons = async () => {
    try {
      setLoading(true);
      setError('');

      // 并行加载所有优惠券数据
      const [availableData, usedData, publicData] = await Promise.allSettled([
        couponAPI.getUserAvailableCoupons(),
        couponAPI.getUserUsedCoupons({ limit: 20 }),
        couponAPI.getPublicCoupons()
      ]);

      if (availableData.status === 'fulfilled') {
        setAvailableCoupons(availableData.value.data || availableData.value);
      }

      if (usedData.status === 'fulfilled') {
        setUsedCoupons(usedData.value.data || usedData.value);
      }

      if (publicData.status === 'fulfilled') {
        setPublicCoupons(publicData.value.coupons || publicData.value);
      }

    } catch (err) {
      console.error('加载优惠券失败:', err);
      setError('加载优惠券失败，请稍后重试');
    } finally {
      setLoading(false);
    }
  };

  const handleCouponClaimed = (claimedCoupon) => {
    // 从公开优惠券中移除已领取的优惠券
    setPublicCoupons(prev => 
      prev.filter(coupon => coupon._id !== claimedCoupon._id)
    );
    
    // 添加到可用优惠券列表
    setAvailableCoupons(prev => [claimedCoupon, ...prev]);
    
    // 切换到可用优惠券标签页
    setActiveTab('available');
  };

  const renderTabContent = () => {
    switch (activeTab) {
      case 'available':
        return renderCouponList(availableCoupons, 'available');
      case 'used':
        return renderCouponList(usedCoupons, 'used');
      case 'public':
        return renderCouponList(publicCoupons, 'public');
      default:
        return null;
    }
  };

  const renderCouponList = (coupons, type) => {
    if (loading) {
      return (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="bg-gray-200 rounded-lg p-4 animate-pulse h-48">
              <div className="h-6 bg-gray-300 rounded mb-3"></div>
              <div className="h-4 bg-gray-300 rounded mb-2"></div>
              <div className="h-4 bg-gray-300 rounded mb-2"></div>
              <div className="h-10 bg-gray-300 rounded mt-4"></div>
            </div>
          ))}
        </div>
      );
    }

    if (coupons.length === 0) {
      return (
        <div className="text-center py-12">
          <div className="text-gray-400 text-6xl mb-4">🎁</div>
          <h3 className="text-lg font-semibold text-gray-600 mb-2">
            {type === 'available' && '暂无可用优惠券'}
            {type === 'used' && '暂无使用记录'}
            {type === 'public' && '暂无公开优惠券'}
          </h3>
          <p className="text-gray-500">
            {type === 'available' && '快去领取一些优惠券吧！'}
            {type === 'used' && '使用优惠券后记录会显示在这里'}
            {type === 'public' && '管理员正在准备新的优惠活动'}
          </p>
        </div>
      );
    }

    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {coupons.map((coupon) => (
          <CouponCard
            key={coupon._id}
            coupon={coupon}
            isClaimed={type !== 'public'}
            onClaim={handleCouponClaimed}
            showClaimButton={type === 'public'}
            className="h-full"
          />
        ))}
      </div>
    );
  };

  if (error) {
    return (
      <div className="max-w-6xl mx-auto px-4 py-8">
        <div className="bg-red-50 border border-red-200 rounded-lg p-6 text-center">
          <div className="text-red-500 text-4xl mb-4">❌</div>
          <h2 className="text-lg font-semibold text-red-800 mb-2">加载失败</h2>
          <p className="text-red-600 mb-4">{error}</p>
          <button
            onClick={loadCoupons}
            className="bg-red-600 text-white px-6 py-2 rounded-lg hover:bg-red-700 transition-colors"
          >
            重新加载
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      {/* 页面标题 */}
      <div className="text-center mb-8">
        <h1 className="text-3xl font-bold text-gray-800 mb-2">优惠券中心</h1>
        <p className="text-gray-600">领取和使用优惠券，享受购物优惠</p>
      </div>

      {/* 标签导航 */}
      <div className="bg-white rounded-lg shadow-sm border mb-8">
        <div className="flex border-b">
          {[
            { key: 'available', label: '可用优惠券', count: availableCoupons.length },
            { key: 'used', label: '已使用', count: usedCoupons.length },
            { key: 'public', label: '领取优惠券', count: publicCoupons.length }
          ].map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`flex-1 py-4 px-6 text-center font-medium transition-colors ${
                activeTab === tab.key
                  ? 'text-blue-600 border-b-2 border-blue-600'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              <span className="flex items-center justify-center gap-2">
                {tab.label}
                {tab.count > 0 && (
                  <span className="bg-blue-100 text-blue-600 text-xs px-2 py-1 rounded-full">
                    {tab.count}
                  </span>
                )}
              </span>
            </button>
          ))}
        </div>

        {/* 标签内容 */}
        <div className="p-6">
          {renderTabContent()}
        </div>
      </div>

      {/* 使用说明 */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
        <h3 className="text-lg font-semibold text-blue-800 mb-4">💡 使用说明</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
          <div>
            <h4 className="font-medium text-blue-700 mb-2">1. 领取优惠券</h4>
            <p className="text-blue-600">在"领取优惠券"标签页选择喜欢的优惠券点击领取</p>
          </div>
          <div>
            <h4 className="font-medium text-blue-700 mb-2">2. 查看优惠券</h4>
            <p className="text-blue-600">在"可用优惠券"标签页查看已领取的优惠券</p>
          </div>
          <div>
            <h4 className="font-medium text-blue-700 mb-2">3. 使用优惠券</h4>
            <p className="text-blue-600">在结算页面选择可用的优惠券享受折扣</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CouponsPage;