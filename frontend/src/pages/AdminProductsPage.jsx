import React, { useEffect, useState, useRef } from 'react';
import Navbar from '../components/Navbar';
import { productAPI, uploadAPI } from '../services/api';
import { Plus, Edit2, Trash2, Loader, AlertCircle } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';

const initialForm = { name: '', description: '', price: '', category: '', stock: '', image: '', images: [], variants: [] };

const AdminProductsPage = () => {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(initialForm);
  const [editingId, setEditingId] = useState(null);
  const [dragIndex, setDragIndex] = useState();
  const [selectedImages, setSelectedImages] = useState([]);
  const [filterCategory, setFilterCategory] = useState('');
  const [filterStatus, setFilterStatus] = useState('active');
  const [sortBy, setSortBy] = useState('createdAt');
  const [sortOrder, setSortOrder] = useState('desc');
  const [minPrice, setMinPrice] = useState('');
  const [maxPrice, setMaxPrice] = useState('');
  const [minStock, setMinStock] = useState('');
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [limit] = useState(10);
  const { user } = useAuth();
  const editorRef = useRef(null);

  const load = async () => {
    try {
      setLoading(true);
      setError('');
      const params = user?.role === 'seller'
        ? {
            category: filterCategory || undefined,
            status: filterStatus,
            page,
            limit,
            sortBy,
            sortOrder,
            minPrice: minPrice || undefined,
            maxPrice: maxPrice || undefined,
            minStock: minStock || undefined
          }
        : {
            category: filterCategory || undefined,
            sortBy,
            sortOrder,
            minPrice: minPrice || undefined,
            maxPrice: maxPrice || undefined,
            minStock: minStock || undefined
          };
      const res = user?.role === 'seller' ? await productAPI.getMyProducts(params) : await productAPI.getProducts(params);
      const data = res?.data || res?.products || res || [];
      const arr = Array.isArray(data) ? data : [];
      setItems(arr);
      setTotal(res?.total ?? arr.length);
    } catch (e) {
      setError(e?.response?.data?.error || '加载失败');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, [filterCategory, filterStatus, sortBy, sortOrder, minPrice, maxPrice, minStock, page]);

  const openCreate = () => { setEditingId(null); setForm(initialForm); setShowForm(true); };
  const openEdit = (item) => { setEditingId(item._id); setForm({ name: item.name || '', description: item.description || '', price: item.price || '', category: item.category || '', stock: item.stock || '', image: item.image || '', images: item.images || [], variants: item.variants || [] }); setShowForm(true); };

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

  const handleUploadMain = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const res = await uploadAPI.uploadSingle(file, 'products');
      const url = res?.data?.url || res?.url || res?.data;
      if (url) setForm({ ...form, image: url });
    } catch (err) {
      alert('主图上传失败');
    }
  };

  const handleUploadGallery = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const res = await uploadAPI.uploadSingle(file, 'products');
      const url = res?.data?.url || res?.url || res?.data;
      if (url) setForm({ ...form, images: [...(form.images || []), url] });
    } catch (err) {
      alert('图片上传失败');
    }
  };

  const addVariant = () => {
    setForm({ ...form, variants: [...(form.variants || []), { sku: '', attributes: { color: '', size: '' }, priceDelta: 0, stock: 0 }] });
  };

  const updateVariant = (idx, patch) => {
    const arr = [...(form.variants || [])];
    arr[idx] = { ...arr[idx], ...patch };
    setForm({ ...form, variants: arr });
  };

  const removeVariant = (idx) => {
    const arr = [...(form.variants || [])];
    arr.splice(idx, 1);
    setForm({ ...form, variants: arr });
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
          <div className="flex items-center space-x-2">
            <button
              onClick={() => {
                const rows = items.map(i => ({
                  名称: i.name,
                  分类: i.category || '',
                  价格: i.price,
                  库存: i.stock ?? '',
                  主图: i.image || '',
                  图集: Array.isArray(i.images) ? i.images.join('|') : '',
                  描述: (i.description || '').replace(/[\n\r]+/g, ' ').slice(0,500),
                  富文本: (i.descriptionHtml || '').replace(/[\n\r]+/g, ' ').slice(0,1000),
                  变体: Array.isArray(i.variants) ? i.variants.map(v => `SKU:${v.sku || ''}|${Object.entries(v.attributes || {}).map(([k,vv]) => `${k}:${vv}`).join(';')}|加价:${v.priceDelta || 0}|库存:${v.stock || 0}`).join(' || ') : '',
                  创建时间: i.createdAt ? new Date(i.createdAt).toISOString() : ''
                }));
                const header = Object.keys(rows[0] || { 名称: '', 分类: '', 价格: '', 库存: '', 主图: '', 图集: '', 描述: '', 富文本: '', 变体: '', 创建时间: '' });
                const csv = [header.join(','), ...rows.map(r => header.map(h => `${String(r[h]).replace(/"/g,'""')}`).join(','))].join('\n');
                const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = 'products.csv';
                document.body.appendChild(a);
                a.click();
                document.body.removeChild(a);
                URL.revokeObjectURL(url);
              }}
              className="px-4 py-2 border rounded"
            >导出 CSV</button>
            <button onClick={openCreate} className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors flex items-center">
              <Plus className="w-5 h-5 mr-2" /> 新增商品
            </button>
          </div>
        </div>

        <div className="flex items-center space-x-3 mb-4">
          <input className="border rounded px-3 py-2" placeholder="分类或名称/SKU" value={filterCategory} onChange={e => { setPage(1); setFilterCategory(e.target.value); }} />
          {user?.role === 'seller' && (
            <select className="border rounded px-3 py-2" value={filterStatus} onChange={e => { setPage(1); setFilterStatus(e.target.value); }}>
              <option value="active">上架</option>
              <option value="inactive">下架</option>
              <option value="all">全部</option>
            </select>
          )}
          <input className="border rounded px-2 py-2 w-24" placeholder="最低价" value={minPrice} onChange={e => { setPage(1); setMinPrice(e.target.value); }} />
          <input className="border rounded px-2 py-2 w-24" placeholder="最高价" value={maxPrice} onChange={e => { setPage(1); setMaxPrice(e.target.value); }} />
          <input className="border rounded px-2 py-2 w-24" placeholder="最低库存" value={minStock} onChange={e => { setPage(1); setMinStock(e.target.value); }} />
          <select className="border rounded px-3 py-2" value={sortBy} onChange={e => { setPage(1); setSortBy(e.target.value); }}>
            <option value="createdAt">创建时间</option>
            <option value="price">价格</option>
            <option value="stock">库存</option>
          </select>
          <select className="border rounded px-3 py-2" value={sortOrder} onChange={e => { setPage(1); setSortOrder(e.target.value); }}>
            <option value="desc">降序</option>
            <option value="asc">升序</option>
          </select>
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

        <div className="flex items-center justify-end space-x-2 mt-4">
          <button disabled={page <= 1} onClick={() => setPage(page - 1)} className="px-3 py-1 border rounded disabled:opacity-50">上一页</button>
          <span className="text-sm text-gray-600">{page}</span>
          <button disabled={page * limit >= total} onClick={() => setPage(page + 1)} className="px-3 py-1 border rounded disabled:opacity-50">下一页</button>
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
                  <label className="block text-sm text-gray-600 mb-1">富文本描述</label>
                  <div className="flex items-center space-x-2 mb-2">
                    <button onClick={() => document.execCommand('bold')} className="px-2 border rounded">B</button>
                    <button onClick={() => document.execCommand('italic')} className="px-2 border rounded">I</button>
                    <button onClick={() => document.execCommand('underline')} className="px-2 border rounded">U</button>
                    <button onClick={() => document.execCommand('insertOrderedList')} className="px-2 border rounded">OL</button>
                    <button onClick={() => document.execCommand('insertUnorderedList')} className="px-2 border rounded">UL</button>
                    <button onClick={() => document.execCommand('justifyLeft')} className="px-2 border rounded">居左</button>
                    <button onClick={() => document.execCommand('justifyCenter')} className="px-2 border rounded">居中</button>
                    <button onClick={() => document.execCommand('justifyRight')} className="px-2 border rounded">居右</button>
                    <button onClick={() => document.execCommand('undo')} className="px-2 border rounded">撤销</button>
                    <button onClick={() => document.execCommand('redo')} className="px-2 border rounded">重做</button>
                  </div>
                  <div
                    contentEditable
                    className="w-full border rounded px-3 py-2 min-h-[120px]"
                    onInput={(e) => setForm({ ...form, descriptionHtml: e.currentTarget.innerHTML })}
                    dangerouslySetInnerHTML={{ __html: form.descriptionHtml || '' }}
                  />
                  <div className="mt-2 flex items-center space-x-2">
                    <input type="file" accept="image/*" onChange={async (e) => {
                      const file = e.target.files?.[0];
                      if (!file) return;
                      try {
                        const res = await uploadAPI.uploadSingle(file, 'products');
                        const url = res?.data?.url || res?.url || res?.data;
                        if (url) {
                          setForm({ ...form, descriptionHtml: (form.descriptionHtml || '') + `<p><img src="${url}" alt=""/></p>` });
                        }
                      } catch (_) {}
                    }} />
                  </div>
                </div>
                <div>
                  <label className="block text-sm text-gray-600 mb-1">描述</label>
                  <textarea className="w-full border rounded px-3 py-2" rows={4} value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} />
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
                {/* 主图上传与预览 */}
                <div>
                  <label className="block text-sm text-gray-600 mb-1">主图</label>
                  <div className="flex items-center space-x-3">
                    <input type="file" accept="image/*" onChange={handleUploadMain} />
                    {form.image && (
                      <img src={form.image} alt="main" className="w-16 h-16 object-cover rounded border" />
                    )}
                  </div>
                </div>
                {/* 图集上传与预览 */}
                <div>
                  <label className="block text-sm text-gray-600 mb-1">图片集</label>
                  <div className="flex items-center space-x-3">
                    <input type="file" accept="image/*" multiple onChange={async (e) => {
                      const files = Array.from(e.target.files || []);
                      for (const f of files) {
                        await handleUploadGallery({ target: { files: [f] } });
                      }
                    }} />
                    <div className="flex space-x-2 items-center">
                      <button
                        onClick={() => setForm({ ...form, images: (form.images || []).filter((_, idx) => !selectedImages.includes(idx)) })}
                        className="px-2 py-1 border rounded text-sm"
                      >批量删除选中</button>
                      <div className="flex space-x-2">
                        {(form.images || []).map((url, i) => (
                          <label key={i} className="relative inline-block">
                            <input
                              type="checkbox"
                              className="absolute top-1 left-1 z-10"
                              checked={selectedImages.includes(i)}
                              onChange={(e) => {
                                const arr = new Set(selectedImages);
                                if (e.target.checked) arr.add(i); else arr.delete(i);
                                setSelectedImages(Array.from(arr));
                              }}
                            />
                            <img
                              src={url}
                              alt="gallery"
                              draggable
                              onDragStart={() => setDragIndex(i)}
                              onDragOver={(ev) => ev.preventDefault()}
                              onDrop={() => {
                                if (typeof dragIndex === 'undefined') return;
                                const arr = [...(form.images || [])];
                                const [m] = arr.splice(dragIndex, 1);
                                arr.splice(i, 0, m);
                                setForm({ ...form, images: arr });
                                setDragIndex(undefined);
                              }}
                              className={`w-12 h-12 object-cover rounded border cursor-move ${typeof dragIndex !== 'undefined' ? 'ring-2 ring-blue-500' : ''}`}
                            />
                            <button
                              type="button"
                              onClick={() => setForm({ ...form, images: (form.images || []).filter((_, idx) => idx !== i) })}
                              className="absolute -top-1 -right-1 bg-red-500 text-white rounded-full w-5 h-5 flex items-center justify-center text-xs"
                            >×</button>
                          </label>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
                {/* 变体设置 */}
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <label className="text-sm text-gray-600">SKU 变体</label>
                    <button onClick={addVariant} className="text-blue-600 hover:text-blue-800 flex items-center"><Plus className="w-4 h-4 mr-1" /> 添加变体</button>
                  </div>
                  {(form.variants || []).map((v, idx) => (
                    <div key={idx} className="grid grid-cols-6 gap-2 items-center mb-2">
                      <input className="border rounded px-2 py-1" placeholder="SKU" value={v.sku || ''} onChange={e => updateVariant(idx, { sku: e.target.value })} />
                      <input className="border rounded px-2 py-1" placeholder="颜色" value={v.attributes?.color || ''} onChange={e => updateVariant(idx, { attributes: { ...(v.attributes || {}), color: e.target.value } })} />
                      <input className="border rounded px-2 py-1" placeholder="尺码" value={v.attributes?.size || ''} onChange={e => updateVariant(idx, { attributes: { ...(v.attributes || {}), size: e.target.value } })} />
                      <input className="border rounded px-2 py-1" type="number" placeholder="加价" value={v.priceDelta || 0} onChange={e => updateVariant(idx, { priceDelta: Number(e.target.value) })} />
                      <div className="flex items-center space-x-2">
                        <input className="border rounded px-2 py-1 w-20" type="number" placeholder="库存" value={v.stock || 0} onChange={e => updateVariant(idx, { stock: Number(e.target.value) })} />
                        <button onClick={() => removeVariant(idx)} className="text-red-600 hover:text-red-800"><Trash2 className="w-4 h-4" /></button>
                      </div>
                      <div className="flex items-center space-x-2">
                        <input type="file" accept="image/*" onChange={async (e) => {
                          const file = e.target.files?.[0];
                          if (!file) return;
                          const res = await uploadAPI.uploadSingle(file, 'products');
                          const url = res?.data?.url || res?.url || res?.data;
                          if (url) updateVariant(idx, { image: url });
                        }} />
                        {v.image && <img src={v.image} alt="v" className="w-10 h-10 object-cover rounded border" />}
                      </div>
                    </div>
                  ))}
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
