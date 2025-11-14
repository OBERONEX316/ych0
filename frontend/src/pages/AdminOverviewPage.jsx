import React from 'react';
import Navbar from '../components/Navbar';
import { Link } from 'react-router-dom';
import { Users, Package, Gift, Shield, TrendingUp, Crown } from 'lucide-react';

const Card = ({ to, icon: Icon, title, desc }) => (
  <Link to={to} className="border border-gray-200 rounded-lg p-6 hover:shadow-md transition">
    <div className="flex items-center space-x-4">
      <div className="w-12 h-12 bg-gray-100 rounded-lg flex items-center justify-center">
        <Icon className="w-6 h-6 text-gray-700" />
      </div>
      <div>
        <p className="font-semibold text-gray-900">{title}</p>
        <p className="text-sm text-gray-600">{desc}</p>
      </div>
    </div>
  </Link>
);

const AdminOverviewPage = () => {
  return (
    <div className="min-h-screen bg-white">
      <Navbar />
      <div className="max-w-6xl mx-auto p-6">
        <h1 className="text-2xl font-bold text-gray-900 mb-6">管理控制台</h1>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <Card to="/admin/users" icon={Users} title="用户管理" desc="查看与管理用户、角色与状态" />
          <Card to="/admin/products" icon={Package} title="商品管理" desc="商品创建与维护" />
          <Card to="/admin/orders" icon={Package} title="订单管理" desc="订单处理与发货跟踪" />
          <Card to="/admin/coupons" icon={Gift} title="优惠券管理" desc="创建与配置促销活动" />
          <Card to="/admin/stock-alerts" icon={Shield} title="库存预警" desc="低库存监控与补货建议" />
          <Card to="/admin/referral" icon={Users} title="推荐活动" desc="邀请奖励与统计管理" />
          <Card to="/admin/sales-predictions" icon={TrendingUp} title="销量预测" desc="商品销量趋势分析" />
          <Card to="/admin/membership" icon={Crown} title="会员管理" desc="会员等级与权益配置" />
        </div>
      </div>
    </div>
  );
};

export default AdminOverviewPage;
