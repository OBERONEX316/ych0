import React, { useState } from 'react';
import { couponAPI } from '../services/api';

const CouponCard = ({ 
  coupon, 
  isClaimed = false, 
  onClaim, 
  showClaimButton = true,
  className = '' 
}) => {
  const [isClaiming, setIsClaiming] = useState(false);
  const [claimError, setClaimError] = useState('');
  const [isClaimedState, setIsClaimedState] = useState(isClaimed);

  const handleClaimCoupon = async () => {
    if (isClaimedState) return;
    
    setIsClaiming(true);
    setClaimError('');
    
    try {
      await couponAPI.claimCoupon(coupon._id);
      setIsClaimedState(true);
      onClaim?.(coupon);
    } catch (error) {
      setClaimError(error.response?.data?.error || '领取失败');
    } finally {
      setIsClaiming(false);
    }
  };

  const getDiscountText = () => {
    switch (coupon.type) {
      case 'percentage':
        return `${coupon.discountValue}% 折扣`;
      case 'fixed':
        return `¥${coupon.discountValue} 立减`;
      case 'free_shipping':
        return '免运费';
      default:
        return '优惠券';
    }
  };

  const getCouponStyle = () => {
    const baseStyle = "relative bg-gradient-to-r rounded-lg p-4 border-2 ";
    
    if (isClaimedState) {
      return baseStyle + "from-gray-300 to-gray-400 border-gray-400 text-gray-600";
    }
    
    if (!coupon.isValid) {
      return baseStyle + "from-gray-200 to-gray-300 border-gray-300 text-gray-500";
    }
    
    // 根据优惠券类型设置不同颜色
    switch (coupon.type) {
      case 'percentage':
        return baseStyle + "from-red-400 to-red-500 border-red-400 text-white";
      case 'fixed':
        return baseStyle + "from-blue-400 to-blue-500 border-blue-400 text-white";
      case 'free_shipping':
        return baseStyle + "from-green-400 to-green-500 border-green-400 text-white";
      default:
        return baseStyle + "from-purple-400 to-purple-500 border-purple-400 text-white";
    }
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('zh-CN');
  };

  return (
    <div className={`${getCouponStyle()} ${className} shadow-md hover:shadow-lg transition-shadow`}>
      {/* 优惠券顶部装饰 */}
      <div className="absolute top-0 left-0 w-full h-1 bg-white/20"></div>
      
      {/* 优惠券内容 */}
      <div className="flex flex-col h-full">
        {/* 优惠券代码和折扣信息 */}
        <div className="flex justify-between items-start mb-3">
          <div>
            <h3 className="text-lg font-bold truncate">{coupon.name}</h3>
            <p className="text-sm opacity-90">{coupon.code}</p>
          </div>
          <div className="text-2xl font-bold">
            {getDiscountText()}
          </div>
        </div>

        {/* 优惠券描述 */}
        {coupon.description && (
          <p className="text-sm mb-3 opacity-90 line-clamp-2">
            {coupon.description}
          </p>
        )}

        {/* 使用条件 */}
        <div className="text-xs space-y-1 mb-3">
          {coupon.minPurchaseAmount > 0 && (
            <p>满 ¥{coupon.minPurchaseAmount} 可用</p>
          )}
          {coupon.maxDiscountAmount && (
            <p>最高减 ¥{coupon.maxDiscountAmount}</p>
          )}
          {coupon.usageLimitPerUser > 0 && (
            <p>每人限领 {coupon.usageLimitPerUser} 次</p>
          )}
        </div>

        {/* 有效期 */}
        <div className="text-xs mb-3">
          <p>有效期: {formatDate(coupon.validFrom)} - {formatDate(coupon.validUntil)}</p>
        </div>

        {/* 状态信息 */}
        <div className="text-xs mb-3">
          {isClaimedState ? (
            <span className="text-green-200">✓ 已领取</span>
          ) : !coupon.isValid ? (
            <span className="text-red-200">已过期</span>
          ) : coupon.usageLimitTotal > 0 && coupon.totalUsageCount >= coupon.usageLimitTotal ? (
            <span className="text-red-200">已领完</span>
          ) : (
            <span className="text-green-200">可领取</span>
          )}
        </div>

        {/* 领取按钮 */}
        {showClaimButton && !isClaimedState && coupon.isValid && (
          <div className="mt-auto">
            <button
              onClick={handleClaimCoupon}
              disabled={isClaiming || !coupon.isValid}
              className="w-full bg-white text-gray-800 py-2 px-4 rounded font-semibold 
                       hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed
                       transition-colors"
            >
              {isClaiming ? '领取中...' : '立即领取'}
            </button>
            
            {claimError && (
              <p className="text-red-200 text-xs mt-2">{claimError}</p>
            )}
          </div>
        )}

        {/* 已领取状态 */}
        {showClaimButton && isClaimedState && (
          <button
            disabled
            className="w-full bg-gray-100 text-gray-500 py-2 px-4 rounded font-semibold"
          >
            已领取
          </button>
        )}
      </div>

      {/* 优惠券边缘锯齿效果 */}
      <div className="absolute -right-1 top-1/2 transform -translate-y-1/2 w-2 h-full">
        {Array.from({ length: 8 }).map((_, i) => (
          <div 
            key={i}
            className="w-2 h-2 bg-white rounded-full absolute"
            style={{ top: `${i * 12.5}%` }}
          />
        ))}
      </div>
    </div>
  );
};

export default CouponCard;