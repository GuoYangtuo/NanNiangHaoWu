'use strict';

const express = require('express');
const { body, validationResult } = require('express-validator');
const { CATEGORY_TREE, isValidCategory, isLocked, getLockedIds, getRandomSchedule, setLockedIds, setRandomSchedule, getLeafIds, reload: reloadCategories } = require('../data/categories');
const { success, badRequest, notFound, serverError } = require('../utils/response');
const logger = require('../utils/logger');
const { authMiddleware } = require('../middlewares/auth');
const fs = require('fs');
const path = require('path');

const router = express.Router();

// GET /api/categories - 获取分类树（来自 JSON 配置）
router.get('/', async (req, res) => {
  try {
    return success(res, {
      categories: CATEGORY_TREE,
      lockedIds: getLockedIds()
    });
  } catch (err) {
    logger.error('Categories', '获取分类列表失败', { error: err.message });
    return serverError(res, '服务器错误');
  }
});

// GET /api/categories/lock-status - 获取当前锁定状态（公开，无需认证）
router.get('/lock-status', async (req, res) => {
  try {
    return success(res, {
      lockedIds: getLockedIds(),
      randomSchedule: getRandomSchedule()
    });
  } catch (err) {
    logger.error('Categories', '获取锁定状态失败', { error: err.message });
    return serverError(res, '服务器错误');
  }
});

// POST /api/categories - 预留扩展（暂不实现，实际数据源为 JSON）
router.post('/', async (req, res) => {
  return badRequest(res, '分类管理暂不支持，请通过修改 backend/data/categories.json 来更新分类');
});

// --- Admin lock management routes (mounted here, guarded by adminMiddleware) ---

// GET /api/categories/admin/lock-config - 获取完整锁定配置
router.get('/admin/lock-config', authMiddleware, async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ success: false, message: '需要管理员权限' });
    }
    return success(res, {
      lockedIds: getLockedIds(),
      randomSchedule: getRandomSchedule(),
      leafIds: getLeafIds()
    });
  } catch (err) {
    logger.error('CategoryLock', '获取锁定配置失败', { error: err.message });
    return serverError(res, '服务器错误');
  }
});

// PUT /api/categories/admin/lock - 手动设置锁定分类
router.put('/admin/lock', authMiddleware, async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ success: false, message: '需要管理员权限' });
    }
    const { lockedIds } = req.body;
    if (!Array.isArray(lockedIds)) {
      return badRequest(res, 'lockedIds 必须是数组');
    }
    // Validate: all IDs must be real categories
    const findNode = (nodes, id) => {
      for (const node of nodes) {
        if (node.id === id) return node;
        if (node.children) {
          const found = findNode(node.children, id);
          if (found) return found;
        }
      }
      return null;
    };
    for (const id of lockedIds) {
      if (!findNode(CATEGORY_TREE, id)) {
        return badRequest(res, `分类 ID "${id}" 不存在`);
      }
    }
    setLockedIds(lockedIds);
    logger.info('CategoryLock', `管理员 ${req.user.username} 更新了手动锁定分类: [${lockedIds.join(', ')}]`);
    return success(res, { lockedIds: getLockedIds() }, '锁定分类已更新');
  } catch (err) {
    logger.error('CategoryLock', '更新锁定分类失败', { error: err.message });
    return serverError(res, '服务器错误');
  }
});

// POST /api/categories/admin/lock/randomize - 手动触发一次随机锁定
router.post('/admin/lock/randomize', authMiddleware, async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ success: false, message: '需要管理员权限' });
    }
    const { count } = req.body;
    const leafIds = getLeafIds();
    if (typeof count !== 'number' || count <= 0) {
      return badRequest(res, 'count 必须是正整数');
    }
    const n = Math.min(count, leafIds.length);
    const shuffled = [...leafIds].sort(() => Math.random() - 0.5);
    const selected = shuffled.slice(0, n);
    setLockedIds(selected);
    logger.info('CategoryLock', `管理员 ${req.user.username} 手动触发随机锁定，选择了 ${n} 个分类: [${selected.join(', ')}]`);
    return success(res, { lockedIds: getLockedIds() }, `已随机锁定 ${n} 个分类`);
  } catch (err) {
    logger.error('CategoryLock', '随机锁定失败', { error: err.message });
    return serverError(res, '服务器错误');
  }
});

// PUT /api/categories/admin/random-schedule - 更新定时随机锁定配置
router.put('/admin/random-schedule', authMiddleware, async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ success: false, message: '需要管理员权限' });
    }
    const { enabled, period_hours, lock_count } = req.body;
    const schedule = {};
    if (typeof enabled === 'boolean') schedule.enabled = enabled;
    if (typeof period_hours === 'number' && period_hours > 0) schedule.period_hours = period_hours;
    if (typeof lock_count === 'number' && lock_count > 0) schedule.lock_count = lock_count;
    setRandomSchedule(schedule);
    logger.info('CategoryLock', `管理员 ${req.user.username} 更新了随机锁定配置: ${JSON.stringify(schedule)}`);
    return success(res, { randomSchedule: getRandomSchedule() }, '定时随机锁定配置已更新');
  } catch (err) {
    logger.error('CategoryLock', '更新随机锁定配置失败', { error: err.message });
    return serverError(res, '服务器错误');
  }
});

// Apply new content to categories.json (used for both admin immediate-apply and admin review approval)
const applyContentToJson = (categoryId, newContent) => {
  const categoriesPath = path.join(__dirname, '..', 'data', 'categories.json');
  const rawData = fs.readFileSync(categoriesPath, 'utf-8');
  let data = JSON.parse(rawData);
  let categories = data._categories;

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
  data._categories = categories;

  fs.writeFileSync(categoriesPath, JSON.stringify(data, null, 2), 'utf-8');
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
