import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'sonner';
import Navbar from './components/Navbar';
import { Skeleton, SkeletonText } from './components/Skeleton';
import Card from './components/ui/Card';
import Button from './components/ui/Button';
import ProductCard from './components/ProductCard';
import CategoryFilter from './components/CategoryFilter';
import AdvancedSearch from './components/AdvancedSearch';
import CartPage from './pages/CartPage';
import CheckoutPage from './pages/CheckoutPage';
import OrdersPage from './pages/OrdersPage';
import PaymentPage from './pages/PaymentPage';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import SettingsPage from './pages/SettingsPage';
import AboutPage from './pages/AboutPage';
import SearchPage from './pages/SearchPage';
import ProductDetailPage from './pages/ProductDetailPage';
import WishlistPage from './pages/WishlistPage';
import AdminOrdersPage from './pages/AdminOrdersPage';
import AdminProductsPage from './pages/AdminProductsPage';
import AnalyticsPage from './pages/AnalyticsPage';
import AdminUsersPage from './pages/AdminUsersPage';
import AdminChatPage from './pages/AdminChatPage';
import AdminCouponsPage from './pages/AdminCouponsPage';
import AdminStockAlertsPage from './pages/AdminStockAlertsPage';
import PointsHistoryPage from './pages/PointsHistoryPage';
import PopularFavoritesPage from './pages/PopularFavoritesPage';
import UserAnalyticsPage from './pages/UserAnalyticsPage';
import CouponsPage from './pages/CouponsPage';
import AfterSalesPage from './pages/AfterSalesPage';
import RefundRequestPage from './pages/RefundRequestPage';
import AdminAfterSalesPage from './pages/AdminAfterSalesPage';
import AdminFlashSalesPage from './pages/AdminFlashSalesPage';
import AdminGroupBuyingPage from './pages/AdminGroupBuyingPage';
import AdminMembershipPage from './pages/AdminMembershipPage';
import MembershipDashboard from './components/MembershipDashboard';
import UserBehaviorAnalytics from './components/UserBehaviorAnalytics';
import ReferralDashboard from './components/ReferralDashboard';
import AdminReferralPage from './pages/AdminReferralPage';
import SalesPredictionDashboard from './components/SalesPredictionDashboard';
import ProductPredictionDetail from './components/ProductPredictionDetail';
import AdminSalesPredictionPage from './pages/AdminSalesPredictionPage';
import InventoryOptimizationDashboard from './components/InventoryOptimizationDashboard';
import AdminApprovalDashboard from './pages/AdminApprovalDashboard';
import NotificationsPage from './pages/NotificationsPage';
import AdminOverviewPage from './pages/AdminOverviewPage';
import HomeBannerExperiment from './components/HomeBannerExperiment';
import { Star, Truck, Shield, ArrowRight, Loader, AlertCircle } from 'lucide-react';
import { productAPI, healthAPI } from './services/api';
import { CartProvider } from './contexts/CartContext';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { WishlistProvider } from './contexts/WishlistContext';
import { ReviewProvider } from './contexts/ReviewContext';
import { ChatProvider } from './contexts/ChatContext';
import { NotificationProvider } from './contexts/NotificationContext';
import { RecommendationProvider } from './contexts/RecommendationContext';
import { ShoppingAssistantProvider } from './contexts/ShoppingAssistantContext';
import ChatWidget from './components/ChatWidget';
import RecommendationSection from './components/RecommendationSection';
import ShoppingAssistant from './components/ShoppingAssistant';
import FlashSaleSection from './components/FlashSaleSection';
import GroupBuyingSection from './components/GroupBuyingSection';

// 受保护的路由组件
const ProtectedRoute = ({ children }) => {
  const { isAuthenticated, loading } = useAuth();
  
  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <Loader className="h-12 w-12 text-primary-600 animate-spin mx-auto mb-4" />
          <p className="text-gray-600 text-lg">验证登录状态...</p>
        </div>
      </div>
    );
  }
  
  return isAuthenticated ? children : <Navigate to="/login" replace />;
};

// 主页组件
const HomePage = () => {
  const { isAuthenticated } = useAuth();
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showCart, setShowCart] = useState(false);
  const [showCheckout, setShowCheckout] = useState(false);
  const [showOrders, setShowOrders] = useState(false);
  const [showPayment, setShowPayment] = useState(false);
  const [currentOrder, setCurrentOrder] = useState(null);
  const [selectedCategory, setSelectedCategory] = useState('');
  const [filters, setFilters] = useState({
    minPrice: '',
    maxPrice: '',
    inStock: false,
    sortBy: 'createdAt',
    sortOrder: 'desc'
  });
  const [showFilters, setShowFilters] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  
  // 保存滚动位置
  const scrollPositionRef = useRef(0);

  // 处理分类变化
  const handleCategoryChange = (category) => {
    setSelectedCategory(category);
  };

  // 处理筛选变化
  const handleFilterChange = (newFilters) => {
    setFilters(newFilters);
  };

  // 获取商品数据
  const fetchProducts = useCallback(async () => {
    setLoading(true);
    setError(null);
    const params = {
      category: selectedCategory,
      minPrice: filters.minPrice,
      maxPrice: filters.maxPrice,
      inStock: filters.inStock,
      sortBy: filters.sortBy,
      sortOrder: filters.sortOrder
    };
    if (searchQuery) {
      params.search = searchQuery;
    }
    const delays = [1000, 2000, 4000];
    let lastErr = null;
    for (let i = 0; i < delays.length + 1; i++) {
      try {
        await healthAPI.checkHealth();
        const response = await productAPI.getProducts(params);
        const list = response?.data ?? response?.products ?? response ?? [];
        setProducts(Array.isArray(list) ? list : []);
        setLoading(false);
        return;
      } catch (err) {
        lastErr = err;
        const isNetwork = err?.code === 'ERR_NETWORK' || err?.message === 'Network Error';
        if (!isNetwork || i === delays.length) {
          setError(isNetwork ? '网络连接错误，请稍后重试' : (err?.message || '加载失败'));
          setLoading(false);
          return;
        }
        await new Promise(r => setTimeout(r, delays[i]));
      }
    }
    if (lastErr) {
      setError(lastErr?.message || '加载失败');
      setLoading(false);
    }
  }, [selectedCategory, filters.minPrice, filters.maxPrice, filters.inStock, filters.sortBy, filters.sortOrder, searchQuery]);

  const handleSearch = (query) => {
    setSearchQuery(query);
  };

  const handleSearchFilterChange = (newFilters) => {
    setFilters(newFilters);
  };

  // 保存滚动位置
  useEffect(() => {
    const handleScroll = () => {
      scrollPositionRef.current = window.scrollY;
    };
    
    window.addEventListener('scroll', handleScroll);
    
    return () => {
      window.removeEventListener('scroll', handleScroll);
    };
  }, []);

  // 恢复滚动位置
  useEffect(() => {
    if (scrollPositionRef.current > 0) {
      window.scrollTo(0, scrollPositionRef.current);
    }
  }, [products]);

  useEffect(() => {
    fetchProducts();
  }, [selectedCategory, filters.minPrice, filters.maxPrice, filters.inStock, filters.sortBy, filters.sortOrder, searchQuery]);

  // 使用useMemo优化过滤产品的计算
  const filteredProducts = useMemo(() => {
    return products;
  }, [products]);

  // 加载状态
  if (loading) {
    return (
      <div className="min-h-screen">
        <Navbar />
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            <Card className="p-6 md:col-span-2">
              <Skeleton className="h-8 mb-4" />
              <SkeletonText lines={3} />
            </Card>
            <Card className="p-6">
              <Skeleton className="h-6 mb-3" />
              <SkeletonText lines={4} />
            </Card>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            {Array.from({ length: 8 }).map((_, i) => (
              <Card key={i} className="p-4">
                <Skeleton className="h-36 mb-3" />
                <Skeleton className="h-4 w-3/4 mb-2" />
                <Skeleton className="h-4 w-1/2" />
              </Card>
            ))}
          </div>
        </div>
      </div>
    );
  }

  // 错误状态
  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <AlertCircle className="h-12 w-12 text-red-600 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-gray-900 mb-2">加载失败</h2>
          <p className="text-gray-600 mb-4">{error}</p>
          <button 
            onClick={() => window.location.reload()} 
            className="bg-primary-600 text-white px-6 py-2 rounded-lg hover:bg-primary-700 transition-colors"
          >
            重新加载
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white">
      <Navbar 
        onCartClick={() => setShowCart(true)}
        onOrdersClick={() => setShowOrders(true)}
      />
    
      {/* Hero Section with Search */}
      <section className="bg-gradient-to-br from-primary-50 via-primary-100 to-primary-200 text-primary-900">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
          <div className="text-center mb-8">
            <h1 className="text-4xl md:text-6xl font-bold mb-6">
              发现优质商品
            </h1>
            <p className="text-xl md:text-2xl mb-8 text-primary-800">
              精选好物，品质生活从这里开始
            </p>
          </div>
          
          <div className="max-w-4xl mx-auto">
            <AdvancedSearch
              onSearch={handleSearch}
              onFilterChange={handleSearchFilterChange}
              filters={filters}
            />
          </div>
        </div>
      </section>

      {/* 限时秒杀活动 */}
      <FlashSaleSection title="限时秒杀" limit={4} />

      {/* 团购活动 */}
      <GroupBuyingSection />

      {/* Recommendations Section */}
      <RecommendationSection title="热门推荐" type="popular" limit={8} sectionId="popular" />
      <RecommendationSection title="为你推荐" type="personalized" limit={8} sectionId="personalized" />
      {products && products.length > 0 && (
        <RecommendationSection title="猜你喜欢" type="related" productId={products[0]._id} limit={8} sectionId="related" />
      )}

      {/* Products Section */}
      <section className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-bold text-gray-900 mb-4">精选商品</h2>
            <p className="text-lg text-gray-600">发现更多优质商品，享受购物乐趣</p>
          </div>
          <div className="flex flex-col lg:flex-row gap-8">
            {/* 筛选侧边栏 - 桌面端显示 */}
            <div className="hidden lg:block lg:w-80">
              <CategoryFilter
                selectedCategory={selectedCategory}
                onCategoryChange={handleCategoryChange}
                onFilterChange={handleFilterChange}
                filters={filters}
              />
            </div>

            {/* 主要内容区域 */}
            <div className="flex-1">
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-8 gap-4">
                <div>
                  <h2 className="text-2xl font-bold text-gray-900">
                    {selectedCategory ? 
                      (() => {
                        const categoryNames = {
                          'electronics': '电子产品',
                          'clothing': '服装服饰', 
                          'books': '图书文具',
                          'home': '家居生活',
                          'sports': '运动户外',
                          'beauty': '美妆个护'
                        };
                        return categoryNames[selectedCategory] || selectedCategory;
                      })() 
                      : '全部商品'
                    }
                  </h2>
                  <p className="text-gray-600 mt-1">
                    共 {filteredProducts.length} 件商品
                  </p>
                </div>
                
                <div className="flex items-center gap-4">
                  {/* 移动端筛选按钮 */}
                  <button
                    onClick={() => setShowFilters(!showFilters)}
                    className="lg:hidden flex items-center px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50"
                  >
                    <svg className="h-5 w-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.707A1 1 0 013 7V4z" />
                    </svg>
                    筛选
                  </button>
                  
                  <Button variant="primary" className="flex items-center">
                    查看全部
                    <ArrowRight className="h-5 w-5 ml-2" />
                  </Button>
                </div>
              </div>

              {/* 移动端筛选面板 */}
              {showFilters && (
                <div className="lg:hidden mb-6">
                  <CategoryFilter
                    selectedCategory={selectedCategory}
                    onCategoryChange={handleCategoryChange}
                    onFilterChange={handleFilterChange}
                    filters={filters}
                  />
                </div>
              )}

              {/* 商品网格 */}
              {filteredProducts.length > 0 ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                  {filteredProducts.map(product => (
                    <ProductCard key={product._id} product={product} />
                  ))}
                </div>
              ) : (
                <div className="text-center py-12">
                  <div className="bg-gray-50 rounded-lg p-8">
                    <svg className="h-16 w-16 text-gray-400 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <h3 className="text-lg font-medium text-gray-900 mb-2">暂无商品</h3>
                    <p className="text-gray-600">当前筛选条件下没有找到商品，请尝试其他筛选条件</p>
                    <button
                      onClick={() => {
                        setSelectedCategory('');
                        setFilters({
                          minPrice: '',
                          maxPrice: '',
                          inStock: false,
                          sortBy: 'createdAt',
                          sortOrder: 'desc'
                        });
                      }}
                      className="mt-4 bg-primary-600 text-white px-6 py-2 rounded-lg hover:bg-primary-700 transition-colors"
                    >
                      清除筛选
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* 个性化推荐 - 仅在未登录时显示 */}
      {!isAuthenticated && (
        <RecommendationSection 
          title="为您推荐"
          type="personalized"
          limit={8}
          sectionId="bottom-personalized"
        />
      )}

      {/* Features Section - 移到页面底部，页脚之前，作为信任强化区域 */}
      <section className="py-20 bg-white border-t border-gray-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-gray-900 mb-4">为什么选择我们</h2>
            <p className="text-lg text-gray-600">专业的服务，优质的体验，让购物更简单</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="text-center group hover:transform hover:scale-105 transition-all duration-300">
              <div className="bg-primary-100 rounded-full p-4 w-20 h-20 mx-auto mb-6 flex items-center justify-center group-hover:bg-primary-200">
                <Truck className="h-8 w-8 text-primary-600" />
              </div>
              <h3 className="text-xl font-semibold mb-3 text-gray-900">免费配送</h3>
              <p className="text-gray-600 leading-relaxed">订单满99元免费配送，快速送达您的手中</p>
            </div>
            <div className="text-center group hover:transform hover:scale-105 transition-all duration-300">
              <div className="bg-green-100 rounded-full p-4 w-20 h-20 mx-auto mb-6 flex items-center justify-center group-hover:bg-green-200">
                <Shield className="h-8 w-8 text-green-600" />
              </div>
              <h3 className="text-xl font-semibold mb-3 text-gray-900">正品保障</h3>
              <p className="text-gray-600 leading-relaxed">100%正品保证，假一赔十，购物无忧</p>
            </div>
            <div className="text-center group hover:transform hover:scale-105 transition-all duration-300">
              <div className="bg-blue-100 rounded-full p-4 w-20 h-20 mx-auto mb-6 flex items-center justify-center group-hover:bg-blue-200">
                <Star className="h-8 w-8 text-blue-600" />
              </div>
              <h3 className="text-xl font-semibold mb-3 text-gray-900">优质服务</h3>
              <p className="text-gray-600 leading-relaxed">7x24小时客服支持，提供无忧购物体验</p>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-gray-900 text-white py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
            <div className="md:col-span-2">
              <h3 className="text-2xl font-bold mb-4 text-primary-400">优质商城</h3>
              <p className="text-gray-300 mb-6 leading-relaxed">
                致力于为用户提供最优质的购物体验，精选全球好物，让品质生活从这里开始。
              </p>
              <div className="flex space-x-4">
                <div className="bg-gray-800 p-3 rounded-lg hover:bg-gray-700 transition-colors cursor-pointer">
                  <span className="text-sm font-medium">微信客服</span>
                </div>
                <div className="bg-gray-800 p-3 rounded-lg hover:bg-gray-700 transition-colors cursor-pointer">
                  <span className="text-sm font-medium">微博关注</span>
                </div>
              </div>
            </div>
            <div>
              <h4 className="text-lg font-semibold mb-4 text-gray-200">客户服务</h4>
              <ul className="space-y-3 text-gray-300">
                <li><a href="#" className="hover:text-primary-400 transition-colors">帮助中心</a></li>
                <li><a href="#" className="hover:text-primary-400 transition-colors">联系我们</a></li>
                <li><a href="#" className="hover:text-primary-400 transition-colors">售后服务</a></li>
                <li><a href="#" className="hover:text-primary-400 transition-colors">退换货政策</a></li>
                <li><a href="#" className="hover:text-primary-400 transition-colors">配送说明</a></li>
              </ul>
            </div>
            <div>
              <h4 className="text-lg font-semibold mb-4 text-gray-200">商务合作</h4>
              <ul className="space-y-3 text-gray-300">
                <li><a href="#" className="hover:text-primary-400 transition-colors">商家入驻</a></li>
                <li><a href="#" className="hover:text-primary-400 transition-colors">广告投放</a></li>
                <li><a href="#" className="hover:text-primary-400 transition-colors">品牌合作</a></li>
                <li><a href="#" className="hover:text-primary-400 transition-colors">招商加盟</a></li>
              </ul>
            </div>
          </div>
          <div className="border-t border-gray-800 mt-12 pt-8">
            <div className="flex flex-col md:flex-row justify-between items-center">
              <div className="text-gray-400 mb-4 md:mb-0">
                <p>&copy; 2024 优质商城. 保留所有权利.</p>
              </div>
              <div className="flex space-x-6 text-gray-400">
                <a href="#" className="hover:text-primary-400 transition-colors text-sm">隐私政策</a>
                <a href="#" className="hover:text-primary-400 transition-colors text-sm">服务条款</a>
                <a href="#" className="hover:text-primary-400 transition-colors text-sm">网站地图</a>
              </div>
            </div>
          </div>
        </div>
      </footer>

      {/* 购物车模态框 */}
      {showCart && (
        <CartPage
          onClose={() => setShowCart(false)}
          onCheckout={() => {
            setShowCart(false);
            setShowCheckout(true);
          }}
        />
      )}

      {/* 结账模态框 */}
      {showCheckout && (
        <CheckoutPage
          onClose={() => setShowCheckout(false)}
          onOrderCreated={(order) => {
            setShowCheckout(false);
            setCurrentOrder(order);
            setShowPayment(true);
          }}
        />
      )}

      {/* 订单页面 */}
      {showOrders && (
        <div className="fixed inset-0 bg-white z-50 overflow-y-auto">
          <div className="min-h-screen">
            <Navbar 
              onCartClick={() => setShowCart(true)}
              onOrdersClick={() => setShowOrders(true)}
            />
            <OrdersPage />
            <button
              onClick={() => setShowOrders(false)}
              className="fixed top-4 right-4 bg-gray-200 hover:bg-gray-300 rounded-full p-2 transition-colors"
            >
              <ArrowRight className="h-6 w-6" />
            </button>
          </div>
        </div>
      )}

      {/* 支付页面 */}
      {showPayment && currentOrder && (
        <div className="fixed inset-0 bg-white z-50 overflow-y-auto">
          <div className="min-h-screen">
            <Navbar 
              onCartClick={() => setShowCart(true)}
              onOrdersClick={() => setShowOrders(true)}
            />
            <PaymentPage 
              order={currentOrder}
              onClose={() => setShowPayment(false)}
              onPaymentSuccess={() => {
                setShowPayment(false);
                // 支付成功后可以显示成功提示或跳转到订单页面
                setShowOrders(true);
              }}
            />
            <button
              onClick={() => setShowPayment(false)}
              className="fixed top-4 right-4 bg-gray-200 hover:bg-gray-300 rounded-full p-2 transition-colors"
            >
              <ArrowRight className="h-6 w-6" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

function App() {
  return (
    <Router>
      <AuthProvider>
        <CartProvider>
          <WishlistProvider>
            <ReviewProvider>
              <NotificationProvider>
                <ChatProvider>
                  <RecommendationProvider>
                    <ShoppingAssistantProvider>
                      <Routes>
                        <Route path="/" element={<HomePage />} />
                        <Route path="/login" element={<LoginPage />} />
                        <Route path="/register" element={<RegisterPage />} />
                        <Route 
                          path="/cart" 
                          element={
                            <ProtectedRoute>
                              <CartPage />
                            </ProtectedRoute>
                          } 
                        />
                        <Route 
                          path="/checkout" 
                          element={
                            <ProtectedRoute>
                              <CheckoutPage />
                            </ProtectedRoute>
                          } 
                        />
                        <Route 
                          path="/orders" 
                          element={
                            <ProtectedRoute>
                              <OrdersPage />
                            </ProtectedRoute>
                          } 
                        />
                        <Route 
                          path="/payment/:orderId" 
                          element={
                            <ProtectedRoute>
                              <PaymentPage />
                            </ProtectedRoute>
                          } 
                        />
                        <Route 
                          path="/settings" 
                          element={
                            <ProtectedRoute>
                              <SettingsPage />
                            </ProtectedRoute>
                          } 
                        />
                        <Route 
                          path="/wishlist" 
                          element={
                            <ProtectedRoute>
                              <WishlistPage />
                            </ProtectedRoute>
                          } 
                        />
                        <Route 
                          path="/notifications" 
                          element={
                            <ProtectedRoute>
                              <NotificationsPage />
                            </ProtectedRoute>
                          } 
                        />
                        <Route 
                          path="/admin" 
                          element={
                            <ProtectedRoute>
                              <AdminOverviewPage />
                            </ProtectedRoute>
                          } 
                        />
                        <Route 
                          path="/admin/products" 
                          element={
                            <ProtectedRoute>
                              <AdminProductsPage />
                            </ProtectedRoute>
                          } 
                        />
                        <Route 
                          path="/admin/orders" 
                          element={
                            <ProtectedRoute>
                              <AdminOrdersPage />
                            </ProtectedRoute>
                          } 
                        />
                        <Route 
                          path="/admin/analytics" 
                          element={
                            <ProtectedRoute>
                              <AnalyticsPage />
                            </ProtectedRoute>
                          } 
                        />
                        <Route 
                          path="/admin/users" 
                          element={
                            <ProtectedRoute>
                              <AdminUsersPage />
                            </ProtectedRoute>
                          } 
                        />
                        <Route 
                          path="/admin/chat" 
                          element={
                            <ProtectedRoute>
                              <AdminChatPage />
                            </ProtectedRoute>
                          } 
                        />
                        <Route 
                          path="/admin/coupons" 
                          element={
                            <ProtectedRoute>
                              <AdminCouponsPage />
                            </ProtectedRoute>
                          } 
                        />
                        <Route 
                          path="/admin/stock-alerts" 
                          element={
                            <ProtectedRoute>
                              <AdminStockAlertsPage />
                            </ProtectedRoute>
                          } 
                        />
                        <Route 
                          path="/admin/after-sales" 
                          element={
                            <ProtectedRoute>
                              <AdminAfterSalesPage />
                            </ProtectedRoute>
                          } 
                        />
                        <Route 
                          path="/admin/flash-sales" 
                          element={
                            <ProtectedRoute>
                              <AdminFlashSalesPage />
                            </ProtectedRoute>
                          } 
                        />
                        <Route 
                          path="/admin/approval" 
                          element={
                            <ProtectedRoute>
                              <AdminApprovalDashboard />
                            </ProtectedRoute>
                          } 
                        />
                        <Route 
                          path="/admin/group-buying" 
                          element={
                            <ProtectedRoute>
                              <AdminGroupBuyingPage />
                            </ProtectedRoute>
                          } 
                        />
                        <Route 
                          path="/admin/user-behavior-analytics" 
                          element={
                            <ProtectedRoute>
                              <UserBehaviorAnalytics />
                            </ProtectedRoute>
                          } 
                        />
                        <Route 
                          path="/admin/membership" 
                          element={
                            <ProtectedRoute>
                              <AdminMembershipPage />
                            </ProtectedRoute>
                          } 
                        />
                        <Route 
                          path="/membership" 
                          element={
                            <ProtectedRoute>
                              <MembershipDashboard />
                            </ProtectedRoute>
                          } 
                        />
                        <Route 
                          path="/referral" 
                          element={
                            <ProtectedRoute>
                              <ReferralDashboard />
                            </ProtectedRoute>
                          } 
                        />
                        <Route 
                          path="/admin/referral" 
                          element={
                            <ProtectedRoute>
                              <AdminReferralPage />
                            </ProtectedRoute>
                          } 
                        />
                        <Route 
                          path="/sales-predictions" 
                          element={
                            <ProtectedRoute>
                              <SalesPredictionDashboard />
                            </ProtectedRoute>
                          } 
                        />
                        <Route 
                          path="/admin/sales-predictions" 
                          element={
                            <ProtectedRoute>
                              <AdminSalesPredictionPage />
                            </ProtectedRoute>
                          } 
                        />
                        <Route 
                          path="/inventory-optimization" 
                          element={
                            <ProtectedRoute>
                              <InventoryOptimizationDashboard />
                            </ProtectedRoute>
                          } 
                        />
                        <Route path="/experiment-demo" element={<HomeBannerExperiment />} />
                        <Route 
                          path="/after-sales" 
                          element={
                            <ProtectedRoute>
                              <AfterSalesPage />
                            </ProtectedRoute>
                          } 
                        />
                        <Route path="/about" element={<AboutPage />} />
                        <Route path="/search" element={<SearchPage />} />
                        <Route path="/product/:id" element={<ProductDetailPage />} />
                        <Route 
                          path="/points/history" 
                          element={
                            <ProtectedRoute>
                              <PointsHistoryPage />
                            </ProtectedRoute>
                          } 
                        />
                        <Route 
                          path="/favorites/popular" 
                          element={
                            <ProtectedRoute>
                              <PopularFavoritesPage />
                            </ProtectedRoute>
                          } 
                        />
                        <Route 
                          path="/analytics/user" 
                          element={
                            <ProtectedRoute>
                              <UserAnalyticsPage />
                            </ProtectedRoute>
                          } 
                        />
                        <Route 
                          path="/coupons" 
                          element={
                            <ProtectedRoute>
                              <CouponsPage />
                            </ProtectedRoute>
                          } 
                        />
                        <Route path="*" element={<Navigate to="/" replace />} />
                      </Routes>
                      <ChatWidget />
                      <ShoppingAssistant />
                      <Toaster position="top-right" />
                    </ShoppingAssistantProvider>
                  </RecommendationProvider>
                </ChatProvider>
              </NotificationProvider>
            </ReviewProvider>
          </WishlistProvider>
        </CartProvider>
      </AuthProvider>
    </Router>
  );
}

export default App;
