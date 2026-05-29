'use strict';

const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { body, validationResult } = require('express-validator');
const User = require('../models/User');
const { authMiddleware } = require('../middlewares/auth');
const { success, badRequest, unauthorized, forbidden, conflict, serverError } = require('../utils/response');
const logger = require('../utils/logger');
const { sendVerificationEmail, sendResetPasswordEmail, sendChangePasswordEmail } = require('../utils/email');

const router = express.Router();

// ======================== 纯内存存储 ========================
// 验证码存储：{ key: { code, expires, ...meta } }
// key 格式：注册=email, 忘记密码=email, 修改密码=userId
const codeStore = new Map();

// 清理过期货验证码（每5分钟清理一次）
setInterval(() => {
  const now = Date.now();
  for (const [key, data] of codeStore.entries()) {
    if (data.expires < now) codeStore.delete(key);
  }
}, 5 * 60 * 1000);

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

// 返回用户公开信息
const publicUser = (user) => ({
  id: user.id,
  username: user.username,
  email: user.email,
  role: user.role,
  is_subscribed: user.is_subscribed,
  subscription_expires_at: user.subscription_expires_at,
  member_expires_at: user.member_expires_at,
  is_active_member: user.role === 'admin' || user.is_subscribed ||
    (user.member_expires_at && new Date(user.member_expires_at) > new Date())
});

// ======================== 注册相关 ========================

// POST /api/auth/register/send-code - 发送注册验证码
router.post('/register/send-code', registerRules, async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return badRequest(res, errors.array()[0].msg);
    }

    const { username, email, password } = req.body;

    const existingUsername = await User.findOne({ where: { username } });
    if (existingUsername) {
      return conflict(res, '用户名已被注册');
    }

    const existingEmail = await User.findOne({ where: { email: email.toLowerCase() } });
    if (existingEmail) {
      return conflict(res, '该邮箱已被注册');
    }

    const result = await sendVerificationEmail(email.toLowerCase(), username);
    if (!result.success) {
      return serverError(res, `邮件发送失败：${result.error}`);
    }

    // 纯内存存储验证码
    codeStore.set(email.toLowerCase(), {
      code: result.code,
      expires: Date.now() + 10 * 60 * 1000,
      type: 'register',
      username,
      password
    });

    logger.info('Auth', `注册验证码已发送: ${email}`);
    return success(res, { expiresIn: 600 }, '验证码已发送到邮箱');
  } catch (err) {
    logger.error('Auth', '发送注册验证码失败', { error: err.message });
    return serverError(res, '服务器错误，请稍后重试');
  }
});

// POST /api/auth/register/verify - 验证注册验证码并完成注册
router.post('/register/verify', [
  body('username').trim().isLength({ min: 2, max: 50 }).withMessage('用户名长度需在 2-50 个字符之间'),
  body('email').trim().isEmail().normalizeEmail().withMessage('请输入有效的邮箱地址'),
  body('password').isLength({ min: 8 }).withMessage('密码长度至少为 8 个字符'),
  body('code').trim().isLength({ min: 6, max: 6 }).withMessage('请输入6位验证码')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return badRequest(res, errors.array()[0].msg);
    }

    const { username, email, password, code } = req.body;
    const emailLower = email.toLowerCase();

    const existingUsername = await User.findOne({ where: { username } });
    if (existingUsername) {
      return conflict(res, '用户名已被注册');
    }

    const existingEmail = await User.findOne({ where: { email: emailLower } });
    if (existingEmail) {
      return conflict(res, '该邮箱已被注册');
    }

    const pending = codeStore.get(emailLower);
    if (!pending || pending.type !== 'register') {
      return badRequest(res, '验证码无效或已过期，请重新获取');
    }
    if (pending.code !== code) {
      return badRequest(res, '验证码错误');
    }
    if (pending.expires < Date.now()) {
      codeStore.delete(emailLower);
      return badRequest(res, '验证码已过期，请重新获取');
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const user = await User.create({
      username,
      email: emailLower,
      password: hashedPassword,
      role: 'user',
      status: 'active'
    });

    codeStore.delete(emailLower);

    logger.info('Auth', `新用户完成注册验证: ${username}`);

    const token = generateToken(user);
    return success(res, { token, user: publicUser(user) }, '注册成功');
  } catch (err) {
    logger.error('Auth', '注册验证失败', { error: err.message });
    return serverError(res, '服务器错误，请稍后重试');
  }
});

// POST /api/auth/register - 用户注册（旧接口，兼容直接注册）
router.post('/register', registerRules, async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return badRequest(res, errors.array()[0].msg);
    }

    const { username, email, password } = req.body;

    const existingUsername = await User.findOne({ where: { username } });
    if (existingUsername) {
      return conflict(res, '用户名已被注册');
    }

    const existingEmail = await User.findOne({ where: { email: email.toLowerCase() } });
    if (existingEmail) {
      return conflict(res, '该邮箱已被注册');
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const user = await User.create({
      username,
      email: email.toLowerCase(),
      password: hashedPassword,
      role: 'user',
      status: 'active'
    });

    logger.info('Auth', `新用户注册: ${username}`);
    const token = generateToken(user);
    return success(res, { token, user: publicUser(user) }, '注册成功');
  } catch (err) {
    logger.error('Auth', '注册失败', { error: err.message });
    return serverError(res, '服务器错误，请稍后重试');
  }
});

// ======================== 登录相关 ========================

// POST /api/auth/login - 用户登录
router.post('/login', loginRules, async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return badRequest(res, errors.array()[0].msg);
    }

    const { username, password } = req.body;

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

    if (user.status === 'banned') {
      return forbidden(res, '账号已被封禁，请联系管理员');
    }

    const isValidPassword = await bcrypt.compare(password, user.password);
    if (!isValidPassword) {
      return unauthorized(res, '用户名或密码错误');
    }

    logger.info('Auth', `用户登录: ${user.username}`);
    const token = generateToken(user);
    return success(res, { token, user: publicUser(user) }, '登录成功');
  } catch (err) {
    logger.error('Auth', '登录失败', { error: err.message });
    return serverError(res, '服务器错误，请稍后重试');
  }
});

// ======================== 用户信息 ========================

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

    return success(res, publicUser(user));
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

// PUT /api/auth/nickname - 修改昵称
router.put('/nickname', authMiddleware, async (req, res) => {
  try {
    const { nickname } = req.body;

    if (!nickname || typeof nickname !== 'string') {
      return badRequest(res, '请输入昵称');
    }

    const trimmed = nickname.trim();
    if (trimmed.length < 2 || trimmed.length > 50) {
      return badRequest(res, '昵称长度需在 2-50 个字符之间');
    }

    const user = await User.findByPk(req.user.id);
    if (!user) {
      return unauthorized(res, '用户不存在');
    }
    if (user.status === 'banned') {
      return unauthorized(res, '账号已被封禁');
    }

    const existing = await User.findOne({
      where: {
        username: trimmed,
        id: { [require('sequelize').Op.ne]: req.user.id }
      }
    });
    if (existing) {
      return conflict(res, '该昵称已被使用');
    }

    user.username = trimmed;
    await user.save();

    logger.info('Auth', `用户 ${user.id} 修改昵称为: ${trimmed}`);
    return success(res, publicUser(user), '昵称修改成功');
  } catch (err) {
    logger.error('Auth', '修改昵称失败', { error: err.message });
    return serverError(res, '服务器错误，请稍后重试');
  }
});

// ======================== 忘记密码 ========================

// POST /api/auth/forgot-password/send-code - 发送重置密码验证码
router.post('/forgot-password/send-code', [
  body('email').trim().isEmail().normalizeEmail().withMessage('请输入有效的邮箱地址')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return badRequest(res, errors.array()[0].msg);
    }

    const { email } = req.body;
    const user = await User.findOne({ where: { email: email.toLowerCase() } });

    // 邮箱不存在也返回成功，防止枚举用户
    if (!user) {
      logger.info('Auth', `忘记密码请求，但邮箱不存在: ${email}`);
      return success(res, { sent: true }, '如果该邮箱已注册，验证码已发送');
    }

    if (user.status === 'banned') {
      return forbidden(res, '账号已被封禁，请联系管理员');
    }

    const result = await sendResetPasswordEmail(user.email, user.username);
    if (!result.success) {
      return serverError(res, `邮件发送失败：${result.error}`);
    }

    codeStore.set(`forgot:${email.toLowerCase()}`, {
      code: result.code,
      expires: Date.now() + 10 * 60 * 1000,
      type: 'forgot',
      userId: user.id
    });

    logger.info('Auth', `忘记密码验证码已发送: ${email}`);
    return success(res, { sent: true, expiresIn: 600 }, '验证码已发送到邮箱');
  } catch (err) {
    logger.error('Auth', '发送重置密码验证码失败', { error: err.message });
    return serverError(res, '服务器错误，请稍后重试');
  }
});

// POST /api/auth/forgot-password/reset - 验证验证码并重置密码
router.post('/forgot-password/reset', [
  body('email').trim().isEmail().normalizeEmail().withMessage('请输入有效的邮箱地址'),
  body('code').trim().isLength({ min: 6, max: 6 }).withMessage('请输入6位验证码'),
  body('password').isLength({ min: 8 }).withMessage('密码长度至少为 8 个字符')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return badRequest(res, errors.array()[0].msg);
    }

    const { email, code, password } = req.body;
    const emailLower = email.toLowerCase();

    const user = await User.findOne({ where: { email: emailLower } });
    if (!user) {
      return badRequest(res, '验证码无效或已过期');
    }

    if (user.status === 'banned') {
      return forbidden(res, '账号已被封禁，请联系管理员');
    }

    const key = `forgot:${emailLower}`;
    const pending = codeStore.get(key);
    if (!pending || pending.type !== 'forgot' || pending.userId !== user.id) {
      return badRequest(res, '验证码无效或已过期');
    }
    if (pending.code !== code) {
      return badRequest(res, '验证码错误');
    }
    if (pending.expires < Date.now()) {
      codeStore.delete(key);
      return badRequest(res, '验证码已过期，请重新获取');
    }

    const isSame = await bcrypt.compare(password, user.password);
    if (isSame) {
      return badRequest(res, '新密码不能与当前密码相同');
    }

    user.password = await bcrypt.hash(password, 10);
    await user.save();

    codeStore.delete(key);
    logger.info('Auth', `用户 ${user.username} 通过忘记密码重置了密码`);

    return success(res, { reset: true }, '密码重置成功，请使用新密码登录');
  } catch (err) {
    logger.error('Auth', '重置密码失败', { error: err.message });
    return serverError(res, '服务器错误，请稍后重试');
  }
});

// ======================== 修改密码（已登录）====================

// POST /api/auth/change-password/send-code - 发送修改密码验证码
router.post('/change-password/send-code', authMiddleware, async (req, res) => {
  try {
    const user = await User.findByPk(req.user.id);
    if (!user) {
      return unauthorized(res, '用户不存在');
    }
    if (user.status === 'banned') {
      return unauthorized(res, '账号已被封禁');
    }

    const result = await sendChangePasswordEmail(user.email, user.username);
    if (!result.success) {
      return serverError(res, `邮件发送失败：${result.error}`);
    }

    codeStore.set(`change:${req.user.id}`, {
      code: result.code,
      expires: Date.now() + 10 * 60 * 1000,
      type: 'change'
    });

    logger.info('Auth', `用户 ${user.username} 修改密码验证码已发送`);
    return success(res, { sent: true, expiresIn: 600 }, '验证码已发送到邮箱');
  } catch (err) {
    logger.error('Auth', '发送修改密码验证码失败', { error: err.message });
    return serverError(res, '服务器错误，请稍后重试');
  }
});

// POST /api/auth/change-password/reset - 验证验证码后修改密码
router.post('/change-password/reset', authMiddleware, [
  body('code').trim().isLength({ min: 6, max: 6 }).withMessage('请输入6位验证码'),
  body('newPassword').isLength({ min: 8 }).withMessage('新密码长度至少为 8 个字符')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return badRequest(res, errors.array()[0].msg);
    }

    const { code, newPassword } = req.body;
    const user = await User.findByPk(req.user.id);
    if (!user) {
      return unauthorized(res, '用户不存在');
    }
    if (user.status === 'banned') {
      return unauthorized(res, '账号已被封禁');
    }

    const key = `change:${req.user.id}`;
    const pending = codeStore.get(key);
    if (!pending || pending.type !== 'change') {
      return badRequest(res, '验证码无效或已过期');
    }
    if (pending.code !== code) {
      return badRequest(res, '验证码错误');
    }
    if (pending.expires < Date.now()) {
      codeStore.delete(key);
      return badRequest(res, '验证码已过期，请重新获取');
    }

    const isSame = await bcrypt.compare(newPassword, user.password);
    if (isSame) {
      return badRequest(res, '新密码不能与当前密码相同');
    }

    user.password = await bcrypt.hash(newPassword, 10);
    await user.save();

    codeStore.delete(key);
    logger.info('Auth', `用户 ${user.username} 修改了密码`);

    return success(res, { changed: true }, '密码修改成功');
  } catch (err) {
    logger.error('Auth', '修改密码失败', { error: err.message });
    return serverError(res, '服务器错误，请稍后重试');
  }
});

module.exports = router;
