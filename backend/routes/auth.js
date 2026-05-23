'use strict';

const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { body, validationResult } = require('express-validator');
const User = require('../models/User');
const { authMiddleware } = require('../middlewares/auth');
const { success, badRequest, unauthorized, forbidden, conflict, serverError } = require('../utils/response');
const logger = require('../utils/logger');

const router = express.Router();

// 注册验证规则
const registerRules = [
  body('username')
    .trim()
    .isLength({ min: 2, max: 50 })
    .withMessage('用户名长度需在 2-50 个字符之间'),
  body('email')
    .trim()
    .isEmail()
    .normalizeEmail()
    .withMessage('请输入有效的邮箱地址'),
  body('password')
    .isLength({ min: 8 })
    .withMessage('密码长度至少为 8 个字符')
];

// 登录验证规则
const loginRules = [
  body('username').trim().notEmpty().withMessage('请输入用户名'),
  body('password').notEmpty().withMessage('请输入密码')
];

// 生成 JWT token
const generateToken = (user) => {
  return jwt.sign(
    {
      id: user.id,
      username: user.username,
      email: user.email,
      role: user.role
    },
    process.env.JWT_SECRET,
    { expiresIn: '7d' }
  );
};

// POST /api/auth/register - 用户注册
router.post('/register', registerRules, async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return badRequest(res, errors.array()[0].msg);
    }

    const { username, email, password } = req.body;

    // 检查用户名是否已存在
    const existingUsername = await User.findOne({ where: { username } });
    if (existingUsername) {
      return conflict(res, '用户名已被注册');
    }

    // 检查邮箱是否已存在
    const existingEmail = await User.findOne({ where: { email } });
    if (existingEmail) {
      return conflict(res, '该邮箱已被注册');
    }

    // 加密密码
    const hashedPassword = await bcrypt.hash(password, 10);

    // 创建用户
    const user = await User.create({
      username,
      email,
      password: hashedPassword,
      role: 'user',
      status: 'active'
    });

    logger.info('Auth', `新用户注册: ${username}`);

    // 生成 token
    const token = generateToken(user);

    return success(res, {
      token,
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        role: user.role,
        is_subscribed: user.is_subscribed,
        subscription_expires_at: user.subscription_expires_at,
        member_expires_at: user.member_expires_at,
        is_active_member: user.role === 'admin' || user.is_subscribed ||
          (user.member_expires_at && new Date(user.member_expires_at) > new Date())
      }
    }, '注册成功');
  } catch (err) {
    logger.error('Auth', '注册失败', { error: err.message });
    return serverError(res, '服务器错误，请稍后重试');
  }
});

// POST /api/auth/login - 用户登录
router.post('/login', loginRules, async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return badRequest(res, errors.array()[0].msg);
    }

    const { username, password } = req.body;

    // 查找用户（支持用户名或邮箱登录）
    const user = await User.findOne({
      where: {
        [require('sequelize').Op.or]: [
          { username: username },
          { email: username }
        ]
      }
    });

    if (!user) {
      return unauthorized(res, '用户名或密码错误');
    }

    // 检查账号状态
    if (user.status === 'banned') {
      return forbidden(res, '账号已被封禁，请联系管理员');
    }

    // 验证密码
    const isValidPassword = await bcrypt.compare(password, user.password);
    if (!isValidPassword) {
      return unauthorized(res, '用户名或密码错误');
    }

    logger.info('Auth', `用户登录: ${user.username}`);

    // 生成 token
    const token = generateToken(user);

    return success(res, {
      token,
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        role: user.role,
        is_subscribed: user.is_subscribed,
        subscription_expires_at: user.subscription_expires_at,
        member_expires_at: user.member_expires_at,
        is_active_member: user.role === 'admin' || user.is_subscribed ||
          (user.member_expires_at && new Date(user.member_expires_at) > new Date())
      }
    }, '登录成功');
  } catch (err) {
    logger.error('Auth', '登录失败', { error: err.message });
    return serverError(res, '服务器错误，请稍后重试');
  }
});

// GET /api/auth/me - 获取当前用户信息
router.get('/me', authMiddleware, async (req, res) => {
  try {
    const user = await User.findByPk(req.user.id, {
      attributes: { exclude: ['password'] }
    });

    if (!user) {
      return unauthorized(res, '用户不存在');
    }

    if (user.status === 'banned') {
      return unauthorized(res, '账号已被封禁');
    }

    return success(res, {
      id: user.id,
      username: user.username,
      email: user.email,
      role: user.role,
      is_subscribed: user.is_subscribed,
      subscription_expires_at: user.subscription_expires_at,
      member_expires_at: user.member_expires_at,
      is_active_member: user.role === 'admin' || user.is_subscribed ||
        (user.member_expires_at && new Date(user.member_expires_at) > new Date()),
      created_at: user.created_at
    });
  } catch (err) {
    logger.error('Auth', '获取用户信息失败', { error: err.message });
    return serverError(res, '服务器错误');
  }
});

// GET /api/auth/check-email - 检查邮箱是否已注册
router.get('/check-email', async (req, res) => {
  try {
    const { email } = req.query;
    if (!email) {
      return badRequest(res, '请提供邮箱地址');
    }

    const user = await User.findOne({
      where: { email: email.trim().toLowerCase() }
    });

    return success(res, { exists: !!user });
  } catch (err) {
    logger.error('Auth', '检查邮箱失败', { error: err.message });
    return serverError(res, '服务器错误');
  }
});

module.exports = router;
