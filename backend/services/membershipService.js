const MembershipLevel = require('../models/MembershipLevel');
const UserMembership = require('../models/UserMembership');
const MembershipTask = require('../models/MembershipTask');
const Coupon = require('../models/Coupon');
const Order = require('../models/Order');

class MembershipService {
  // 初始化用户会员信息
  static async initializeUserMembership(userId) {
    try {
      const existingMembership = await UserMembership.findOne({ userId });
      if (existingMembership) {
        return existingMembership;
      }

      const defaultLevel = await MembershipLevel.findOne({ level: 1 });
      if (!defaultLevel) {
        throw new Error('系统未配置默认会员等级');
      }

      const userMembership = new UserMembership({
        userId: userId,
        currentLevel: defaultLevel._id,
        membershipExpiry: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000)
      });

      await userMembership.save();
      return userMembership;
    } catch (error) {
      console.error('初始化用户会员失败:', error);
      throw error;
    }
  }

  // 处理订单完成后的会员相关逻辑
  static async processOrderCompletion(order) {
    try {
      const userId = order.user;
      const orderTotal = order.totalPrice;
      
      // 获取或创建用户会员信息
      let userMembership = await UserMembership.getUserMembership(userId);
      if (!userMembership) {
        userMembership = await this.initializeUserMembership(userId);
      }

      // 更新用户统计
      userMembership.stats.totalSpent += orderTotal;
      userMembership.stats.totalOrders += 1;
      userMembership.stats.recentStats.spent += orderTotal;
      userMembership.stats.recentStats.orders += 1;

      // 计算积分奖励
      const currentLevel = await MembershipLevel.findById(userMembership.currentLevel);
      const pointsEarned = Math.floor(orderTotal * currentLevel.benefits.pointsMultiplier);
      
      if (pointsEarned > 0) {
        await userMembership.addPoints(pointsEarned, '订单完成奖励', order._id);
      }

      await userMembership.save();

      // 检查会员等级升级
      await this.checkMembershipUpgrade(userId);

      // 处理相关任务进度
      await this.processOrderRelatedTasks(userId, order);

      return {
        pointsEarned,
        newLevel: null // 将在升级检查中设置
      };
    } catch (error) {
      console.error('处理订单完成失败:', error);
      throw error;
    }
  }

  // 检查会员等级升级
  static async checkMembershipUpgrade(userId) {
    try {
      const userMembership = await UserMembership.getUserMembership(userId);
      if (!userMembership) return null;

      const currentLevel = await MembershipLevel.findById(userMembership.currentLevel);
      const userStats = userMembership.stats;

      // 计算应该达到的等级
      const deservedLevel = await MembershipLevel.calculateUserLevel(userStats);

      // 如果需要升级
      if (deservedLevel.level > currentLevel.level) {
        await userMembership.upgradeLevel(deservedLevel, 'auto_upgrade', '自动升级');

        // 发放升级奖励
        await this.processUpgradeRewards(userId, deservedLevel);

        // 发送升级通知（可以集成通知系统）
        await this.sendUpgradeNotification(userId, currentLevel, deservedLevel);

        return deservedLevel;
      }

      return null;
    } catch (error) {
      console.error('检查会员升级失败:', error);
      throw error;
    }
  }

  // 处理升级奖励
  static async processUpgradeRewards(userId, newLevel) {
    try {
      const userMembership = await UserMembership.getUserMembership(userId);
      if (!userMembership) return;

      // 发放等级专属优惠券
      if (newLevel.benefits.exclusiveCoupons && newLevel.benefits.exclusiveCoupons.length > 0) {
        for (const couponId of newLevel.benefits.exclusiveCoupons) {
          const coupon = await Coupon.findById(couponId);
          if (coupon) {
            userMembership.exclusiveCoupons.push({
              couponId: couponId,
              receivedDate: new Date()
            });
          }
        }
      }

      // 发放升级奖励积分
      const upgradeBonusPoints = newLevel.level * 100; // 每个等级100积分
      if (upgradeBonusPoints > 0) {
        await userMembership.addPoints(upgradeBonusPoints, `升级到${newLevel.name}奖励`);
      }

      await userMembership.save();
    } catch (error) {
      console.error('处理升级奖励失败:', error);
      throw error;
    }
  }

  // 处理订单相关任务
  static async processOrderRelatedTasks(userId, order) {
    try {
      const tasks = await MembershipTask.find({
        taskType: { $in: ['first_purchase', 'total_spending', 'total_orders', 'category_purchase', 'payment_method'] },
        isActive: true
      });

      for (const task of tasks) {
        await this.updateTaskProgressForOrder(userId, task, order);
      }
    } catch (error) {
      console.error('处理订单相关任务失败:', error);
      throw error;
    }
  }

  // 更新订单相关任务进度
  static async updateTaskProgressForOrder(userId, task, order) {
    try {
      const userMembership = await UserMembership.getUserMembership(userId);
      if (!userMembership) return;

      let taskProgress = userMembership.tasksProgress.find(tp => tp.taskId.toString() === task._id.toString());
      
      if (!taskProgress) {
        taskProgress = {
          taskId: task._id,
          progress: 0,
          target: task.target,
          isCompleted: false
        };
        userMembership.tasksProgress.push(taskProgress);
      }

      // 如果任务已完成且不可重复，跳过
      if (taskProgress.isCompleted && !task.isRepeatable()) {
        return;
      }

      let shouldUpdate = false;
      let progressIncrement = 0;

      switch (task.taskType) {
        case 'first_purchase':
          if (userMembership.stats.totalOrders === 1) {
            progressIncrement = 1;
            shouldUpdate = true;
          }
          break;

        case 'total_spending':
          progressIncrement = order.totalPrice;
          shouldUpdate = true;
          break;

        case 'total_orders':
          progressIncrement = 1;
          shouldUpdate = true;
          break;

        case 'category_purchase':
          if (task.conditions.categories && task.conditions.categories.length > 0) {
            // 这里需要检查订单中是否有指定分类的商品
            // 简化处理：假设订单满足条件
            progressIncrement = 1;
            shouldUpdate = true;
          }
          break;

        case 'payment_method':
          if (task.conditions.paymentMethods && task.conditions.paymentMethods.includes(order.paymentMethod)) {
            progressIncrement = 1;
            shouldUpdate = true;
          }
          break;
      }

      if (shouldUpdate) {
        taskProgress.progress += progressIncrement;
        taskProgress.isCompleted = taskProgress.progress >= taskProgress.target;
        
        if (taskProgress.isCompleted) {
          taskProgress.completedAt = new Date();
        }

        await userMembership.save();

        // 如果任务完成，领取奖励
        if (taskProgress.isCompleted && !taskProgress.rewardsClaimed) {
          await this.claimTaskRewards(userId, task._id);
        }
      }
    } catch (error) {
      console.error('更新任务进度失败:', error);
      throw error;
    }
  }

  // 领取任务奖励
  static async claimTaskRewards(userId, taskId) {
    try {
      const userMembership = await UserMembership.getUserMembership(userId);
      const task = await MembershipTask.findById(taskId);
      
      if (!userMembership || !task) return;
      
      const taskProgress = userMembership.tasksProgress.find(tp => tp.taskId.toString() === taskId.toString());
      
      if (!taskProgress || !taskProgress.isCompleted || taskProgress.rewardsClaimed) return;
      
      const rewards = task.rewards;
      
      // 发放积分奖励
      if (rewards.points > 0) {
        await userMembership.addPoints(rewards.points, `完成任务: ${task.title}`);
      }
      
      // 发放优惠券奖励
      if (rewards.coupons && rewards.coupons.length > 0) {
        for (const couponReward of rewards.coupons) {
          const coupon = await Coupon.findById(couponReward.couponId);
          if (coupon) {
            userMembership.exclusiveCoupons.push({
              couponId: couponReward.couponId,
              receivedDate: new Date()
            });
          }
        }
      }
      
      // 标记奖励已领取
      taskProgress.rewardsClaimed = true;
      await userMembership.save();
      
      console.log(`用户 ${userId} 领取了任务 ${task.title} 的奖励`);
    } catch (error) {
      console.error('领取任务奖励失败:', error);
      throw error;
    }
  }

  // 发送升级通知
  static async sendUpgradeNotification(userId, oldLevel, newLevel) {
    try {
      // 这里可以集成邮件、短信或应用内通知系统
      console.log(`用户 ${userId} 从 ${oldLevel.name} 升级到 ${newLevel.name}`);
      
      // 示例：创建通知记录（需要集成通知系统）
      // const notification = {
      //   userId: userId,
      //   type: 'membership_upgrade',
      //   title: '会员等级提升',
      //   content: `恭喜您从 ${oldLevel.name} 升级到 ${newLevel.name}，享受更多专属权益！`,
      //   data: {
      //     oldLevel: oldLevel,
      //     newLevel: newLevel
      //   }
      // };
      
      // await notificationService.createNotification(notification);
    } catch (error) {
      console.error('发送升级通知失败:', error);
    }
  }

  // 获取用户会员权益
  static async getUserMembershipBenefits(userId) {
    try {
      const userMembership = await UserMembership.getUserMembership(userId);
      if (!userMembership) return null;

      const currentLevel = await MembershipLevel.findById(userMembership.currentLevel);
      if (!currentLevel) return null;

      return {
        level: currentLevel,
        benefits: currentLevel.benefits,
        membershipExpiry: userMembership.membershipExpiry,
        availablePoints: userMembership.getAvailablePoints(),
        exclusiveCoupons: userMembership.exclusiveCoupons.filter(c => !c.isUsed)
      };
    } catch (error) {
      console.error('获取用户会员权益失败:', error);
      throw error;
    }
  }

  // 计算订单会员折扣
  static async calculateOrderDiscount(userId, orderTotal) {
    try {
      const benefits = await this.getUserMembershipBenefits(userId);
      if (!benefits || !benefits.level) {
        return {
          discountAmount: 0,
          finalTotal: orderTotal,
          discountRate: 0
        };
      }

      const discountRate = benefits.level.benefits.discountRate || 0;
      const discountAmount = Math.floor(orderTotal * discountRate / 100);
      const finalTotal = orderTotal - discountAmount;

      return {
        discountAmount,
        finalTotal,
        discountRate,
        levelName: benefits.level.name
      };
    } catch (error) {
      console.error('计算订单会员折扣失败:', error);
      return {
        discountAmount: 0,
        finalTotal: orderTotal,
        discountRate: 0
      };
    }
  }

  // 每日任务重置
  static async resetDailyTasks() {
    try {
      const dailyTasks = await MembershipTask.find({
        dailyReset: true,
        isActive: true
      });

      for (const task of dailyTasks) {
        // 重置所有用户的每日任务进度
        await UserMembership.updateMany(
          { 'tasksProgress.taskId': task._id },
          {
            $set: {
              'tasksProgress.$.progress': 0,
              'tasksProgress.$.isCompleted': false,
              'tasksProgress.$.completedAt': null
            }
          }
        );
      }

      console.log('每日任务重置完成');
    } catch (error) {
      console.error('重置每日任务失败:', error);
      throw error;
    }
  }

  // 每周任务重置
  static async resetWeeklyTasks() {
    try {
      const weeklyTasks = await MembershipTask.find({
        weeklyReset: true,
        isActive: true
      });

      for (const task of weeklyTasks) {
        await UserMembership.updateMany(
          { 'tasksProgress.taskId': task._id },
          {
            $set: {
              'tasksProgress.$.progress': 0,
              'tasksProgress.$.isCompleted': false,
              'tasksProgress.$.completedAt': null
            }
          }
        );
      }

      console.log('每周任务重置完成');
    } catch (error) {
      console.error('重置每周任务失败:', error);
      throw error;
    }
  }

  // 每月任务重置
  static async resetMonthlyTasks() {
    try {
      const monthlyTasks = await MembershipTask.find({
        monthlyReset: true,
        isActive: true
      });

      for (const task of monthlyTasks) {
        await UserMembership.updateMany(
          { 'tasksProgress.taskId': task._id },
          {
            $set: {
              'tasksProgress.$.progress': 0,
              'tasksProgress.$.isCompleted': false,
              'tasksProgress.$.completedAt': null
            }
          }
        );
      }

      console.log('每月任务重置完成');
    } catch (error) {
      console.error('重置每月任务失败:', error);
      throw error;
    }
  }
}

module.exports = MembershipService;