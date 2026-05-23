'use strict';

const express = require('express');
const { authMiddleware } = require('../middlewares/auth');
const User = require('../models/User');
const { success, badRequest, serverError } = require('../utils/response');
const logger = require('../utils/logger');

const router = express.Router();

const SUBSCRIPTION_PRICE = 9.9; // 元/月
const MEMBER_DURATION_DAYS = 30;

const isMember = (user) => {
  if (user.role === 'admin') return true;
  if (user.is_subscribed) return true;
  if (user.member_expires_at && new Date(user.member_expires_at) > new Date()) return true;
  return false;
};

// GET /api/subscription/status - 获取当前用户的会员/订阅状态
router.get('/status', authMiddleware, async (req, res) => {
  try {
    const user = await User.findByPk(req.user.id, {
      attributes: ['id', 'is_subscribed', 'subscription_expires_at', 'member_expires_at', 'role']
    });

    if (!user) {
      return badRequest(res, '用户不存在');
    }

    const now = new Date();
    const isActiveMember = isMember(user);
    let expiresAt = null;

    if (user.is_subscribed && user.subscription_expires_at) {
      expiresAt = user.subscription_expires_at;
    } else if (user.member_expires_at) {
      expiresAt = user.member_expires_at;
    }

    return success(res, {
      is_active_member: isActiveMember,
      is_subscribed: !!user.is_subscribed,
      subscription_expires_at: user.subscription_expires_at,
      member_expires_at: user.member_expires_at,
      expires_at: expiresAt,
      price: SUBSCRIPTION_PRICE,
      member_duration_days: MEMBER_DURATION_DAYS
    });
  } catch (err) {
    logger.error('Subscription', '获取订阅状态失败', { error: err.message });
    return serverError(res, '服务器错误');
  }
});

// POST /api/subscription/subscribe - 订阅会员（点击即成功，暂不接入支付）
router.post('/subscribe', authMiddleware, async (req, res) => {
  try {
    const user = await User.findByPk(req.user.id);

    if (!user) {
      return badRequest(res, '用户不存在');
    }

    // 计算会员有效期
    const now = new Date();
    let newExpiresAt;

    if (user.is_subscribed && user.subscription_expires_at && new Date(user.subscription_expires_at) > now) {
      // 已在订阅期内，累加一个月
      newExpiresAt = new Date(user.subscription_expires_at);
      newExpiresAt.setMonth(newExpiresAt.getMonth() + 1);
    } else {
      // 从现在开始一个月
      newExpiresAt = new Date(now);
      newExpiresAt.setDate(newExpiresAt.getDate() + MEMBER_DURATION_DAYS);
    }

    await user.update({
      is_subscribed: true,
      subscription_expires_at: newExpiresAt
    });

    logger.info('Subscription', `用户 ${user.username} 订阅会员成功，到期时间: ${newExpiresAt.toISOString()}`);

    return success(res, {
      is_subscribed: true,
      subscription_expires_at: user.subscription_expires_at,
      expires_at: newExpiresAt,
      message: `订阅成功！会员有效期至 ${newExpiresAt.toLocaleDateString('zh-CN')}`
    }, '订阅成功');
  } catch (err) {
    logger.error('Subscription', '订阅失败', { error: err.message });
    return serverError(res, '服务器错误');
  }
});

// POST /api/subscription/cancel - 取消订阅（不退款，仅标记）
router.post('/cancel', authMiddleware, async (req, res) => {
  try {
    const user = await User.findByPk(req.user.id);

    if (!user) {
      return badRequest(res, '用户不存在');
    }

    await user.update({ is_subscribed: false });

    logger.info('Subscription', `用户 ${user.username} 取消了订阅`);

    return success(res, { is_subscribed: false }, '已取消订阅');
  } catch (err) {
    logger.error('Subscription', '取消订阅失败', { error: err.message });
    return serverError(res, '服务器错误');
  }
});

module.exports = router;
