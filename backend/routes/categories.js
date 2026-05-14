'use strict';

const express = require('express');
const { body, validationResult } = require('express-validator');
const { CATEGORY_TREE, isValidCategory } = require('../data/categories');
const { success, badRequest, notFound, serverError } = require('../utils/response');
const logger = require('../utils/logger');

const router = express.Router();

// GET /api/categories - 获取分类树（来自 JSON 配置）
router.get('/', async (req, res) => {
  try {
    return success(res, CATEGORY_TREE);
  } catch (err) {
    logger.error('Categories', '获取分类列表失败', { error: err.message });
    return serverError(res, '服务器错误');
  }
});

// POST /api/categories - 预留扩展（暂不实现，实际数据源为 JSON）
router.post('/', async (req, res) => {
  return badRequest(res, '分类管理暂不支持，请通过修改 backend/data/categories.json 来更新分类');
});

module.exports = router;
