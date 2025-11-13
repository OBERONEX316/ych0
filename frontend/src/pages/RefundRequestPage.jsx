import React, { useState, useEffect } from 'react';
import { 
  X, 
  Upload, 
  Package, 
  DollarSign, 
  MessageSquare, 
  ArrowLeft,
  Plus,
  Minus
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { toast } from 'sonner';
import { createRefund } from '../services/refundAPI';

const RefundRequestPage = ({ order, onClose, onSuccess }) => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    type: 'full',
    reason: '',
    description: '',
    items: [],
    amount: 0,
    attachments: []
  });
  const [availableItems, setAvailableItems] = useState([]);
  const [selectedItems, setSelectedItems] = useState({});

  useEffect(() => {
    if (order && order.items) {
      const items = order.items.map(item => ({
        product: item.product._id,
        name: item.product.name,
        quantity: item.quantity,
        price: item.price,
        total: item.total,
        maxQuantity: item.quantity
      }));
      setAvailableItems(items);
      
      // 默认全选
      const defaultSelection = {};
      items.forEach(item => {
        defaultSelection[item.product] = item.quantity;
      });
      setSelectedItems(defaultSelection);
      
      // 更新表单数据
      setFormData(prev => ({
        ...prev,
        items: items,
        amount: items.reduce((sum, item) => sum + item.total, 0)
      }));
    }
  }, [order]);

  const handleItemQuantityChange = (productId, change) => {
    const newQuantity = Math.max(0, Math.min(
      (selectedItems[productId] || 0) + change,
      availableItems.find(item => item.product === productId)?.maxQuantity || 0
    ));
    
    const newSelection = {
      ...selectedItems,
      [productId]: newQuantity
    };
    
    if (newQuantity === 0) {
      delete newSelection[productId];
    }
    
    setSelectedItems(newSelection);
    
    // 更新选中的商品和金额
    const selectedItemsList = availableItems.filter(item => newSelection[item.product] > 0);
    const updatedItems = selectedItemsList.map(item => ({
      ...item,
      quantity: newSelection[item.product],
      total: item.price * newSelection[item.product]
    }));
    
    const newAmount = updatedItems.reduce((sum, item) => sum + item.total, 0);
    
    setFormData(prev => ({
      ...prev,
      items: updatedItems,
      amount: newAmount,
      type: updatedItems.length === availableItems.length ? 'full' : 'partial'
    }));
  };

  const handleFileUpload = (e) => {
    const files = Array.from(e.target.files);
    if (files.length + formData.attachments.length > 5) {
      toast.error('最多只能上传5个附件');
      return;
    }
    
    // 模拟文件上传
    const newAttachments = files.map(file => ({
      id: Date.now() + Math.random(),
      name: file.name,
      size: file.size,
      type: file.type,
      file: file
    }));
    
    setFormData(prev => ({
      ...prev,
      attachments: [...prev.attachments, ...newAttachments]
    }));
  };

  const removeAttachment = (id) => {
    setFormData(prev => ({
      ...prev,
      attachments: prev.attachments.filter(att => att.id !== id)
    }));
  };

  const formatFileSize = (bytes) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (formData.items.length === 0) {
      toast.error('请至少选择一个退款商品');
      return;
    }
    
    if (!formData.reason.trim()) {
      toast.error('请填写退款原因');
      return;
    }
    
    setLoading(true);
    
    try {
      const refundData = {
        orderId: order._id,
        type: formData.type,
        reason: formData.reason,
        description: formData.description,
        amount: formData.amount,
        items: formData.items
      };
      
      const result = await createRefund(refundData);
      toast.success('退款申请提交成功！');
      onSuccess(result.data);
    } catch (error) {
      console.error('提交退款申请失败:', error);
      toast.error(error.message || '提交退款申请失败，请重试');
    } finally {
      setLoading(false);
    }
  };

  if (!order) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <Package className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">未找到订单信息</h3>
          <p className="text-gray-600 mb-4">请返回订单页面重新选择</p>
          <button
            onClick={onClose}
            className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600"
          >
            返回
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* 页面标题 */}
        <div className="mb-8">
          <button
            onClick={onClose}
            className="flex items-center text-blue-600 hover:text-blue-800 mb-4"
          >
            <ArrowLeft className="h-5 w-5 mr-2" />
            返回订单详情
          </button>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">申请退款</h1>
          <p className="text-gray-600">订单号: {order.orderNumber}</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* 退款类型选择 */}
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-lg font-medium text-gray-900 mb-4">退款类型</h3>
            <div className="flex space-x-4">
              <label className="flex items-center">
                <input
                  type="radio"
                  value="full"
                  checked={formData.type === 'full'}
                  onChange={(e) => setFormData(prev => ({ ...prev, type: e.target.value }))}
                  className="mr-2"
                />
                <span>全额退款</span>
              </label>
              <label className="flex items-center">
                <input
                  type="radio"
                  value="partial"
                  checked={formData.type === 'partial'}
                  onChange={(e) => setFormData(prev => ({ ...prev, type: e.target.value }))}
                  className="mr-2"
                />
                <span>部分退款</span>
              </label>
            </div>
          </div>

          {/* 选择退款商品 */}
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-lg font-medium text-gray-900 mb-4">选择退款商品</h3>
            <div className="space-y-4">
              {availableItems.map((item) => (
                <div key={item.product} className="flex items-center justify-between border rounded-lg p-4">
                  <div className="flex-1">
                    <p className="font-medium">{item.name}</p>
                    <p className="text-sm text-gray-600">单价: ¥{item.price.toFixed(2)}</p>
                  </div>
                  <div className="flex items-center space-x-3">
                    <button
                      type="button"
                      onClick={() => handleItemQuantityChange(item.product, -1)}
                      className="p-1 rounded-full bg-gray-100 hover:bg-gray-200"
                      disabled={!selectedItems[item.product]}
                    >
                      <Minus className="h-4 w-4" />
                    </button>
                    <span className="w-8 text-center">
                      {selectedItems[item.product] || 0}
                    </span>
                    <button
                      type="button"
                      onClick={() => handleItemQuantityChange(item.product, 1)}
                      className="p-1 rounded-full bg-gray-100 hover:bg-gray-200"
                      disabled={selectedItems[item.product] >= item.maxQuantity}
                    >
                      <Plus className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
            
            <div className="mt-4 p-4 bg-gray-50 rounded-lg">
              <div className="flex justify-between items-center">
                <span className="font-medium">退款金额:</span>
                <span className="text-xl font-bold text-red-600">¥{formData.amount.toFixed(2)}</span>
              </div>
            </div>
          </div>

          {/* 退款原因 */}
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-lg font-medium text-gray-900 mb-4">退款原因</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  选择退款原因 *
                </label>
                <select
                  value={formData.reason}
                  onChange={(e) => setFormData(prev => ({ ...prev, reason: e.target.value }))}
                  required
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="">请选择退款原因</option>
                  <option value="商品质量问题">商品质量问题</option>
                  <option value="商品与描述不符">商品与描述不符</option>
                  <option value="发错商品">发错商品</option>
                  <option value="商品损坏">商品损坏</option>
                  <option value="不想要了">不想要了</option>
                  <option value="其他">其他</option>
                </select>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  详细说明
                </label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                  rows={4}
                  placeholder="请详细描述退款原因..."
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
            </div>
          </div>

          {/* 上传附件 */}
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-lg font-medium text-gray-900 mb-4">上传附件</h3>
            <div className="space-y-4">
              <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center">
                <Upload className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-600 mb-2">点击上传或拖拽文件到此处</p>
                <p className="text-sm text-gray-500">支持 JPG、PNG、PDF 格式，单个文件不超过 5MB</p>
                <input
                  type="file"
                  multiple
                  accept=".jpg,.jpeg,.png,.pdf"
                  onChange={handleFileUpload}
                  className="hidden"
                  id="file-upload"
                />
                <label
                  htmlFor="file-upload"
                  className="mt-4 inline-flex items-center px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 cursor-pointer"
                >
                  选择文件
                </label>
              </div>
              
              {formData.attachments.length > 0 && (
                <div className="space-y-2">
                  {formData.attachments.map((attachment) => (
                    <div key={attachment.id} className="flex items-center justify-between bg-gray-50 rounded-lg p-3">
                      <div className="flex items-center">
                        <div className="w-8 h-8 bg-blue-100 rounded flex items-center justify-center mr-3">
                          <span className="text-xs font-medium text-blue-600">
                            {attachment.name.split('.').pop().toUpperCase()}
                          </span>
                        </div>
                        <div>
                          <p className="text-sm font-medium">{attachment.name}</p>
                          <p className="text-xs text-gray-500">{formatFileSize(attachment.size)}</p>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => removeAttachment(attachment.id)}
                        className="text-red-600 hover:text-red-800"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* 提交按钮 */}
          <div className="flex justify-end space-x-4">
            <button
              type="button"
              onClick={onClose}
              className="px-6 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
            >
              取消
            </button>
            <button
              type="submit"
              disabled={loading || formData.items.length === 0 || !formData.reason}
              className="px-6 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? '提交中...' : '提交申请'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default RefundRequestPage;