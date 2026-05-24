'use strict';

const express = require('express');
const { body, validationResult } = require('express-validator');
const Review = require('../models/Review');
const Product = require('../models/Product');
const User = require('../models/User');
const { authMiddleware, optionalAuth } = require('../middlewares/auth');
const { success, badRequest, notFound, serverError, forbidden } = require('../utils/response');
const logger = require('../utils/logger');

const router = express.Router();

// 计算并更新商品平均评分
const updateProductRating = async (productId) => {
  const { fn, col } = require('sequelize');
  const result = await Review.findAll({
    where: { product_id: productId },
    attributes: [
      [fn('AVG', col('rating')), 'avgRating'],
      [fn('COUNT', col('id')), 'count']
    ],
    raw: true
  });

  const avgRating = (result && result[0] && result[0].avgRating) ? parseFloat(result[0].avgRating) : 0;
  const count = (result && result[0] && result[0].count) ? parseInt(result[0].count) : 0;

  await Product.update(
    { average_rating: avgRating, review_count: count },
    { where: { id: productId } }
  );

  return { avgRating, count };
};

// GET /api/reviews/product/:productId - 获取某商品的所有评论
router.get('/product/:productId', optionalAuth, async (req, res) => {
  try {
    const { productId } = req.params;
    const { page = 1, limit = 20 } = req.query;
    const offset = (parseInt(page) - 1) * parseInt(limit);

    const product = await Product.findByPk(productId, {
      where: { status: 'approved' }
    });
    if (!product) {
      return notFound(res, '商品不存在');
    }

    const { count, rows: reviews } = await Review.findAndCountAll({
      where: { product_id: productId },
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

    const processedReviews = reviews.map((r) => ({
      id: r.id,
      rating: r.rating,
      comment: r.comment,
      user: r.user,
      created_at: r.created_at
    }));

    return success(res, {
      reviews: processedReviews,
      product: {
        id: product.id,
        name: product.name,
        average_rating: parseFloat(product.average_rating) || 0,
        review_count: product.review_count || 0
      },
      pagination: {
        total: count,
        page: parseInt(page),
        limit: parseInt(limit),
        totalPages: Math.ceil(count / parseInt(limit))
      }
    });
  } catch (err) {
    logger.error('Reviews', '获取评论列表失败', { error: err.message });
    return serverError(res, '服务器错误');
  }
});

// POST /api/reviews - 发表/更新评论（每个用户对每个商品只能发表一条）
const createReviewRules = [
  body('product_id')
    .isInt({ min: 1 })
    .withMessage('商品ID无效'),
  body('rating')
    .isInt({ min: 1, max: 5 })
    .withMessage('评分需在 1-5 之间'),
  body('comment')
    .optional()
    .isLength({ max: 2000 })
    .withMessage('评论内容不能超过 2000 个字符')
];

router.post('/', authMiddleware, createReviewRules, async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return badRequest(res, errors.array()[0].msg);
    }

    const { product_id, rating, comment } = req.body;

    const product = await Product.findByPk(product_id, {
      where: { status: 'approved' }
    });
    if (!product) {
      return notFound(res, '商品不存在');
    }

    // 检查是否已有评论，有则更新，无则创建
    const existing = await Review.findOne({
      where: { product_id, user_id: req.user.id }
    });

    if (existing) {
      await existing.update({ rating, comment: comment || '' });
      await updateProductRating(product_id);
      logger.info('Reviews', `用户 ${req.user.username} 更新了商品 ${product_id} 的评论`);
      return success(res, { id: existing.id }, '评论已更新');
    }

    const review = await Review.create({
      product_id,
      user_id: req.user.id,
      rating,
      comment: comment || ''
    });

    await updateProductRating(product_id);
    logger.info('Reviews', `用户 ${req.user.username} 对商品 ${product_id} 发表评分 ${rating} 星`);

    return success(res, { id: review.id }, '评论发表成功');
  } catch (err) {
    logger.error('Reviews', '发表评论失败', { error: err.message });
    return serverError(res, '服务器错误');
  }
});

// DELETE /api/reviews/:id - 删除自己的评论
router.delete('/:id', authMiddleware, async (req, res) => {
  try {
    const review = await Review.findByPk(req.params.id);
    if (!review) {
      return notFound(res, '评论不存在');
    }

    if (review.user_id !== req.user.id && req.user.role !== 'admin') {
      return forbidden(res, '只能删除自己的评论');
    }

    const productId = review.product_id;
    await review.destroy();
    await updateProductRating(productId);

    logger.info('Reviews', `用户 ${req.user.username} 删除了评论 ${req.params.id}`);
    return success(res, null, '评论已删除');
  } catch (err) {
    logger.error('Reviews', '删除评论失败', { error: err.message });
    return serverError(res, '服务器错误');
  }
});

module.exports = router;
