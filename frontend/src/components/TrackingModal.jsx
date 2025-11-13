import React, { useState, useEffect } from 'react';
import { X, Package, MapPin, Clock, CheckCircle, Truck, AlertCircle } from 'lucide-react';
import { orderAPI } from '../services/api';

const TrackingModal = ({ order, isOpen, onClose }) => {
  const [trackingInfo, setTrackingInfo] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (isOpen && order) {
      fetchTrackingInfo();
    }
  }, [isOpen, order]);

  const fetchTrackingInfo = async () => {
    try {
      setLoading(true);
      setError('');
      const response = await orderAPI.getTrackingInfo(order._id);
      setTrackingInfo(response.data);
    } catch (err) {
      console.error('获取物流信息失败:', err);
      setError(err.response?.data?.error || '获取物流信息失败');
    } finally {
      setLoading(false);
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'collected':
        return <Package className="h-5 w-5 text-blue-500" />;
      case 'in_transit':
      case 'arrived':
        return <Truck className="h-5 w-5 text-orange-500" />;
      case 'delivered':
        return <CheckCircle className="h-5 w-5 text-green-500" />;
      default:
        return <AlertCircle className="h-5 w-5 text-gray-500" />;
    }
  };

  const getStatusText = (status) => {
    const statusMap = {
      collected: '已揽收',
      in_transit: '运输中',
      arrived: '已到达',
      delivered: '已签收'
    };
    return statusMap[status] || status;
  };

  const formatDate = (date) => {
    return new Date(date).toLocaleString('zh-CN', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        {/* 头部 */}
        <div className="flex items-center justify-between p-6 border-b">
          <div className="flex items-center space-x-3">
            <Truck className="h-6 w-6 text-primary-600" />
            <h2 className="text-xl font-semibold text-gray-900">物流跟踪</h2>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X className="h-6 w-6" />
          </button>
        </div>

        {/* 内容 */}
        <div className="p-6">
          {loading && (
            <div className="flex items-center justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
              <span className="ml-3 text-gray-600">加载物流信息中...</span>
            </div>
          )}

          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded mb-6">
              {error}
            </div>
          )}

          {trackingInfo && (
            <>
              {/* 物流概览 */}
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-blue-800 mb-1">快递公司</label>
                    <p className="text-blue-900 font-medium">{trackingInfo.carrier}</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-blue-800 mb-1">运单号码</label>
                    <p className="text-blue-900 font-medium">
                      {trackingInfo.trackingNumber || '暂无运单号'}
                    </p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-blue-800 mb-1">订单状态</label>
                    <p className="text-blue-900 font-medium">
                      {trackingInfo.status === 'shipped' ? '运输中' : '已送达'}
                    </p>
                  </div>
                </div>
              </div>

              {/* 预计送达时间 */}
              {trackingInfo.estimatedDelivery && (
                <div className="bg-orange-50 border border-orange-200 rounded-lg p-4 mb-6">
                  <div className="flex items-center">
                    <Clock className="h-5 w-5 text-orange-600 mr-2" />
                    <span className="text-orange-800 font-medium">
                      预计送达: {formatDate(trackingInfo.estimatedDelivery)}
                    </span>
                  </div>
                </div>
              )}

              {/* 物流轨迹 */}
              <div className="mb-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                  <MapPin className="h-5 w-5 mr-2 text-primary-600" />
                  物流轨迹
                </h3>
                
                <div className="space-y-4">
                  {trackingInfo.trackingEvents.map((event, index) => (
                    <div key={index} className="flex">
                      {/* 时间线 */}
                      <div className="flex flex-col items-center mr-4">
                        <div className={`w-3 h-3 rounded-full ${
                          index === 0 ? 'bg-primary-600' : 'bg-gray-300'
                        }`}></div>
                        {index < trackingInfo.trackingEvents.length - 1 && (
                          <div className="w-0.5 h-16 bg-gray-300 my-1"></div>
                        )}
                      </div>

                      {/* 事件内容 */}
                      <div className="flex-1 pb-6">
                        <div className="flex items-center mb-1">
                          {getStatusIcon(event.status)}
                          <span className="ml-2 font-medium text-gray-900">
                            {getStatusText(event.status)}
                          </span>
                        </div>
                        <p className="text-sm text-gray-600 mb-1">{event.description}</p>
                        <p className="text-sm text-gray-500">{event.location}</p>
                        <p className="text-xs text-gray-400 mt-1">
                          {formatDate(event.time)}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* 订单信息 */}
              <div className="bg-gray-50 rounded-lg p-4">
                <h4 className="font-medium text-gray-900 mb-3">订单信息</h4>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="text-gray-600">订单号:</span>
                    <span className="ml-2 font-medium">{trackingInfo.orderNumber}</span>
                  </div>
                  <div>
                    <span className="text-gray-600">发货时间:</span>
                    <span className="ml-2 font-medium">
                      {trackingInfo.shippedAt ? formatDate(trackingInfo.shippedAt) : '未发货'}
                    </span>
                  </div>
                  {trackingInfo.deliveredAt && (
                    <div className="col-span-2">
                      <span className="text-gray-600">送达时间:</span>
                      <span className="ml-2 font-medium text-green-600">
                        {formatDate(trackingInfo.deliveredAt)}
                      </span>
                    </div>
                  )}
                </div>
              </div>
            </>
          )}
        </div>

        {/* 底部按钮 */}
        <div className="flex justify-end p-6 border-t">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-gray-300 text-gray-700 rounded-lg hover:bg-gray-400 transition-colors"
          >
            关闭
          </button>
        </div>
      </div>
    </div>
  );
};

export default TrackingModal;