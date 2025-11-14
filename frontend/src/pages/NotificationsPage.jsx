import React, { useEffect, useState } from 'react';
import Navbar from '../components/Navbar';
import { notificationAPI } from '../services/api';
import { CheckCircle, Bell } from 'lucide-react';

const NotificationsPage = () => {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = async () => {
    try {
      setLoading(true);
      setError('');
      const res = await notificationAPI.list({ unreadOnly: false });
      setItems(res?.data || []);
    } catch (e) {
      setError(e?.response?.data?.error || '加载失败');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const markAllRead = async () => {
    try {
      await notificationAPI.markAllRead();
      load();
    } catch (_) {}
  };

  const markRead = async (id) => {
    try {
      await notificationAPI.markRead(id);
      load();
    } catch (_) {}
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <Bell className="h-12 w-12 text-primary-600 animate-bounce mx-auto mb-4" />
          <p className="text-gray-600 text-lg">正在加载通知...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white">
      <Navbar />
      <div className="max-w-4xl mx-auto p-6">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold text-gray-900">通知</h1>
          <button onClick={markAllRead} className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors">全部标记已读</button>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 rounded-md p-4 mb-4">
            <p className="text-sm text-red-700">{error}</p>
          </div>
        )}

        {items.length === 0 ? (
          <div className="text-center py-12">
            <Bell className="w-16 h-16 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-600">暂无通知</p>
          </div>
        ) : (
          <div className="space-y-4">
            {items.map(n => (
              <div key={n._id} className="border border-gray-200 rounded-lg p-4 flex items-start justify-between">
                <div>
                  <p className="text-sm text-gray-500 mb-1">{new Date(n.createdAt).toLocaleString()}</p>
                  <p className="font-medium text-gray-900">{n.title || n.type}</p>
                  {n.message && <p className="text-gray-700 mt-1 text-sm">{n.message}</p>}
                </div>
                <div className="flex items-center space-x-2">
                  {!n.read && (
                    <button onClick={() => markRead(n._id)} className="text-blue-600 hover:text-blue-800 flex items-center">
                      <CheckCircle className="w-5 h-5 mr-1" /> 标记已读
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default NotificationsPage;

