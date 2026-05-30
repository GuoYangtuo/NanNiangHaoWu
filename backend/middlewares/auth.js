'use strict';

const jwt = require('jsonwebtoken');
const { unauthorized } = require('../utils/response');
const logger = require('../utils/logger');
const User = require('../models/User');

const authMiddleware = async (req, res, next) => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return unauthorized(res, '未提供认证令牌，请先登录');
  }

  const token = authHeader.split(' ')[1];

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = {
      id: decoded.id,
      username: decoded.username,
      email: decoded.email,
      role: decoded.role
    };

    // 检查 token 是否在密码修改之前签发，若是则需重新登录
    if (decoded.iat && decoded.id) {
      const user = await User.findByPk(decoded.id, { attributes: ['password_changed_at'] });
      if (user && user.password_changed_at) {
        const changedAtMs = new Date(user.password_changed_at).getTime();
        // JWT iat 是秒，password_changed_at 是毫秒
        if (decoded.iat * 1000 < changedAtMs) {
          logger.warn('Auth', `Token 在密码修改前签发，已失效: userId=${decoded.id}`);
          return unauthorized(res, '密码已变更，请重新登录');
        }
      }
    }

    next();
  } catch (err) {
    logger.warn('Auth', 'JWT 验证失败', { error: err.message });
    if (err.name === 'TokenExpiredError') {
      return unauthorized(res, '登录已过期，请重新登录');
    }
    return unauthorized(res, '无效的认证令牌');
  }
};

const optionalAuth = (req, res, next) => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return next();
  }

  const token = authHeader.split(' ')[1];

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = {
      id: decoded.id,
      username: decoded.username,
      email: decoded.email,
      role: decoded.role
    };
  } catch (err) {
    // 忽略无效 token，继续处理
  }

  next();
};

module.exports = { authMiddleware, optionalAuth };
