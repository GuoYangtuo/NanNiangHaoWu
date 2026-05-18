'use strict';

const express = require('express');
const { body, query, validationResult } = require('express-validator');
const Product = require('../models/Product');
const User = require('../models/User');
const ContentEdit = require('../models/ContentEdit');
const { authMiddleware } = require('../middlewares/auth');
const { adminMiddleware } = require('../middlewares/admin');
const { getCategoryById, reload: reloadCategories } = require('../data/categories');
const { success, badRequest, notFound, serverError } = require('../utils/response');
const logger = require('../utils/logger');
const fs = require('fs');
const path = require('path');

const router = express.Router();

// 所有管理路由都需要管理员权限
router.use(authMiddleware, adminMiddleware);

// GET /api/admin/products - 获取所有商品（含待审核）
router.get('/products', async (req, res) => {
  try {
    const { status, page = 1, limit = 20 } = req.query;
    const offset = (parseInt(page) - 1) * parseInt(limit);

    const whereClause = {};
    if (status && ['pending', 'approved', 'rejected'].includes(status)) {
      whereClause.status = status;
    }

    const { count, rows: products } = await Product.findAndCountAll({
      where: whereClause,
      include: [
        {
          model: User,
          as: 'user',
          attributes: ['id', 'username', 'email']
        }
      ],
      order: [['created_at', 'DESC']],
      limit: parseInt(limit),
      offset
    });

    const processedProducts = products.map(p => {
      const cat = getCategoryById(p.category_id);
      return {
        id: p.id,
        name: p.name,
        description: p.description,
        purchase_link: p.purchase_link,
        images: (p.images || []).map(img => `/uploads/${img}`),
        status: p.status,
        category: cat ? { id: cat.id, name: cat.name } : null,
        user: p.user,
        created_at: p.created_at
      };
    });

    return success(res, {
      products: processedProducts,
      pagination: {
        total: count,
        page: parseInt(page),
        limit: parseInt(limit),
        totalPages: Math.ceil(count / parseInt(limit))
      }
    });
  } catch (err) {
    logger.error('Admin', '获取商品列表失败', { error: err.message });
    return serverError(res, '服务器错误');
  }
});

// PUT /api/admin/products/:id/verify - 审核商品
router.put('/products/:id/verify', [
  body('status').isIn(['approved', 'rejected']).withMessage('状态必须是 approved 或 rejected')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return badRequest(res, errors.array()[0].msg);
    }

    const { status } = req.body;
    const product = await Product.findByPk(req.params.id);

    if (!product) {
      return notFound(res, '商品不存在');
    }

    if (product.status !== 'pending') {
      return badRequest(res, '只能审核待处理状态的商品');
    }

    await product.update({ status });

    logger.info('Admin', `管理员审核商品: ${product.name} -> ${status}`);

    return success(res, { id: product.id, status }, `商品已${status === 'approved' ? '通过' : '拒绝'}`);
  } catch (err) {
    logger.error('Admin', '审核商品失败', { error: err.message });
    return serverError(res, '服务器错误');
  }
});

// DELETE /api/admin/products/:id - 删除商品
router.delete('/products/:id', async (req, res) => {
  try {
    const product = await Product.findByPk(req.params.id);

    if (!product) {
      return notFound(res, '商品不存在');
    }

    // 删除图片文件
    if (product.images && product.images.length > 0) {
      const fs = require('fs');
      const path = require('path');
      product.images.forEach(img => {
        const filepath = path.join(__dirname, '..', 'uploads', img);
        if (fs.existsSync(filepath)) {
          fs.unlinkSync(filepath);
        }
      });
    }

    await product.destroy();

    logger.info('Admin', `管理员删除了商品: ${product.name}`);

    return success(res, null, '商品已删除');
  } catch (err) {
    logger.error('Admin', '删除商品失败', { error: err.message });
    return serverError(res, '服务器错误');
  }
});

// GET /api/admin/users - 获取用户列表
router.get('/users', async (req, res) => {
  try {
    const { status, page = 1, limit = 20 } = req.query;
    const offset = (parseInt(page) - 1) * parseInt(limit);

    const whereClause = {};
    if (status && ['active', 'banned'].includes(status)) {
      whereClause.status = status;
    }

    const { count, rows: users } = await User.findAndCountAll({
      where: whereClause,
      attributes: { exclude: ['password'] },
      order: [['created_at', 'DESC']],
      limit: parseInt(limit),
      offset
    });

    return success(res, {
      users,
      pagination: {
        total: count,
        page: parseInt(page),
        limit: parseInt(limit),
        totalPages: Math.ceil(count / parseInt(limit))
      }
    });
  } catch (err) {
    logger.error('Admin', '获取用户列表失败', { error: err.message });
    return serverError(res, '服务器错误');
  }
});

// GET /api/admin/content-edits - 获取文案改进申请列表
router.get('/content-edits', async (req, res) => {
  try {
    const { status, page = 1, limit = 20 } = req.query;
    const offset = (parseInt(page) - 1) * parseInt(limit);

    const whereClause = {};
    if (status && ['pending', 'approved', 'rejected'].includes(status)) {
      whereClause.status = status;
    }

    const { count, rows: edits } = await ContentEdit.findAndCountAll({
      where: whereClause,
      include: [
        {
          model: User,
          as: 'user',
          attributes: ['id', 'username', 'email']
        }
      ],
      order: [['created_at', 'DESC']],
      limit: parseInt(limit),
      offset
    });

    const processedEdits = edits.map(edit => {
      const folder = getCategoryById(edit.category_id);
      return {
        id: edit.id,
        category_id: edit.category_id,
        category_name: folder ? folder.name : edit.category_id,
        user: edit.user,
        new_content: edit.new_content,
        status: edit.status,
        created_at: edit.created_at
      };
    });

    return success(res, {
      contentEdits: processedEdits,
      pagination: {
        total: count,
        page: parseInt(page),
        limit: parseInt(limit),
        totalPages: Math.ceil(count / parseInt(limit))
      }
    });
  } catch (err) {
    logger.error('Admin', '获取文案改进列表失败', { error: err.message });
    return serverError(res, '服务器错误');
  }
});

// PUT /api/admin/content-edits/:id/verify - 审核文案改进申请
router.put('/content-edits/:id/verify', [
  body('status').isIn(['approved', 'rejected']).withMessage('状态必须是 approved 或 rejected')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return badRequest(res, errors.array()[0].msg);
    }

    const { status } = req.body;
    const edit = await ContentEdit.findByPk(req.params.id);

    if (!edit) {
      return notFound(res, '文案改进申请不存在');
    }

    if (edit.status !== 'pending') {
      return badRequest(res, '只能审核待处理状态的申请');
    }

    if (status === 'approved') {
      // 将新内容写入 categories.json
      const categoriesPath = path.join(__dirname, '..', 'data', 'categories.json');
      const rawData = fs.readFileSync(categoriesPath, 'utf-8');
      let categories = JSON.parse(rawData);

      const updateContent = (nodes) => {
        for (const node of nodes) {
          if (node.id === edit.category_id) {
            node.content = edit.new_content;
            return true;
          }
          if (node.children) {
            const found = updateContent(node.children);
            if (found) return true;
          }
        }
        return false;
      };

      if (!updateContent(categories)) {
        return notFound(res, '未找到对应分类，无法应用更改');
      }

      fs.writeFileSync(categoriesPath, JSON.stringify(categories, null, 2), 'utf-8');
      reloadCategories();
      logger.info('Admin', `文案改进已应用，分类ID: ${edit.category_id}`);
    }

    await edit.update({ status });

    logger.info('Admin', `管理员审核文案改进: ID=${edit.id} -> ${status}`);

    return success(res, { id: edit.id, status }, `文案改进已${status === 'approved' ? '通过' : '拒绝'}`);
  } catch (err) {
    logger.error('Admin', '审核文案改进失败', { error: err.message });
    return serverError(res, '服务器错误');
  }
});

// PUT /api/admin/users/:id/status - 更新用户状态
router.put('/users/:id/status', [
  body('status').isIn(['active', 'banned']).withMessage('状态必须是 active 或 banned')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return badRequest(res, errors.array()[0].msg);
    }

    const { status } = req.body;
    const user = await User.findByPk(req.params.id);

    if (!user) {
      return notFound(res, '用户不存在');
    }

    // 不能封禁自己
    if (user.id === req.user.id) {
      return badRequest(res, '不能修改自己的账号状态');
    }

    // 不能封禁管理员
    if (user.role === 'admin' && status === 'banned') {
      return badRequest(res, '不能封禁管理员账号');
    }

    await user.update({ status });

    logger.info('Admin', `管理员 ${req.user.username} 修改了用户 ${user.username} 的状态为 ${status}`);

    return success(res, {
      id: user.id,
      username: user.username,
      status: user.status
    }, `用户已${status === 'banned' ? '封禁' : '激活'}`);
  } catch (err) {
    logger.error('Admin', '更新用户状态失败', { error: err.message });
    return serverError(res, '服务器错误');
  }
});

module.exports = router;
