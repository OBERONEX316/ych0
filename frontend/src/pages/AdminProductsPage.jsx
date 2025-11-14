import React, { useEffect, useState } from 'react';
import Navbar from '../components/Navbar';
import { productAPI } from '../services/api';
import { Plus, Edit2, Trash2, Loader, AlertCircle } from 'lucide-react';

const initialForm = { name: '', price: '', category: '', stock: '' };

const AdminProductsPage = () => {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(initialForm);
  const [editingId, setEditingId] = useState(null);

  const load = async () => {
    try {
      setLoading(true);
      setError('');
      const res = await productAPI.getProducts();
      const data = res?.data || res?.products || res || [];
      setItems(Array.isArray(data) ? data : []);
    } catch (e) {
      setError(e?.response?.data?.error || '加载失败');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const openCreate = () => { setEditingId(null); setForm(initialForm); setShowForm(true); };
  const openEdit = (item) => { setEditingId(item._id); setForm({ name: item.name || '', price: item.price || '', category: item.category || '', stock: item.stock || '' }); setShowForm(true); };

  const save = async () => {
    try {
      const payload = { ...form, price: Number(form.price), stock: Number(form.stock) };
      if (!payload.name || !payload.category) return;
      if (editingId) {
        await productAPI.updateProduct(editingId, payload);
      } else {
        await productAPI.createProduct(payload);
      }
      setShowForm(false);
      await load();
    } catch (e) {
      alert(e?.response?.data?.error || '保存失败');
    }
  };

  const remove = async (id) => {
    if (!confirm('确定删除该商品？')) return;
    try {
      await productAPI.deleteProduct(id);
      await load();
    } catch (e) {
      alert(e?.response?.data?.error || '删除失败');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <Loader className="h-12 w-12 text-primary-600 animate-spin mx-auto mb-4" />
          <p className="text-gray-600 text-lg">正在加载商品...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white">
      <Navbar />
      <div className="max-w-6xl mx-auto p-6">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold text-gray-900">商品管理</h1>
          <button onClick={openCreate} className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors flex items-center">
            <Plus className="w-5 h-5 mr-2" /> 新增商品
          </button>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 rounded-md p-4 mb-4">
            <div className="flex items-center">
              <AlertCircle className="w-5 h-5 text-red-600 mr-2" />
              <p className="text-sm text-red-700">{error}</p>
            </div>
          </div>
        )}

        <div className="overflow-x-auto border border-gray-200 rounded-lg">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">名称</th>
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">分类</th>
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">价格</th>
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">库存</th>
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">创建时间</th>
                <th className="px-4 py-2" />
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {items.map(item => (
                <tr key={item._id}>
                  <td className="px-4 py-2">{item.name}</td>
                  <td className="px-4 py-2 text-gray-600">{item.category || '-'}</td>
                  <td className="px-4 py-2">¥{item.price}</td>
                  <td className="px-4 py-2">{item.stock ?? '-'}</td>
                  <td className="px-4 py-2 text-sm text-gray-500">{item.createdAt ? new Date(item.createdAt).toLocaleString() : '-'}</td>
                  <td className="px-4 py-2 text-right">
                    <button onClick={() => openEdit(item)} className="text-blue-600 hover:text-blue-800 mr-3">
                      <Edit2 className="w-5 h-5" />
                    </button>
                    <button onClick={() => remove(item._id)} className="text-red-600 hover:text-red-800">
                      <Trash2 className="w-5 h-5" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {showForm && (
          <div className="fixed inset-0 bg-black bg-opacity-30 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg w-full max-w-md p-6">
              <h2 className="text-xl font-semibold mb-4">{editingId ? '编辑商品' : '新增商品'}</h2>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm text-gray-600 mb-1">名称</label>
                  <input className="w-full border rounded px-3 py-2" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} />
                </div>
                <div>
                  <label className="block text-sm text-gray-600 mb-1">分类</label>
                  <input className="w-full border rounded px-3 py-2" value={form.category} onChange={e => setForm({ ...form, category: e.target.value })} />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm text-gray-600 mb-1">价格</label>
                    <input type="number" className="w-full border rounded px-3 py-2" value={form.price} onChange={e => setForm({ ...form, price: e.target.value })} />
                  </div>
                  <div>
                    <label className="block text-sm text-gray-600 mb-1">库存</label>
                    <input type="number" className="w-full border rounded px-3 py-2" value={form.stock} onChange={e => setForm({ ...form, stock: e.target.value })} />
                  </div>
                </div>
                <div className="flex items-center justify-end space-x-3 mt-2">
                  <button onClick={() => setShowForm(false)} className="px-4 py-2 rounded border">取消</button>
                  <button onClick={save} className="px-4 py-2 rounded bg-blue-600 text-white">保存</button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default AdminProductsPage;

