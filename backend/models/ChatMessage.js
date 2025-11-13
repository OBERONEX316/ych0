const mongoose = require('mongoose');

const chatMessageSchema = new mongoose.Schema({
  // 消息发送者信息
  sender: {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    username: {
      type: String,
      required: true
    },
    avatar: String,
    role: {
      type: String,
      enum: ['user', 'admin', 'support'],
      default: 'user'
    }
  },
  
  // 消息接收者信息（对于客服系统，接收者通常是客服）
  receiver: {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    username: String,
    role: {
      type: String,
      enum: ['user', 'admin', 'support'],
      default: 'support'
    }
  },
  
  // 消息内容
  content: {
    type: String,
    required: true,
    trim: true,
    maxlength: 5000
  },
  
  // 富文本内容（HTML格式）
  richContent: {
    type: String,
    trim: true,
    maxlength: 10000
  },
  
  // 消息类型
  messageType: {
    type: String,
    enum: ['text', 'image', 'file', 'system'],
    default: 'text'
  },
  
  // 文件信息（如果是文件或图片消息）
  fileInfo: {
    filename: String,
    originalName: String,
    size: Number,
    mimeType: String,
    url: String
  },
  
  // 聊天会话ID
  sessionId: {
    type: String,
    required: true,
    index: true
  },
  
  // 消息状态
  status: {
    type: String,
    enum: ['sent', 'delivered', 'read', 'failed', 'recalled', 'edited'],
    default: 'sent'
  },
  
  // 编辑历史
  editHistory: [{
    content: String,
    richContent: String,
    editedAt: {
      type: Date,
      default: Date.now
    },
    editorId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    }
  }],
  
  // 撤回信息
  recallInfo: {
    recalledAt: Date,
    recalledBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    reason: String
  },
  
  // 是否为客服消息
  isSupportMessage: {
    type: Boolean,
    default: false
  },
  
  // 消息标签（用于分类）
  tags: [{
    type: String,
    enum: ['question', 'complaint', 'suggestion', 'technical', 'billing', 'general']
  }],
  
  // 优先级
  priority: {
    type: String,
    enum: ['low', 'normal', 'high', 'urgent'],
    default: 'normal'
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// 创建索引以提高查询性能
chatMessageSchema.index({ sessionId: 1, createdAt: 1 });
chatMessageSchema.index({ 'sender.userId': 1, createdAt: 1 });
chatMessageSchema.index({ 'receiver.userId': 1, createdAt: 1 });
chatMessageSchema.index({ status: 1 });

// 虚拟字段：格式化时间
chatMessageSchema.virtual('formattedTime').get(function() {
  return this.createdAt.toLocaleTimeString('zh-CN', {
    hour: '2-digit',
    minute: '2-digit'
  });
});

// 静态方法：获取会话消息
chatMessageSchema.statics.getSessionMessages = async function(sessionId, limit = 50, skip = 0) {
  return this.find({ sessionId })
    .sort({ createdAt: 1 })
    .skip(skip)
    .limit(limit)
    .populate('sender.userId', 'username avatar')
    .populate('receiver.userId', 'username avatar');
};

// 静态方法：标记消息为已读
chatMessageSchema.statics.markAsRead = async function(messageIds, userId) {
  return this.updateMany(
    {
      _id: { $in: messageIds },
      'receiver.userId': userId,
      status: { $ne: 'read' }
    },
    { status: 'read' }
  );
};

// 静态方法：撤回消息
chatMessageSchema.statics.recallMessage = async function(messageId, userId, reason = '') {
  const message = await this.findById(messageId);
  
  if (!message) {
    throw new Error('消息不存在');
  }
  
  // 检查权限：只有发送者或管理员可以撤回消息
  if (message.sender.userId.toString() !== userId.toString() && 
      !['admin', 'support'].includes(message.sender.role)) {
    throw new Error('无权撤回此消息');
  }
  
  // 检查消息是否已超过撤回时间限制（2分钟）
  const timeDiff = Date.now() - message.createdAt.getTime();
  const recallTimeLimit = 2 * 60 * 1000; // 2分钟
  
  if (timeDiff > recallTimeLimit && !['admin', 'support'].includes(message.sender.role)) {
    throw new Error('消息已超过撤回时间限制');
  }
  
  message.status = 'recalled';
  message.recallInfo = {
    recalledAt: new Date(),
    recalledBy: userId,
    reason: reason
  };
  
  return message.save();
};

// 静态方法：编辑消息
chatMessageSchema.statics.editMessage = async function(messageId, userId, newContent, newRichContent = null) {
  const message = await this.findById(messageId);
  
  if (!message) {
    throw new Error('消息不存在');
  }
  
  // 检查权限：只有发送者可以编辑消息
  if (message.sender.userId.toString() !== userId.toString()) {
    throw new Error('无权编辑此消息');
  }
  
  // 检查消息是否已超过编辑时间限制（5分钟）
  const timeDiff = Date.now() - message.createdAt.getTime();
  const editTimeLimit = 5 * 60 * 1000; // 5分钟
  
  if (timeDiff > editTimeLimit) {
    throw new Error('消息已超过编辑时间限制');
  }
  
  // 保存编辑历史
  message.editHistory.push({
    content: message.content,
    richContent: message.richContent,
    editedAt: new Date(),
    editorId: userId
  });
  
  // 更新消息内容
  message.content = newContent;
  if (newRichContent !== null) {
    message.richContent = newRichContent;
  }
  message.status = 'edited';
  
  return message.save();
};

module.exports = mongoose.model('ChatMessage', chatMessageSchema);