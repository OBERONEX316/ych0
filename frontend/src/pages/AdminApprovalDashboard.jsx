import React, { useEffect, useState } from 'react';
import api from '../services/api';

export default function AdminApprovalDashboard() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(1);
  const [limit, setLimit] = useState(20);
  const [selected, setSelected] = useState(new Set());

  const [approvalState, setApprovalState] = useState('');
  const [status, setStatus] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  useEffect(() => {
    const load = async () => {
      try {
        setLoading(true);
        const params = { limit, page };
        if (approvalState) params.approvalState = approvalState;
        if (status) params.status = status;
        if (startDate) params.startDate = startDate;
        if (endDate) params.endDate = endDate;
        const res = await api.get('/notifications/admin/odoo', { params });
        setItems(res?.data || []);
        setPages(res?.pagination?.pages || 1);
      } catch (e) {
        setError(e.message);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [approvalState, status, startDate, endDate, page, limit]);

  const counts = items.reduce((acc, n) => {
    const s = n.data?.approvalState || 'unknown';
    acc[s] = (acc[s] || 0) + 1;
    return acc;
  }, {});

  const daily = (() => {
    const map = {};
    items.forEach(n => {
      const d = new Date(n.createdAt).toISOString().slice(0,10);
      const s = n.data?.approvalState || 'unknown';
      map[d] = map[d] || { submitted:0, approved:0, rejected:0, confirmed:0 };
      if (map[d][s] !== undefined) map[d][s]++;
    });
    const arr = Object.keys(map).sort().map(k => ({ date:k, ...map[k] }));
    return arr;
  })();

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-4">审批管理</h1>
      <div className="flex flex-wrap items-end gap-3 mb-4">
        <div>
          <label className="block text-sm text-gray-600">审批</label>
          <select className="border rounded p-2" value={approvalState} onChange={e=>setApprovalState(e.target.value)}>
            <option value="">全部</option>
            <option value="submitted">待审批</option>
            <option value="approved">已审批</option>
            <option value="rejected">已拒绝</option>
            <option value="confirmed">已确认</option>
          </select>
        </div>
        <div>
          <label className="block text-sm text-gray-600">状态</label>
          <select className="border rounded p-2" value={status} onChange={e=>setStatus(e.target.value)}>
            <option value="">全部</option>
            <option value="unread">未读</option>
            <option value="read">已读</option>
            <option value="archived">归档</option>
          </select>
        </div>
        <div>
          <label className="block text-sm text-gray-600">开始日期</label>
          <input type="date" className="border rounded p-2" value={startDate} onChange={e=>setStartDate(e.target.value)} />
        </div>
        <div>
          <label className="block text-sm text-gray-600">结束日期</label>
          <input type="date" className="border rounded p-2" value={endDate} onChange={e=>setEndDate(e.target.value)} />
        </div>
        <button className="px-3 py-2 bg-blue-600 text-white rounded" onClick={async()=>{
          const params = new URLSearchParams();
          if (approvalState) params.append('approvalState', approvalState);
          if (status) params.append('status', status);
          if (startDate) params.append('startDate', startDate);
          if (endDate) params.append('endDate', endDate);
          window.location.href = `/api/notifications/admin/odoo/export?${params.toString()}`;
        }}>导出CSV</button>
      </div>
      {loading && <p>加载中...</p>}
      {error && <p className="text-red-600">{error}</p>}
      {!loading && !error && (
        <div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
            {['submitted','approved','rejected','confirmed'].map(k => (
              <div key={k} className="bg-gray-50 border rounded p-4">
                <div className="text-gray-500 text-sm">{k}</div>
                <div className="text-2xl font-semibold">{counts[k] || 0}</div>
              </div>
            ))}
            <div className="bg-gray-50 border rounded p-4">
              <div className="text-gray-500 text-sm">总数</div>
              <div className="text-2xl font-semibold">{items.length}</div>
            </div>
          </div>

          <div className="bg-white border rounded p-4 mb-6">
            <div className="text-sm text-gray-600 mb-2">近数据趋势（每日数量）</div>
            <svg width="100%" height="160">
              {(() => {
                const w = 800; const h = 140; const pad = 40;
                const data = daily;
                const dates = data.map(d=>d.date);
                const max = Math.max(1, ...data.map(d=>Math.max(d.submitted,d.approved,d.rejected,d.confirmed)));
                const x = (i)=> pad + (w - 2*pad) * (i / Math.max(1, data.length-1));
                const y = (v)=> pad + (h - pad) * (1 - v / max);
                const colors = { submitted:'#3b82f6', approved:'#22c55e', rejected:'#f59e0b', confirmed:'#10b981' };
                const series = ['submitted','approved','rejected','confirmed'];
                return (
                  <g>
                    {series.map((s, si)=> (
                      <polyline key={s} fill="none" stroke={colors[s]} strokeWidth="2"
                        points={data.map((d,i)=> `${x(i)},${y(d[s])}`).join(' ')} />
                    ))}
                    {data.map((d,i)=> (
                      <text key={d.date} x={x(i)} y={h+10} fontSize="10" fill="#6b7280" textAnchor="middle">{d.date.slice(5)}</text>
                    ))}
                  </g>
                );
              })()}
            </svg>
          </div>

          <div className="overflow-x-auto bg-white border rounded">
            <table className="min-w-full">
              <thead>
                <tr className="bg-gray-100 text-left">
                  <th className="p-2"><input type="checkbox" onChange={e=>{
                    if (e.target.checked) setSelected(new Set(items.map(n=>n._id)));
                    else setSelected(new Set());
                  }} /></th>
                  <th className="p-2">时间</th>
                  <th className="p-2">标题</th>
                  <th className="p-2">审批</th>
                  <th className="p-2">状态</th>
                  <th className="p-2">金额</th>
                  <th className="p-2">链接</th>
                </tr>
              </thead>
              <tbody>
                {items.map(n => (
                  <tr key={n._id} className="border-t">
                    <td className="p-2"><input type="checkbox" checked={selected.has(n._id)} onChange={e=>{
                      const s = new Set(selected); if (e.target.checked) s.add(n._id); else s.delete(n._id); setSelected(s);
                    }} /></td>
                    <td className="p-2 text-sm text-gray-600">{new Date(n.createdAt).toLocaleString()}</td>
                    <td className="p-2">{n.title}</td>
                    <td className="p-2">{n.data?.approvalState || '-'}</td>
                    <td className="p-2">{n.status}</td>
                    <td className="p-2">{n.data?.amount ?? '-'}</td>
                    <td className="p-2">
                      {n.data?.url ? <a className="text-blue-600" href={n.data.url} target="_blank" rel="noreferrer">查看</a> : '-'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="flex items-center gap-2 mb-3 mt-4">
            <button className="px-3 py-2 bg-gray-100 border rounded" disabled={page<=1} onClick={()=>setPage(p=>Math.max(1,p-1))}>上一页</button>
            <span className="text-sm">第 {page} / {pages} 页</span>
            <button className="px-3 py-2 bg-gray-100 border rounded" disabled={page>=pages} onClick={()=>setPage(p=>Math.min(pages,p+1))}>下一页</button>
            <select className="border rounded p-2 ml-2" value={limit} onChange={e=>{setLimit(parseInt(e.target.value)); setPage(1);}}>
              <option value={20}>20</option>
              <option value={50}>50</option>
              <option value={100}>100</option>
            </select>
            <button className="ml-auto px-3 py-2 bg-green-600 text-white rounded" onClick={async()=>{
              const ids = Array.from(selected);
              if (ids.length===0) return;
              await api.put('/notifications/admin/read', { notificationIds: ids });
              setSelected(new Set());
              const params = { limit, page };
              if (approvalState) params.approvalState = approvalState;
              if (status) params.status = status;
              if (startDate) params.startDate = startDate;
              if (endDate) params.endDate = endDate;
              const res = await api.get('/notifications/admin/odoo', { params });
              setItems(res?.data || []);
              setPages(res?.pagination?.pages || 1);
            }}>标记选中为已读</button>
          </div>
        </div>
      )}
    </div>
  );
}
