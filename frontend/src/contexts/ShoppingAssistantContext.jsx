import React, { createContext, useContext, useState, useCallback, useRef } from 'react';
import { useAuth } from './AuthContext';
import { productAPI } from '../services/api';

const ShoppingAssistantContext = createContext();

export const useShoppingAssistant = () => {
  const context = useContext(ShoppingAssistantContext);
  if (!context) {
    throw new Error('useShoppingAssistant must be used within a ShoppingAssistantProvider');
  }
  return context;
};

export const ShoppingAssistantProvider = ({ children }) => {
  const { isAuthenticated, user } = useAuth();
  const [isListening, setIsListening] = useState(false);
  const [conversation, setConversation] = useState([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [suggestions, setSuggestions] = useState([]);
  const [priceAlerts, setPriceAlerts] = useState([]);
  const recognitionRef = useRef(null);

  // 语音识别初始化
  const initializeSpeechRecognition = useCallback(() => {
    if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
      const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
      const recognition = new SpeechRecognition();
      
      recognition.continuous = false;
      recognition.interimResults = false;
      recognition.lang = 'zh-CN';
      
      recognition.onstart = () => {
        setIsListening(true);
      };
      
      recognition.onresult = (event) => {
        const transcript = event.results[0][0].transcript;
        processVoiceCommand(transcript);
      };
      
      recognition.onend = () => {
        setIsListening(false);
      };
      
      recognition.onerror = (event) => {
        console.error('语音识别错误:', event.error);
        setIsListening(false);
      };
      
      recognitionRef.current = recognition;
    }
  }, []);

  // 处理语音命令
  const processVoiceCommand = useCallback(async (command) => {
    setIsProcessing(true);
    try {
      // 添加到对话历史
      setConversation(prev => [...prev, { type: 'user', message: command, timestamp: new Date() }]);
      
      // 智能解析用户意图
      const response = await analyzeUserIntent(command);
      
      // 添加到助手回复
      setConversation(prev => [...prev, { type: 'assistant', message: response.message, timestamp: new Date(), data: response.data }]);
      
      // 如果有商品建议，更新建议列表
      if (response.products && response.products.length > 0) {
        setSuggestions(response.products);
      }
      
    } catch (error) {
      console.error('处理语音命令失败:', error);
      setConversation(prev => [...prev, { 
        type: 'assistant', 
        message: '抱歉，我没有理解您的需求。请尝试说"帮我找手机"或"有什么优惠活动"', 
        timestamp: new Date() 
      }]);
    } finally {
      setIsProcessing(false);
    }
  }, []);

  // 分析用户意图
  const analyzeUserIntent = async (command) => {
    const lowerCommand = command.toLowerCase();
    
    // 商品搜索意图
    if (lowerCommand.includes('找') || lowerCommand.includes('搜索') || lowerCommand.includes('推荐')) {
      const keyword = extractKeyword(lowerCommand);
      if (keyword) {
        const response = await productAPI.searchProducts(`keyword=${keyword}`);
        return {
          message: `我为您找到了以下${keyword}相关商品：`,
          products: response.data || [],
          data: { type: 'product_search', keyword }
        };
      }
    }
    
    // 价格查询意图
    if (lowerCommand.includes('价格') || lowerCommand.includes('多少钱')) {
      const keyword = extractKeyword(lowerCommand);
      if (keyword) {
        return {
          message: `让我为您查询${keyword}的价格信息，并分析价格趋势...`,
          data: { type: 'price_query', keyword }
        };
      }
    }
    
    // 优惠查询意图
    if (lowerCommand.includes('优惠') || lowerCommand.includes('活动') || lowerCommand.includes('折扣')) {
      return {
        message: '当前有以下优惠活动：新人专享9折优惠，满299减50，更多优惠等您发现！',
        data: { type: 'promotion_query' }
      };
    }
    
    // 个性化推荐
    if (lowerCommand.includes('推荐') || lowerCommand.includes('喜欢')) {
      const response = await productAPI.getPersonalizedRecommendations({ limit: 6 });
      return {
        message: '根据您的偏好，我为您推荐以下商品：',
        products: response.data || [],
        data: { type: 'personalized_recommendation' }
      };
    }
    
    // 默认回复
    return {
      message: '我是您的AI购物助手，可以帮您：搜索商品、查询价格、获取优惠、个性化推荐。请说出您的需求！',
      data: { type: 'general_help' }
    };
  };

  // 提取关键词
  const extractKeyword = (text) => {
    const keywords = ['手机', '电脑', '衣服', '鞋子', '图书', '化妆品', '家电', '数码'];
    for (let keyword of keywords) {
      if (text.includes(keyword)) {
        return keyword;
      }
    }
    
    // 如果没有预设关键词，提取动词后的内容
    const patterns = [
      /找(.+)/, /搜索(.+)/, /推荐(.+)/, /价格(.+)/, /多少钱(.+)/
    ];
    
    for (let pattern of patterns) {
      const match = text.match(pattern);
      if (match && match[1]) {
        return match[1].trim();
      }
    }
    
    return null;
  };

  // 开始语音识别
  const startListening = useCallback(() => {
    if (recognitionRef.current && !isListening) {
      recognitionRef.current.start();
    }
  }, [isListening]);

  // 停止语音识别
  const stopListening = useCallback(() => {
    if (recognitionRef.current && isListening) {
      recognitionRef.current.stop();
    }
  }, [isListening]);

  // 文本输入处理
  const sendTextMessage = useCallback(async (message) => {
    if (!message.trim()) return;
    
    setConversation(prev => [...prev, { type: 'user', message, timestamp: new Date() }]);
    setIsProcessing(true);
    
    try {
      const response = await analyzeUserIntent(message);
      setConversation(prev => [...prev, { type: 'assistant', message: response.message, timestamp: new Date(), data: response.data }]);
      
      if (response.products && response.products.length > 0) {
        setSuggestions(response.products);
      }
    } catch (error) {
      console.error('处理文本消息失败:', error);
    } finally {
      setIsProcessing(false);
    }
  }, []);

  // 价格趋势分析
  const analyzePriceTrend = useCallback(async (productId) => {
    try {
      // 这里可以集成价格历史数据分析
      const response = await productAPI.getProduct(productId);
      const product = response.data;
      
      // 模拟价格趋势分析
      const currentPrice = product.price;
      const predictedPrice = currentPrice * 0.95; // 假设价格会下降5%
      const confidence = 0.85;
      
      return {
        currentPrice,
        predictedPrice,
        confidence,
        trend: 'down',
        recommendation: confidence > 0.8 ? '建议等待降价' : '当前价格合适'
      };
    } catch (error) {
      console.error('价格趋势分析失败:', error);
      return null;
    }
  }, []);

  // 设置价格提醒
  const setPriceAlert = useCallback((productId, targetPrice) => {
    const alert = {
      id: Date.now(),
      productId,
      targetPrice,
      createdAt: new Date(),
      active: true
    };
    
    setPriceAlerts(prev => [...prev, alert]);
    
    // 这里可以集成后端API保存价格提醒
    return alert;
  }, []);

  // 清除对话历史
  const clearConversation = useCallback(() => {
    setConversation([]);
    setSuggestions([]);
  }, []);

  // 初始化
  React.useEffect(() => {
    initializeSpeechRecognition();
    
    // 欢迎消息
    if (conversation.length === 0) {
      setConversation([{
        type: 'assistant',
        message: '您好！我是您的AI智能购物助手 🤖 可以通过语音或文字与我交流。我可以帮您搜索商品、查询价格、获取优惠信息和个性化推荐！',
        timestamp: new Date()
      }]);
    }
  }, [initializeSpeechRecognition, conversation.length]);

  const value = {
    conversation,
    isListening,
    isProcessing,
    suggestions,
    priceAlerts,
    startListening,
    stopListening,
    sendTextMessage,
    analyzePriceTrend,
    setPriceAlert,
    clearConversation
  };

  return (
    <ShoppingAssistantContext.Provider value={value}>
      {children}
    </ShoppingAssistantContext.Provider>
  );
};