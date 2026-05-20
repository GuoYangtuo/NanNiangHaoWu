'use strict';

const express = require('express');
const { body, validationResult } = require('express-validator');
const Favorite = require('../models/Favorite');
const Product = require('../models/Product');
const User = require('../models/User');
const { authMiddleware } = require('../middlewares/auth');
const { getCategoryById } = require('../data/categories');
const { success, badRequest, notFound, conflict, serverError } = require('../utils/response');
const logger = require('../utils/logger');

const router = express.Router();

// GET /api/favorites - 获取当前用户的收藏列表
router.get('/', authMiddleware, async (req, res) => {
  try {
    const { page = 1, limit = 100 } = req.query;
    const offset = (parseInt(page) - 1) * parseInt(limit);

    const { count, rows } = await Favorite.findAndCountAll({
      where: { user_id: req.user.id },
      include: [{
        model: Product,
        as: 'product',
        required: true,
        include: [{
          model: User,
          as: 'user',
          attributes: ['id', 'username']
        }]
      }],
      order: [['created_at', 'DESC']],
      limit: parseInt(limit),
      offset,
      distinct: true
    });

    return success(res, {
      favorites: rows.map(f => {
        const p = f.product;
        const cat = getCategoryById(p.category_id);
        return {
          id: f.id,
          product_id: f.product_id,
          product: {
            id: p.id,
            name: p.name,
            description: p.description,
            purchase_link: p.purchase_link,
            images: (p.images || []).map(img => `/uploads/${img}`),
            category: cat ? { id: cat.id, name: cat.name } : null,
            user: p.user,
            created_at: p.created_at,
            is_favorited: true
          }
        };
      }),
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total: count,
        totalPages: Math.ceil(count / parseInt(limit))
      }
    });
  } catch (err) {
    logger.error('Favorites', '获取收藏列表失败', { error: err.message });
    return serverError(res, '服务器错误，请稍后重试');
  }
});

// GET /api/favorites/check - 检查指定商品的收藏状态
router.get('/check', authMiddleware, async (req, res) => {
  try {
    const { product_ids } = req.query;
    if (!product_ids) {
      return success(res, { favorite_ids: [] });
    }

    const ids = product_ids.split(',').map(id => parseInt(id)).filter(id => !isNaN(id));
    if (ids.length === 0) {
      return success(res, { favorite_ids: [] });
    }

    const favorites = await Favorite.findAll({
      where: {
        user_id: req.user.id,
        product_id: { [require('sequelize').Op.in]: ids }
      },
      attributes: ['product_id']
    });

    return success(res, {
      favorite_ids: favorites.map(f => f.product_id)
    });
  } catch (err) {
    logger.error('Favorites', '检查收藏状态失败', { error: err.message });
    return serverError(res, '服务器错误，请稍后重试');
  }
});

// POST /api/favorites - 添加收藏
router.post('/',
  authMiddleware,
  body('product_id').isInt({ min: 1 }).withMessage('商品ID无效'),
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return badRequest(res, errors.array()[0].msg);
      }

      const { product_id } = req.body;

      // 检查商品是否存在且已审核通过
      const product = await Product.findOne({
        where: { id: product_id, status: 'approved' }
      });
      if (!product) {
        return notFound(res, '商品不存在或尚未通过审核');
      }

      // 检查是否已收藏
      const existing = await Favorite.findOne({
        where: { user_id: req.user.id, product_id }
      });
      if (existing) {
        return conflict(res, '已收藏过该商品');
      }

      const favorite = await Favorite.create({
        user_id: req.user.id,
        product_id
      });

      logger.info('Favorites', `用户 ${req.user.username} 收藏了商品 ${product_id}`);
      return success(res, { id: favorite.id, product_id }, '收藏成功');
    } catch (err) {
      logger.error('Favorites', '添加收藏失败', { error: err.message });
      return serverError(res, '服务器错误，请稍后重试');
    }
  }
);

// DELETE /api/favorites/:productId - 取消收藏
router.delete('/:productId', authMiddleware, async (req, res) => {
  try {
    const productId = parseInt(req.params.productId);
    if (isNaN(productId)) {
      return badRequest(res, '商品ID无效');
    }

    const favorite = await Favorite.findOne({
      where: { user_id: req.user.id, product_id: productId }
    });

    if (!favorite) {
      return notFound(res, '未收藏该商品');
    }

    await favorite.destroy();
    logger.info('Favorites', `用户 ${req.user.username} 取消了商品 ${productId} 的收藏`);
    return success(res, null, '已取消收藏');
  } catch (err) {
    logger.error('Favorites', '取消收藏失败', { error: err.message });
    return serverError(res, '服务器错误，请稍后重试');
  }
});

module.exports = router;
