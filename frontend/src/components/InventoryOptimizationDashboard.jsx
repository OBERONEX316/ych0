import React, { useEffect, useState } from 'react';
import { Shield, Package, TrendingUp } from 'lucide-react';
import inventoryOptimizationAPI from '../services/inventoryOptimizationAPI';
import { toast } from 'sonner';

const InventoryOptimizationDashboard = () => {
  const [period, setPeriod] = useState('monthly');
  const [suggestions, setSuggestions] = useState([]);
  const [loading, setLoading] = useState(false);

  const load = async () => {
    try {
      setLoading(true);
      const res = await inventoryOptimizationAPI.getSuggestions({ period });
      setSuggestions(res.data);
    } catch (e) {
      toast.error('加载库存优化建议失败');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, [period]);

  const fmt = (n) => new Intl.NumberFormat('zh-CN').format(n);

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-gray-900">库存优化建议</h1>
        <select value={period} onChange={(e) => setPeriod(e.target.value)} className="px-3 py-2 border rounded-md">
          <option value="daily">日</option>
          <option value="weekly">周</option>
          <option value="monthly">月</option>
        </select>
      </div>

      <div className="bg-white rounded-lg border">
        <div className="px-6 py-4 border-b">
          <span className="text-gray-700">建议列表（{fmt(suggestions.length)}）</span>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500">产品</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500">当前库存</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500">预测需求</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500">安全库存</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500">补货点</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500">推荐订购量</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500">覆盖天数</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500">分类</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {loading && (
                <tr><td className="px-6 py-4" colSpan={8}>加载中...</td></tr>
              )}
              {!loading && suggestions.map(s => (
                <tr key={s._id}>
                  <td className="px-6 py-4">
                    <div className="text-sm font-medium text-gray-900">{s.productId?.name}</div>
                    <div className="text-xs text-gray-500">{s.productId?.category}</div>
                  </td>
                  <td className="px-6 py-4 text-sm">{fmt(s.currentStock)}</td>
                  <td className="px-6 py-4 text-sm">{fmt(s.predictedDemand)}</td>
                  <td className="px-6 py-4 text-sm">{fmt(s.safetyStock)}</td>
                  <td className="px-6 py-4 text-sm">{fmt(s.reorderPoint)}</td>
                  <td className="px-6 py-4 text-sm">{fmt(s.recommendedOrderQty)}</td>
                  <td className="px-6 py-4 text-sm">{fmt(s.daysOfCover)}</td>
                  <td className="px-6 py-4 text-sm">
                    <span className={`px-2 py-1 text-xs rounded-full ${s.classification === 'A' ? 'bg-red-100 text-red-700' : s.classification === 'B' ? 'bg-yellow-100 text-yellow-700' : 'bg-green-100 text-green-700'}`}>{s.classification}</span>
                  </td>
                </tr>
              ))}
              {!loading && suggestions.length === 0 && (
                <tr><td className="px-6 py-4" colSpan={8}>暂无数据</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default InventoryOptimizationDashboard;
