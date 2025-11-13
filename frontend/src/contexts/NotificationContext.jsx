import React, { createContext, useContext, useReducer } from 'react';
import Notification from '../components/Notification';

// 通知类型
export const NOTIFICATION_TYPES = {
  INFO: 'info',
  SUCCESS: 'success',
  WARNING: 'warning',
  ERROR: 'error'
};

// 初始状态
const initialState = {
  notifications: []
};

// Action Types
const ADD_NOTIFICATION = 'ADD_NOTIFICATION';
const REMOVE_NOTIFICATION = 'REMOVE_NOTIFICATION';

// Reducer
const notificationReducer = (state, action) => {
  switch (action.type) {
    case ADD_NOTIFICATION:
      return {
        ...state,
        notifications: [...state.notifications, action.payload]
      };
    case REMOVE_NOTIFICATION:
      return {
        ...state,
        notifications: state.notifications.filter(
          notification => notification.id !== action.payload
        )
      };
    default:
      return state;
  }
};

// Context
const NotificationContext = createContext();

// Provider
export const NotificationProvider = ({ children }) => {
  const [state, dispatch] = useReducer(notificationReducer, initialState);

  const addNotification = (notification) => {
    const id = Date.now().toString();
    dispatch({
      type: ADD_NOTIFICATION,
      payload: { id, ...notification }
    });
    return id;
  };

  const removeNotification = (id) => {
    dispatch({ type: REMOVE_NOTIFICATION, payload: id });
  };

  const showNotification = (title, message, type = NOTIFICATION_TYPES.INFO, duration = 5000) => {
    return addNotification({ title, message, type, duration });
  };

  const showStockAlertNotification = (productName, stockStatus, currentStock, threshold) => {
    let title, message, type;
    
    switch (stockStatus) {
      case 'critical':
        title = '紧急库存预警';
        message = `商品"${productName}"库存紧急！当前库存: ${currentStock}, 紧急阈值: ${threshold}`;
        type = NOTIFICATION_TYPES.ERROR;
        break;
      case 'low':
        title = '库存不足预警';
        message = `商品"${productName}"库存不足！当前库存: ${currentStock}, 预警阈值: ${threshold}`;
        type = NOTIFICATION_TYPES.WARNING;
        break;
      case 'out-of-stock':
        title = '缺货预警';
        message = `商品"${productName}"已缺货！请及时补货。`;
        type = NOTIFICATION_TYPES.ERROR;
        break;
      default:
        return;
    }
    
    return showNotification(title, message, type, 8000);
  };

  const value = {
    notifications: state.notifications,
    addNotification,
    removeNotification,
    showNotification,
    showStockAlertNotification
  };

  return (
    <NotificationContext.Provider value={value}>
      {children}
      {state.notifications.map(notification => (
        <Notification
          key={notification.id}
          notification={notification}
          onClose={removeNotification}
        />
      ))}
    </NotificationContext.Provider>
  );
};

// Hook
export const useNotification = () => {
  const context = useContext(NotificationContext);
  if (!context) {
    throw new Error('useNotification must be used within a NotificationProvider');
  }
  return context;
};

export default NotificationContext;