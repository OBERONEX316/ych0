import React, { useState, useEffect, useRef } from 'react';
import { Mic, MicOff, Send, X, ShoppingBag, TrendingUp, Headphones } from 'lucide-react';
import { useShoppingAssistant } from '../contexts/ShoppingAssistantContext';
import { toast } from 'sonner';

const ShoppingAssistant = () => {
  const {
    isActive,
    isListening,
    conversation,
    currentTranscript,
    startListening,
    stopListening,
    sendTextMessage,
    toggleAssistant,
    priceTrends
  } = useShoppingAssistant();

  const [inputText, setInputText] = useState('');
  const [showPriceChart, setShowPriceChart] = useState(false);
  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [conversation]);

  const handleSendMessage = async () => {
    if (!inputText.trim()) return;
    
    try {
      await sendTextMessage(inputText);
      setInputText('');
    } catch (error) {
      toast.error('发送消息失败，请重试');
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const toggleListening = () => {
    if (isListening) {
      stopListening();
    } else {
      startListening();
    }
  };

  if (!isActive) {
    return (
      <div className="fixed bottom-6 right-6 z-50">
        <button
          onClick={toggleAssistant}
          className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white rounded-full p-4 shadow-lg transition-all duration-300 hover:scale-110 animate-pulse"
        >
          <Headphones className="w-6 h-6" />
        </button>
      </div>
    );
  }

  return (
    <div className="fixed bottom-6 right-6 w-96 h-[500px] bg-white rounded-lg shadow-2xl border border-gray-200 z-50 flex flex-col">
      {/* Header */}
      <div className="bg-gradient-to-r from-blue-600 to-purple-600 text-white p-4 rounded-t-lg flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <div className="relative">
            <Headphones className="w-6 h-6" />
            {isListening && (
              <div className="absolute -top-1 -right-1 w-3 h-3 bg-red-500 rounded-full animate-pulse"></div>
            )}
          </div>
          <div>
            <h3 className="font-semibold">AI购物助手</h3>
            <p className="text-xs opacity-90">
              {isListening ? '正在聆听...' : '随时为您服务'}
            </p>
          </div>
        </div>
        <button
          onClick={toggleAssistant}
          className="text-white hover:text-gray-200 transition-colors"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {conversation.map((message, index) => (
          <div
            key={index}
            className={`flex ${message.type === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            <div
              className={`max-w-[80%] rounded-lg p-3 ${
                message.type === 'user'
                  ? 'bg-blue-500 text-white'
                  : 'bg-gray-100 text-gray-800'
              }`}
            >
              <p className="text-sm">{message.content}</p>
              {message.timestamp && (
                <p className="text-xs opacity-70 mt-1">
                  {new Date(message.timestamp).toLocaleTimeString()}
                </p>
              )}
              
              {/* Product suggestions */}
              {message.products && message.products.length > 0 && (
                <div className="mt-3 space-y-2">
                  <p className="text-xs font-medium">为您推荐：</p>
                  {message.products.map((product, idx) => (
                    <div key={idx} className="bg-white rounded p-2 shadow-sm">
                      <p className="font-medium text-sm">{product.name}</p>
                      <p className="text-red-600 font-bold text-sm">¥{product.price}</p>
                    </div>
                  ))}
                </div>
              )}

              {/* Price analysis */}
              {message.priceAnalysis && (
                <div className="mt-3 p-2 bg-yellow-50 rounded">
                  <div className="flex items-center space-x-2">
                    <TrendingUp className="w-4 h-4 text-yellow-600" />
                    <p className="text-xs font-medium text-yellow-800">
                      {message.priceAnalysis.trend}
                    </p>
                  </div>
                  <p className="text-xs text-yellow-700 mt-1">
                    {message.priceAnalysis.suggestion}
                  </p>
                  <button
                    onClick={() => setShowPriceChart(!showPriceChart)}
                    className="text-xs text-blue-600 hover:text-blue-800 mt-1"
                  >
                    查看价格趋势
                  </button>
                </div>
              )}
            </div>
          </div>
        ))}

        {/* Current transcript */}
        {isListening && currentTranscript && (
          <div className="flex justify-start">
            <div className="max-w-[80%] bg-gray-100 rounded-lg p-3 animate-pulse">
              <p className="text-sm text-gray-600 italic">{currentTranscript}</p>
            </div>
          </div>
        )}
        
        <div ref={messagesEndRef} />
      </div>

      {/* Price Chart Modal */}
      {showPriceChart && (
        <div className="absolute inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg p-4 w-full max-w-sm">
            <div className="flex items-center justify-between mb-3">
              <h4 className="font-semibold">价格趋势</h4>
              <button
                onClick={() => setShowPriceChart(false)}
                className="text-gray-500 hover:text-gray-700"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="h-32 bg-gray-50 rounded flex items-center justify-center">
              <p className="text-sm text-gray-600">价格趋势图表</p>
            </div>
            {priceTrends && (
              <div className="mt-3 text-xs text-gray-600">
                <p>平均价格: ¥{priceTrends.averagePrice}</p>
                <p>价格区间: ¥{priceTrends.minPrice} - ¥{priceTrends.maxPrice}</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Input Area */}
      <div className="border-t border-gray-200 p-4">
        <div className="flex items-center space-x-2">
          <button
            onClick={toggleListening}
            className={`p-2 rounded-full transition-colors ${
              isListening
                ? 'bg-red-500 text-white animate-pulse'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            {isListening ? <MicOff className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
          </button>
          
          <input
            ref={inputRef}
            type="text"
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder="输入您的问题..."
            className="flex-1 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          
          <button
            onClick={handleSendMessage}
            disabled={!inputText.trim()}
            className="p-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            <Send className="w-5 h-5" />
          </button>
        </div>
        
        <div className="mt-2 text-xs text-gray-500 text-center">
          {isListening ? '点击停止录音' : '点击开始语音输入'}
        </div>
      </div>
    </div>
  );
};

export default ShoppingAssistant;