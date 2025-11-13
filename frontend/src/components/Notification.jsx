import React, { useState, useEffect } from 'react';
import { X, AlertCircle, AlertTriangle, CheckCircle, Info } from 'lucide-react';

const Notification = ({ notification, onClose }) => {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    setIsVisible(true);
    const timer = setTimeout(() => {
      setIsVisible(false);
      setTimeout(() => onClose(notification.id), 300);
    }, notification.duration || 5000);

    return () => clearTimeout(timer);
  }, [notification, onClose]);

  const getIcon = (type) => {
    switch (type) {
      case 'error':
        return <AlertCircle className="h-5 w-5 text-red-400" />;
      case 'warning':
        return <AlertTriangle className="h-5 w-5 text-orange-400" />;
      case 'success':
        return <CheckCircle className="h-5 w-5 text-green-400" />;
      default:
        return <Info className="h-5 w-5 text-blue-400" />;
    }
  };

  const getBgColor = (type) => {
    switch (type) {
      case 'error':
        return 'bg-red-50 border-red-200';
      case 'warning':
        return 'bg-orange-50 border-orange-200';
      case 'success':
        return 'bg-green-50 border-green-200';
      default:
        return 'bg-blue-50 border-blue-200';
    }
  };

  const getTextColor = (type) => {
    switch (type) {
      case 'error':
        return 'text-red-800';
      case 'warning':
        return 'text-orange-800';
      case 'success':
        return 'text-green-800';
      default:
        return 'text-blue-800';
    }
  };

  return (
    <div
      className={`
        fixed top-4 right-4 z-50 max-w-sm w-full
        transform transition-all duration-300 ease-in-out
        ${isVisible ? 'translate-x-0 opacity-100' : 'translate-x-full opacity-0'}
        ${getBgColor(notification.type)}
        border rounded-lg shadow-lg p-4
      `}
    >
      <div className="flex items-start">
        <div className="flex-shrink-0">
          {getIcon(notification.type)}
        </div>
        <div className="ml-3 flex-1">
          <p className={`text-sm font-medium ${getTextColor(notification.type)}`}>
            {notification.title}
          </p>
          {notification.message && (
            <p className="mt-1 text-sm text-gray-600">
              {notification.message}
            </p>
          )}
        </div>
        <div className="ml-4 flex-shrink-0">
          <button
            onClick={() => {
              setIsVisible(false);
              setTimeout(() => onClose(notification.id), 300);
            }}
            className="inline-flex text-gray-400 hover:text-gray-500 focus:outline-none"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
      </div>
    </div>
  );
};

export default Notification;