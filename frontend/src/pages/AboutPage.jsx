import React from 'react';

const AboutPage = () => {
  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <div className="bg-white rounded-lg shadow-lg p-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-6">关于我们</h1>
        
        <div className="prose prose-lg text-gray-700">
          <p className="mb-4">
            欢迎来到我们的电商平台！我们致力于为用户提供最优质的购物体验。
          </p>
          
          <h2 className="text-xl font-semibold text-gray-900 mt-8 mb-4">我们的使命</h2>
          <p className="mb-4">
            我们的使命是让购物变得更加简单、便捷和愉快。我们精心挑选每一件商品，
            确保为您提供最好的品质和服务。
          </p>
          
          <h2 className="text-xl font-semibold text-gray-900 mt-8 mb-4">特色功能</h2>
          <ul className="list-disc list-inside space-y-2 mb-6">
            <li>用户友好的购物界面</li>
            <li>安全的用户认证系统</li>
            <li>智能购物车管理</li>
            <li>便捷的订单处理</li>
            <li>安全的支付系统</li>
          </ul>
          
          <h2 className="text-xl font-semibold text-gray-900 mt-8 mb-4">联系我们</h2>
          <p className="mb-2">邮箱: support@example.com</p>
          <p className="mb-2">电话: 400-123-4567</p>
          <p>工作时间: 周一至周五 9:00-18:00</p>
        </div>
      </div>
    </div>
  );
};

export default AboutPage;