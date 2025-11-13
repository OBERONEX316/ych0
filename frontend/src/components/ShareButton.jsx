import React, { useState, useEffect } from 'react';
import { Share2, Facebook, Twitter, Link, Mail } from 'lucide-react';
import { productAPI } from '../services/api';

const ShareButton = ({ productId, className = '' }) => {
  const [showShareOptions, setShowShareOptions] = useState(false);
  const [product, setProduct] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (productId) {
      fetchProductInfo();
    }
  }, [productId]);

  const fetchProductInfo = async () => {
    try {
      setLoading(true);
      const response = await productAPI.getProduct(productId);
      if (response.success) {
        setProduct(response.data);
      }
    } catch (error) {
      console.error('获取商品信息失败:', error);
    } finally {
      setLoading(false);
    }
  };

  const shareUrl = `${window.location.origin}/product/${productId}`;
  const shareText = product 
    ? `看看这个很棒的商品：${product.name} - 仅售¥${product.price}`
    : '分享这个很棒的商品！';

  const shareOptions = [
    {
      name: '复制链接',
      icon: Link,
      action: async () => {
        try {
          await navigator.clipboard.writeText(shareUrl);
          alert('链接已复制到剪贴板！');
        } catch (error) {
          console.error('复制链接失败:', error);
        }
      }
    },
    {
      name: 'Facebook',
      icon: Facebook,
      action: () => {
        window.open(
          `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(shareUrl)}`,
          '_blank'
        );
      }
    },
    {
      name: 'Twitter',
      icon: Twitter,
      action: () => {
        window.open(
          `https://twitter.com/intent/tweet?text=${encodeURIComponent(shareText)}&url=${encodeURIComponent(shareUrl)}`,
          '_blank'
        );
      }
    },
    {
      name: '邮件分享',
      icon: Mail,
      action: () => {
        window.location.href = `mailto:?subject=${encodeURIComponent(product.name)}&body=${encodeURIComponent(`${shareText}\n\n${shareUrl}`)}`;
      }
    }
  ];

  const handleNativeShare = async () => {
    try {
      if (navigator.share) {
        await navigator.share({
          title: product.name,
          text: shareText,
          url: shareUrl,
        });
      } else {
        setShowShareOptions(!showShareOptions);
      }
    } catch (error) {
      console.error('分享失败:', error);
    }
  };

  return (
    <div className="relative">
      <button
        onClick={handleNativeShare}
        className={`p-2 rounded-full bg-gray-100 text-gray-600 hover:bg-gray-200 transition-colors ${className}`}
        title="分享商品"
      >
        <Share2 className="h-5 w-5" />
      </button>

      {showShareOptions && (
        <div className="absolute top-full right-0 mt-2 bg-white rounded-lg shadow-lg border border-gray-200 p-2 z-10 min-w-[150px]">
          <div className="space-y-1">
            {shareOptions.map((option) => {
              const IconComponent = option.icon;
              return (
                <button
                  key={option.name}
                  onClick={() => {
                    option.action();
                    setShowShareOptions(false);
                  }}
                  className="w-full flex items-center space-x-2 px-3 py-2 text-sm text-gray-700 hover:bg-gray-100 rounded-md transition-colors"
                >
                  <IconComponent className="h-4 w-4" />
                  <span>{option.name}</span>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* 点击外部关闭分享选项 */}
      {showShareOptions && (
        <div
          className="fixed inset-0 z-0"
          onClick={() => setShowShareOptions(false)}
        />
      )}
    </div>
  );
};

export default ShareButton;