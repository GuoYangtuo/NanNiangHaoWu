'use strict';

const express = require('express');
const { body, validationResult } = require('express-validator');
const Category = require('../models/Category');
const { authMiddleware } = require('../middlewares/auth');
const { adminMiddleware } = require('../middlewares/admin');
const { success, badRequest, notFound, serverError } = require('../utils/response');
const logger = require('../utils/logger');

const router = express.Router();

// GET /api/categories - 获取所有分类列表（树形结构）
router.get('/', async (req, res) => {
  try {
    const categories = await Category.findAll({
      order: [
        ['parent_id', 'ASC NULLS FIRST'],
        ['sort_order', 'ASC']
      ]
    });

    // 转换为树形结构
    const categoryMap = {};
    const roots = [];

    categories.forEach(cat => {
      categoryMap[cat.id] = {
        id: cat.id,
        name: cat.name,
        slug: cat.slug,
        parent_id: cat.parent_id,
        sort_order: cat.sort_order
      };
    });

    categories.forEach(cat => {
      if (cat.parent_id === null) {
        roots.push(categoryMap[cat.id]);
      } else {
        const parent = categoryMap[cat.parent_id];
        if (parent) {
          if (!parent.children) {
            parent.children = [];
          }
          parent.children.push(categoryMap[cat.id]);
        }
      }
    });

    return success(res, roots);
  } catch (err) {
    logger.error('Categories', '获取分类列表失败', { error: err.message });
    return serverError(res, '服务器错误');
  }
});

// POST /api/categories - 创建新分类（仅管理员）
router.post('/', authMiddleware, adminMiddleware, [
  body('name').trim().isLength({ min: 1, max: 100 }).withMessage('分类名称长度需在 1-100 个字符之间'),
  body('parent_id').optional({ nullable: true }).isInt({ min: 1 }).withMessage('父级分类 ID 无效'),
  body('sort_order').optional().isInt({ min: 0 }).withMessage('排序序号必须为非负整数')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return badRequest(res, errors.array()[0].msg);
    }

    const { name, parent_id, sort_order = 0 } = req.body;

    // 如果有父级分类，验证其存在
    if (parent_id) {
      const parent = await Category.findByPk(parent_id);
      if (!parent) {
        return badRequest(res, '父级分类不存在');
      }
    }

    // 生成 slug
    const slug = name.toLowerCase().replace(/[^a-z0-9\u4e00-\u9fa5]/g, '-').replace(/-+/g, '-');

    const category = await Category.create({
      name: name.trim(),
      slug,
      parent_id: parent_id || null,
      sort_order: parseInt(sort_order)
    });

    logger.info('Categories', `管理员 ${req.user.username} 创建了新分类: ${name}`);

    return success(res, {
      id: category.id,
      name: category.name,
      slug: category.slug,
      parent_id: category.parent_id,
      sort_order: category.sort_order
    }, '分类创建成功');
  } catch (err) {
    if (err.name === 'SequelizeUniqueConstraintError') {
      return badRequest(res, '该分类名称已存在');
    }
    logger.error('Categories', '创建分类失败', { error: err.message });
    return serverError(res, '服务器错误');
  }
});

// DELETE /api/categories/:id - 删除分类（仅管理员）
router.delete('/:id', authMiddleware, adminMiddleware, async (req, res) => {
  try {
    const category = await Category.findByPk(req.params.id);

    if (!category) {
      return notFound(res, '分类不存在');
    }

    // 检查是否有子分类
    const childCount = await Category.count({ where: { parent_id: category.id } });
    if (childCount > 0) {
      return badRequest(res, '请先删除该分类下的子分类');
    }

    // 检查是否有商品关联
    const Product = require('../models/Product');
    const productCount = await Product.count({ where: { category_id: category.id } });
    if (productCount > 0) {
      return badRequest(res, '该分类下仍有商品，无法删除');
    }

    await category.destroy();

    logger.info('Categories', `管理员 ${req.user.username} 删除了分类: ${category.name}`);

    return success(res, null, '分类删除成功');
  } catch (err) {
    logger.error('Categories', '删除分类失败', { error: err.message });
    return serverError(res, '服务器错误');
  }
});

module.exports = router;
