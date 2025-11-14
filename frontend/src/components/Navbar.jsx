import React, { useState, useCallback, memo, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { ShoppingCart, User, Search, Package, LogOut, Settings, Heart, BarChart3, Shield, Crown, Users, Gift, TrendingUp, Bell } from 'lucide-react';
import { useCart } from '../contexts/CartContext';
import { useAuth } from '../contexts/AuthContext';
import { useWishlist } from '../contexts/WishlistContext';
import { notificationAPI } from '../services/api';

const Navbar = memo(({ onCartClick, onOrdersClick }) => {
  const { cart } = useCart();
  const { isAuthenticated, user, logout } = useAuth();
  const { getWishlistCount } = useWishlist();
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    const load = async () => {
      try {
        if (isAuthenticated) {
          const res = await notificationAPI.getUnreadCount();
          const count = res?.data?.count ?? res?.data ?? 0;
          setUnreadCount(count);
        } else {
          setUnreadCount(0);
        }
      } catch (_) {
        setUnreadCount(0);
      }
    };
    load();
  }, [isAuthenticated]);

  const handleCartClick = useCallback(() => {
    if (onCartClick) {
      onCartClick();
    }
  }, [onCartClick]);

  const handleOrdersClick = useCallback(() => {
    if (onOrdersClick) {
      onOrdersClick();
    }
  }, [onOrdersClick]);

  return (
    <nav className="bg-white shadow-lg sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          {/* Logo */}
          <div className="flex-shrink-0">
            <h1 className="text-2xl font-bold text-primary-600">电商商城</h1>
          </div>

          {/* Search Bar */}
          <div className="flex-1 max-w-xl mx-8">
            <form action="/search" method="get" className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5" />
              <input
                type="text"
                name="q"
                placeholder="搜索商品..."
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              />
            </form>
          </div>

          {/* Navigation Links */}
          <div className="hidden md:flex items-center space-x-8">
            <Link to="/" className="text-gray-700 hover:text-primary-600 transition-colors">首页</Link>
            <a href="#" className="text-gray-700 hover:text-primary-600 transition-colors">商品</a>
            <a href="#" className="text-gray-700 hover:text-primary-600 transition-colors">分类</a>
            <Link to="/coupons" className="text-gray-700 hover:text-primary-600 transition-colors">优惠券</Link>
            <Link to="/about" className="text-gray-700 hover:text-primary-600 transition-colors">关于</Link>
            <Link to="/favorites/popular" className="text-gray-700 hover:text-primary-600 transition-colors">热门收藏</Link>
          </div>

          {/* User Actions */}
          <div className="flex items-center space-x-4">
            {isAuthenticated ? (
              <div className="relative">
                <button 
                  onClick={() => setShowUserMenu(!showUserMenu)}
                  className="flex items-center space-x-2 p-2 text-gray-600 hover:text-primary-600 transition-colors"
                >
                  {user?.avatar ? (
                    <img src={user.avatar} alt="avatar" className="h-6 w-6 rounded-full object-cover border" onError={(e)=>{e.currentTarget.style.display='none'}} />
                  ) : (
                    <User className="h-6 w-6" />
                  )}
                  <span className="hidden sm:block text-sm font-medium">{user?.username}</span>
                  {user?.role && (
                    <span className="hidden sm:block text-xs text-gray-500">{user.role}</span>
                  )}
                </button>
                
                {showUserMenu && (
                  <div className="absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-lg border border-gray-200 z-50">
                    <div className="p-2 border-b border-gray-100">
                      <p className="text-sm font-medium text-gray-900">{user?.username}</p>
                      <p className="text-xs text-gray-500">{user?.email}</p>
                    </div>
                    <div className="p-2">
                      <a 
                        href="/settings"
                        className="w-full flex items-center space-x-2 px-3 py-2 text-sm text-gray-700 hover:bg-gray-100 rounded-md transition-colors"
                        onClick={() => setShowUserMenu(false)}
                      >
                        <Settings className="h-4 w-4" />
                        <span>个人设置</span>
                      </a>
                      <a 
                        href="/membership"
                        className="w-full flex items-center space-x-2 px-3 py-2 text-sm text-gray-700 hover:bg-gray-100 rounded-md transition-colors"
                        onClick={() => setShowUserMenu(false)}
                      >
                        <Crown className="h-4 w-4" />
                        <span>会员中心</span>
                      </a>
                      <a 
                        href="/referral"
                        className="w-full flex items-center space-x-2 px-3 py-2 text-sm text-gray-700 hover:bg-gray-100 rounded-md transition-colors"
                        onClick={() => setShowUserMenu(false)}
                      >
                        <Gift className="h-4 w-4" />
                        <span>推荐奖励</span>
                      </a>
                      <a 
                        href="/sales-predictions"
                        className="w-full flex items-center space-x-2 px-3 py-2 text-sm text-gray-700 hover:bg-gray-100 rounded-md transition-colors"
                        onClick={() => setShowUserMenu(false)}
                      >
                        <TrendingUp className="h-4 w-4" />
                        <span>销售预测</span>
                      </a>
                      <a 
                        href="/inventory-optimization"
                        className="w-full flex items-center space-x-2 px-3 py-2 text-sm text-gray-700 hover:bg-gray-100 rounded-md transition-colors"
                        onClick={() => setShowUserMenu(false)}
                      >
                        <Shield className="h-4 w-4" />
                        <span>库存优化</span>
                      </a>
                      
                      {/* 管理员面板链接 */}
                      {(user?.role === 'admin' || user?.role === 'moderator') && (
                        <div className="border-t border-gray-100 pt-2 mt-2">
                          <p className="text-xs font-medium text-gray-500 px-3 py-1">管理员面板</p>
                          <a 
                            href="/admin"
                            className="w-full flex items-center space-x-2 px-3 py-2 text-sm text-gray-700 hover:bg-gray-100 rounded-md transition-colors"
                            onClick={() => setShowUserMenu(false)}
                          >
                            <Shield className="h-4 w-4" />
                            <span>管理控制台</span>
                          </a>
                          <a 
                            href="/admin/approval"
                            className="w-full flex items-center space-x-2 px-3 py-2 text-sm text-gray-700 hover:bg-gray-100 rounded-md transition-colors"
                            onClick={() => setShowUserMenu(false)}
                          >
                            <Shield className="h-4 w-4" />
                            <span>审批管理</span>
                          </a>
                          <a 
                            href="/admin/users"
                            className="w-full flex items-center space-x-2 px-3 py-2 text-sm text-gray-700 hover:bg-gray-100 rounded-md transition-colors"
                            onClick={() => setShowUserMenu(false)}
                          >
                            <Shield className="h-4 w-4" />
                            <span>用户管理</span>
                          </a>
                          <a 
                            href="/admin/orders"
                            className="w-full flex items-center space-x-2 px-3 py-2 text-sm text-gray-700 hover:bg-gray-100 rounded-md transition-colors"
                            onClick={() => setShowUserMenu(false)}
                          >
                            <Package className="h-4 w-4" />
                            <span>订单管理</span>
                          </a>
                          <a 
                            href="/analytics/user"
                            className="w-full flex items-center space-x-2 px-3 py-2 text-sm text-gray-700 hover:bg-gray-100 rounded-md transition-colors"
                            onClick={() => setShowUserMenu(false)}
                          >
                            <BarChart3 className="h-4 w-4" />
                            <span>用户分析</span>
                          </a>
                          <a 
                            href="/admin/after-sales"
                            className="w-full flex items-center space-x-2 px-3 py-2 text-sm text-gray-700 hover:bg-gray-100 rounded-md transition-colors"
                            onClick={() => setShowUserMenu(false)}
                          >
                            <Package className="h-4 w-4" />
                            <span>售后管理</span>
                          </a>
                          <a 
                            href="/admin/flash-sales"
                            className="w-full flex items-center space-x-2 px-3 py-2 text-sm text-gray-700 hover:bg-gray-100 rounded-md transition-colors"
                            onClick={() => setShowUserMenu(false)}
                          >
                            <Package className="h-4 w-4" />
                            <span>秒杀管理</span>
                          </a>
                          <a 
                            href="/admin/group-buying"
                            className="w-full flex items-center space-x-2 px-3 py-2 text-sm text-gray-700 hover:bg-gray-100 rounded-md transition-colors"
                            onClick={() => setShowUserMenu(false)}
                          >
                            <Package className="h-4 w-4" />
                            <span>团购管理</span>
                          </a>
                          <a 
                            href="/admin/membership"
                            className="w-full flex items-center space-x-2 px-3 py-2 text-sm text-gray-700 hover:bg-gray-100 rounded-md transition-colors"
                            onClick={() => setShowUserMenu(false)}
                          >
                            <Crown className="h-4 w-4" />
                            <span>会员管理</span>
                          </a>
                          <a 
                            href="/admin/referral"
                            className="w-full flex items-center space-x-2 px-3 py-2 text-sm text-gray-700 hover:bg-gray-100 rounded-md transition-colors"
                            onClick={() => setShowUserMenu(false)}
                          >
                            <Users className="h-4 w-4" />
                            <span>推荐管理</span>
                          </a>
                          <a 
                            href="/admin/sales-predictions"
                            className="w-full flex items-center space-x-2 px-3 py-2 text-sm text-gray-700 hover:bg-gray-100 rounded-md transition-colors"
                            onClick={() => setShowUserMenu(false)}
                          >
                            <TrendingUp className="h-4 w-4" />
                            <span>预测管理</span>
                          </a>
                        </div>
                      )}
                      
                      <a 
                        href="/after-sales"
                        className="w-full flex items-center space-x-2 px-3 py-2 text-sm text-gray-700 hover:bg-gray-100 rounded-md transition-colors"
                        onClick={() => setShowUserMenu(false)}
                      >
                        <Package className="h-4 w-4" />
                        <span>售后管理</span>
                      </a>
                      
                      <button 
                        onClick={logout}
                        className="w-full flex items-center space-x-2 px-3 py-2 text-sm text-red-600 hover:bg-red-50 rounded-md transition-colors"
                      >
                        <LogOut className="h-4 w-4" />
                        <span>退出登录</span>
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="flex items-center space-x-2">
                <a 
                  href="/login"
                  className="px-4 py-2 text-sm font-medium text-gray-700 hover:text-primary-600 transition-colors"
                >
                  登录
                </a>
                <a 
                  href="/register"
                  className="px-4 py-2 text-sm font-medium bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                >
                  注册
                </a>
              </div>
            )}
            
            <Link
              to="/wishlist"
              className="p-2 text-gray-600 hover:text-primary-600 transition-colors relative"
            >
              <Heart className="h-6 w-6" />
              {getWishlistCount() > 0 && (
                <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center">
                  {getWishlistCount()}
                </span>
              )}
            </Link>
            <button 
              onClick={handleOrdersClick}
              className="p-2 text-gray-600 hover:text-primary-600 transition-colors"
            >
              <Package className="h-6 w-6" />
            </button>
            <Link
              to="/notifications"
              className="p-2 text-gray-600 hover:text-primary-600 transition-colors relative"
            >
              <Bell className="h-6 w-6" />
              {unreadCount > 0 && (
                <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center">
                  {unreadCount}
                </span>
              )}
            </Link>
            <button 
              className="p-2 text-gray-600 hover:text-primary-600 transition-colors relative"
              onClick={handleCartClick}
            >
              <ShoppingCart className="h-6 w-6" />
              {cart.totalItems > 0 && (
                <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center">
                  {cart.totalItems}
                </span>
              )}
            </button>
          </div>
        </div>
      </div>
    </nav>
  );
});

export default Navbar;
