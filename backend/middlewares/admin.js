'use strict';

const { forbidden } = require('../utils/response');

const adminMiddleware = (req, res, next) => {
  if (!req.user) {
    return forbidden(res, '用户信息缺失');
  }

  if (req.user.role !== 'admin') {
    return forbidden(res, '只有管理员可以执行此操作');
  }

  next();
};

module.exports = { adminMiddleware };
