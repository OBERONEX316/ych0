import React from 'react';

const ProductPredictionDetail = ({ productId, productName }) => {
  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-xl font-bold text-gray-900">{productName || '产品'} - 销售预测</h2>
          <p className="text-gray-600">选择产品以查看详细预测趋势与历史</p>
        </div>
      </div>
      <div className="bg-white p-6 rounded-lg border border-gray-200">
        <p className="text-gray-500">暂无详细数据</p>
      </div>
    </div>
  );
};

export default ProductPredictionDetail;
