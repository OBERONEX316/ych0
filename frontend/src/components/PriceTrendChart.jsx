import React from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

const PriceTrendChart = ({ data, productName }) => {
  const formatData = (priceData) => {
    if (!priceData || !Array.isArray(priceData)) {
      return [
        { date: '1月', price: 299 },
        { date: '2月', price: 289 },
        { date: '3月', price: 275 },
        { date: '4月', price: 269 },
        { date: '5月', price: 259 },
        { date: '6月', price: 249 }
      ];
    }
    
    return priceData.map(item => ({
      date: item.date || item.month || '未知',
      price: item.price || item.averagePrice || 0
    }));
  };

  const chartData = formatData(data);

  const CustomTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-white p-3 border border-gray-200 rounded-lg shadow-lg">
          <p className="text-sm font-medium">{`时间: ${label}`}</p>
          <p className="text-sm text-blue-600">
            {`价格: ¥${payload[0].value}`}
          </p>
        </div>
      );
    }
    return null;
  };

  const getTrendAnalysis = () => {
    if (chartData.length < 2) return { trend: 'stable', percentage: 0 };
    
    const firstPrice = chartData[0].price;
    const lastPrice = chartData[chartData.length - 1].price;
    const percentage = ((lastPrice - firstPrice) / firstPrice) * 100;
    
    if (percentage > 5) return { trend: 'up', percentage: Math.abs(percentage) };
    if (percentage < -5) return { trend: 'down', percentage: Math.abs(percentage) };
    return { trend: 'stable', percentage: Math.abs(percentage) };
  };

  const { trend, percentage } = getTrendAnalysis();

  const getTrendColor = () => {
    switch (trend) {
      case 'up': return '#ef4444'; // red-500
      case 'down': return '#22c55e'; // green-500
      default: return '#6b7280'; // gray-500
    }
  };

  const getTrendText = () => {
    switch (trend) {
      case 'up': return `上涨 ${percentage.toFixed(1)}%`;
      case 'down': return `下降 ${percentage.toFixed(1)}%`;
      default: return '相对稳定';
    }
  };

  return (
    <div className="bg-white rounded-lg p-4 shadow-sm border border-gray-200">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-gray-800">
          {productName || '商品价格趋势'}
        </h3>
        <div className="flex items-center space-x-2">
          <span className={`text-sm font-medium`} style={{ color: getTrendColor() }}>
            {getTrendText()}
          </span>
          <div className={`w-3 h-3 rounded-full`} style={{ backgroundColor: getTrendColor() }}></div>
        </div>
      </div>
      
      <div className="h-64">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
            <XAxis 
              dataKey="date" 
              stroke="#6b7280"
              fontSize={12}
              tickLine={false}
            />
            <YAxis 
              stroke="#6b7280"
              fontSize={12}
              tickLine={false}
              tickFormatter={(value) => `¥${value}`}
            />
            <Tooltip content={<CustomTooltip />} />
            <Line 
              type="monotone" 
              dataKey="price" 
              stroke={getTrendColor()}
              strokeWidth={3}
              dot={{ fill: getTrendColor(), strokeWidth: 2, r: 4 }}
              activeDot={{ r: 6, stroke: getTrendColor(), strokeWidth: 2 }}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
      
      <div className="mt-4 grid grid-cols-3 gap-4 text-center">
        <div className="bg-gray-50 rounded-lg p-3">
          <p className="text-sm text-gray-600">当前价格</p>
          <p className="text-lg font-bold text-gray-800">
            ¥{chartData[chartData.length - 1]?.price || 0}
          </p>
        </div>
        <div className="bg-gray-50 rounded-lg p-3">
          <p className="text-sm text-gray-600">平均价格</p>
          <p className="text-lg font-bold text-gray-800">
            ¥{Math.round(chartData.reduce((sum, item) => sum + item.price, 0) / chartData.length) || 0}
          </p>
        </div>
        <div className="bg-gray-50 rounded-lg p-3">
          <p className="text-sm text-gray-600">价格区间</p>
          <p className="text-lg font-bold text-gray-800">
            ¥{Math.min(...chartData.map(item => item.price))} - ¥{Math.max(...chartData.map(item => item.price))}
          </p>
        </div>
      </div>
      
      <div className="mt-4 p-3 bg-blue-50 rounded-lg">
        <p className="text-sm text-blue-800">
          <strong>购买建议：</strong>
          {trend === 'down' 
            ? '价格呈下降趋势，建议等待更好的购买时机。' 
            : trend === 'up'
            ? '价格正在上涨，建议尽快购买以避免进一步涨价。'
            : '价格相对稳定，现在是一个不错的购买时机。'
          }
        </p>
      </div>
    </div>
  );
};

export default PriceTrendChart;