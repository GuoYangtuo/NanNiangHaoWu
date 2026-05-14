'use strict';

const express = require('express');
const { body, query, validationResult } = require('express-validator');
const Product = require('../models/Product');
const User = require('../models/User');
const { authMiddleware, optionalAuth } = require('../middlewares/auth');
const { isValidCategory, getCategoryById, CATEGORY_TREE } = require('../data/categories');
const upload = require('../middlewares/upload');
const { success, badRequest, notFound, serverError, forbidden } = require('../utils/response');
const logger = require('../utils/logger');

const router = express.Router();

// 上传商品验证规则
const createProductRules = [
  body('category_id')
    .trim()
    .notEmpty()
    .withMessage('请选择有效的分类')
    .custom((value) => {
      if (!isValidCategory(value)) {
        throw new Error('选择的分类不存在');
      }
      return true;
    }),
  body('name')
    .trim()
    .isLength({ min: 1, max: 200 })
    .withMessage('商品名称长度需在 1-200 个字符之间'),
  body('description')
    .optional()
    .isLength({ max: 5000 })
    .withMessage('简介长度不能超过 5000 个字符'),
  body('purchase_link')
    .optional()
    .isURL({ protocols: ['http', 'https'], require_protocol: true })
    .withMessage('请输入有效的购买链接（需包含 http:// 或 https://）')
];

// GET /api/products - 获取已审核通过的商品列表
router.get('/', optionalAuth, async (req, res) => {
  try {
    const { category_id, page = 1, limit = 20 } = req.query;
    const offset = (parseInt(page) - 1) * parseInt(limit);

    const whereClause = { status: 'approved' };
    if (category_id && isValidCategory(category_id)) {
      whereClause.category_id = category_id;
    }

    const { count, rows: products } = await Product.findAndCountAll({
      where: whereClause,
      include: [
        {
          model: User,
          as: 'user',
          attributes: ['id', 'username']
        }
      ],
      order: [['created_at', 'DESC']],
      limit: parseInt(limit),
      offset
    });

    const processedProducts = products.map((p) => {
      const cat = getCategoryById(p.category_id);
      return {
        id: p.id,
        name: p.name,
        description: p.description,
        purchase_link: p.purchase_link,
        images: (p.images || []).map((img) => `/uploads/${img}`),
        category: cat ? { id: cat.id, name: cat.name, parentName: cat.parentName } : null,
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
    logger.error('Products', '获取商品列表失败', { error: err.message });
    return serverError(res, '服务器错误');
  }
});

// GET /api/products/:id - 获取商品详情
router.get('/:id', optionalAuth, async (req, res) => {
  try {
    const product = await Product.findOne({
      where: {
        id: req.params.id,
        status: 'approved'
      },
      include: [
        {
          model: User,
          as: 'user',
          attributes: ['id', 'username']
        }
      ]
    });

    if (!product) {
      return notFound(res, '商品不存在或尚未审核通过');
    }

    const cat = getCategoryById(product.category_id);

    return success(res, {
      id: product.id,
      name: product.name,
      description: product.description,
      purchase_link: product.purchase_link,
      images: (product.images || []).map((img) => `/uploads/${img}`),
      category: cat ? { id: cat.id, name: cat.name, parentName: cat.parentName } : null,
      user: product.user,
      created_at: product.created_at
    });
  } catch (err) {
    logger.error('Products', '获取商品详情失败', { error: err.message });
    return serverError(res, '服务器错误');
  }
});

// POST /api/products - 上传推荐好物
router.post('/', authMiddleware, upload.array('images', 9), createProductRules, async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      if (req.files && req.files.length > 0) {
        req.files.forEach((file) => {
          const fs = require('fs');
          const filepath = require('path').join(__dirname, '..', 'uploads', file.filename);
          if (fs.existsSync(filepath)) {
            fs.unlinkSync(filepath);
          }
        });
      }
      return badRequest(res, errors.array()[0].msg);
    }

    const { category_id, name, description, purchase_link } = req.body;

    const images = (req.files || []).map((file) => file.filename);

    const product = await Product.create({
      category_id,
      user_id: req.user.id,
      name: name.trim(),
      description: description ? description.trim() : null,
      purchase_link: purchase_link ? purchase_link.trim() : null,
      images,
      status: 'pending'
    });

    logger.info('Products', `用户 ${req.user.username} 创建了新推荐好物: ${name}`);

    return success(res, {
      id: product.id,
      status: product.status
    }, '提交成功，好物正在等待审核');
  } catch (err) {
    logger.error('Products', '创建商品失败', { error: err.message });
    return serverError(res, '服务器错误');
  }
});

// PUT /api/products/:id - 更新自己的推荐好物
router.put('/:id', authMiddleware, upload.array('images', 9), createProductRules, async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      if (req.files && req.files.length > 0) {
        req.files.forEach((file) => {
          const fs = require('fs');
          const filepath = require('path').join(__dirname, '..', 'uploads', file.filename);
          if (fs.existsSync(filepath)) {
            fs.unlinkSync(filepath);
          }
        });
      }
      return badRequest(res, errors.array()[0].msg);
    }

    const product = await Product.findByPk(req.params.id);

    if (!product) {
      return notFound(res, '商品不存在');
    }

    if (product.user_id !== req.user.id) {
      return forbidden(res, '只能修改自己的推荐');
    }

    if (product.status !== 'pending') {
      return badRequest(res, '只能修改待审核状态的商品');
    }

    const { category_id, name, description, purchase_link } = req.body;

    const newImages = (req.files || []).map((file) => file.filename);

    await product.update({
      category_id,
      name: name.trim(),
      description: description ? description.trim() : null,
      purchase_link: purchase_link ? purchase_link.trim() : null,
      images: newImages.length > 0 ? newImages : product.images
    });

    return success(res, { id: product.id }, '更新成功');
  } catch (err) {
    logger.error('Products', '更新商品失败', { error: err.message });
    return serverError(res, '服务器错误');
  }
});

// DELETE /api/products/:id - 删除自己的推荐好物
router.delete('/:id', authMiddleware, async (req, res) => {
  try {
    const product = await Product.findByPk(req.params.id);

    if (!product) {
      return notFound(res, '商品不存在');
    }

    if (product.user_id !== req.user.id) {
      return forbidden(res, '只能删除自己的推荐');
    }

    if (product.images && product.images.length > 0) {
      const fs = require('fs');
      const path = require('path');
      product.images.forEach((img) => {
        const filepath = path.join(__dirname, '..', 'uploads', img);
        if (fs.existsSync(filepath)) {
          fs.unlinkSync(filepath);
        }
      });
    }

    await product.destroy();

    logger.info('Products', `用户 ${req.user.username} 删除了商品: ${product.name}`);

    return success(res, null, '删除成功');
  } catch (err) {
    logger.error('Products', '更新商品失败', { error: err.message });
    return serverError(res, '服务器错误');
  }
});

module.exports = router;
