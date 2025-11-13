const express = require('express');
const {
  getUserSessions,
  getSessionMessages,
  createSession,
  sendMessage,
  markMessagesAsRead,
  closeSession,
  getSupportStats,
  recallMessage,
  editMessage,
  getMessageEditHistory,
  getAssignmentStatus,
  manualAssignSession,
  updateAgentAvailability,
  updateSessionPriority,
  addSessionTag,
  removeSessionTag,
  getTagStatistics,
  transferSession,
  inviteCollaborator,
  joinCollaboration,
  leaveCollaboration,
  getCollaborationSessions,
  submitSessionRating,
  getSessionRating,
  getAgentRatingStats,
  getAgentRatingRankings,
  getOverallRatingStats
} = require('../controllers/chatController');
const { protect } = require('../middleware/auth');

const router = express.Router();

// 所有路由都需要认�?router.use(protect);

// 获取用户聊天会话列表
router.get('/sessions', getUserSessions);

// 获取会话消息历史
router.get('/sessions/:sessionId/messages', getSessionMessages);

// 创建新会�?router.post('/sessions', createSession);

// 发送消�?router.post('/messages', sendMessage);

// 标记消息为已�?router.patch('/messages/read', markMessagesAsRead);

// 关闭会话
router.patch('/sessions/:sessionId/close', closeSession);

// 获取客服统计数据（仅管理员和客服�?router.get('/stats', getSupportStats);

// 撤回消息
router.patch('/messages/:messageId/recall', recallMessage);

// 编辑消息
router.patch('/messages/:messageId/edit', editMessage);

// 获取消息编辑历史
router.get('/messages/:messageId/history', getMessageEditHistory);

// 获取自动分配系统状态（仅管理员和客服）
router.get('/assignment/status', getAssignmentStatus);

// 手动分配会话（仅管理员）
router.post('/sessions/:sessionId/assign/:agentId', manualAssignSession);

// 更新客服可用状态（仅客服和管理员）
router.patch('/agents/availability', updateAgentAvailability);

// 更新会话优先级（仅客服和管理员）
router.patch('/sessions/:sessionId/priority', updateSessionPriority);

// 添加会话标签（仅客服和管理员�?router.post('/sessions/:sessionId/tags', addSessionTag);

// 移除会话标签（仅客服和管理员�?router.delete('/sessions/:sessionId/tags/:tag', removeSessionTag);

// 获取会话标签统计（仅客服和管理员�?router.get('/tags/stats', getTagStatistics);

// 转接会话到另一个客服（仅客服和管理员）
router.post('/sessions/:sessionId/transfer', transferSession);

// 邀请客服协作（仅客服和管理员）
router.post('/sessions/:sessionId/invite', inviteCollaborator);

// 加入协作会话（仅客服和管理员�?router.post('/sessions/:sessionId/join', joinCollaboration);

// 离开协作会话（仅客服和管理员�?router.post('/sessions/:sessionId/leave', leaveCollaboration);

// 获取协作会话列表（仅客服和管理员�?router.get('/collaboration/sessions', getCollaborationSessions);

// 提交会话满意度评价（会话参与者）
router.post('/sessions/:sessionId/rating', submitSessionRating);

// 获取会话评价详情（会话参与者、客服、管理员�?router.get('/sessions/:sessionId/rating', getSessionRating);

// 获取客服评分统计（客服和管理员）
router.get('/agents/:agentId/rating-stats', getAgentRatingStats);

// 获取客服评分排名（仅管理员）
router.get('/agents/rating-rankings', getAgentRatingRankings);

// 获取整体评价统计（仅管理员）
router.get('/rating-stats', getOverallRatingStats);

module.exports = router;
