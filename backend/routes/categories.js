'user strict';

const express = require('express');
const { body, validationResult } = require('express-validator');
const { CATEGORY_TREE, isValidCategory, reload: reloadCategories } = require('../data/categories');
const { success, badRequest, notFound, serverError, unauthorized } = require('../utils/response');
const logger = require('../utils/logger');
const { authMiddleware } = require('../middlewares/auth');
const fs = require('fs');
const path = require('path');

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

// Apply new content to categories.json (used for both admin immediate-apply and admin review approval)
const applyContentToJson = (categoryId, newContent) => {
  const categoriesPath = path.join(__dirname, '..', 'data', 'categories.json');
  const rawData = fs.readFileSync(categoriesPath, 'utf-8');
  let categories = JSON.parse(rawData);

  const updateContent = (nodes) => {
    for (const node of nodes) {
      if (node.id === categoryId) {
        node.content = newContent;
        return true;
      }
      if (node.children) {
        const found = updateContent(node.children);
        if (found) return true;
      }
    }
    return false;
  };

  if (!updateContent(categories)) return false;

  fs.writeFileSync(categoriesPath, JSON.stringify(categories, null, 2), 'utf-8');
  reloadCategories();
  return true;
};

// POST /api/categories/content-edits - 提交文案改进申请
router.post('/content-edits', authMiddleware, [
  body('category_id').trim().notEmpty().withMessage('缺少 category_id'),
  body('new_content').trim().notEmpty().withMessage('新内容不能为空')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return badRequest(res, errors.array()[0].msg);
    }

    const { category_id, new_content } = req.body;

    // 验证分类是否存在且是 folder（有 markdown 内容）
    const findFolder = (nodes) => {
      for (const node of nodes) {
        if (node.id === category_id && node.type === 'folder') {
          return node;
        }
        if (node.children) {
          const found = findFolder(node.children);
          if (found) return found;
        }
      }
      return null;
    };

    const folder = findFolder(CATEGORY_TREE);
    if (!folder) {
      return notFound(res, '未找到该分类，或该分类不支持文案编辑');
    }

    const ContentEdit = require('../models/ContentEdit');

    // 管理员提交：直接写入 categories.json，无需审核
    if (req.user.role === 'admin') {
      const applied = applyContentToJson(category_id, new_content);
      if (!applied) {
        return notFound(res, '未找到对应分类，无法应用更改');
      }

      await ContentEdit.create({
        category_id,
        user_id: req.user.id,
        new_content,
        status: 'approved'
      });

      logger.info('ContentEdit', `管理员 ${req.user.username} 直接修改了文案，分类: ${folder.name}`);
      return success(res, { id: null, autoApproved: true }, '管理员已直接更新文案');
    }

    // 普通用户提交：存入待审核
    const edit = await ContentEdit.create({
      category_id,
      user_id: req.user.id,
      new_content,
      status: 'pending'
    });

    logger.info('ContentEdit', `用户 ${req.user.username} 提交了文案改进申请，分类: ${folder.name}`);

    return success(res, { id: edit.id, autoApproved: false }, '文案改进申请已提交，等待管理员审核');
  } catch (err) {
    logger.error('ContentEdit', '提交文案改进失败', { error: err.message });
    return serverError(res, '服务器错误');
  }
});

module.exports = router;
