'use strict';
const { DataTypes } = require('sequelize');
const sequelize = require('../models/index');

const Product = sequelize.define('Product', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  category_id: {
    type: DataTypes.STRING(100),
    allowNull: false
  },
  user_id: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: 'users',
      key: 'id'
    }
  },
  name: {
    type: DataTypes.STRING(200),
    allowNull: false,
    validate: {
      notEmpty: true,
      len: [1, 200]
    }
  },
  description: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  purchase_link: {
    type: DataTypes.STRING(500),
    allowNull: true,
    validate: {
      isUrl: true,
      len: [0, 500]
    }
  },
  images: {
    type: DataTypes.JSON,
    defaultValue: [],
    comment: '多张图片路径 JSON 数组'
  },
  average_rating: {
    type: DataTypes.DECIMAL(3, 2),
    defaultValue: 0.00,
    allowNull: false,
    comment: '平均评分，1-5分，保留两位小数'
  },
  review_count: {
    type: DataTypes.INTEGER,
    defaultValue: 0,
    allowNull: false,
    comment: '评论总数'
  },
  status: {
    type: DataTypes.ENUM('pending', 'approved', 'rejected'),
    defaultValue: 'pending',
    allowNull: false
  }
}, {
  tableName: 'products',
  timestamps: true,
  underscored: false,
  createdAt: 'created_at',
  updatedAt: 'updated_at',
  indexes: [
    { fields: ['category_id'] },
    { fields: ['user_id'] },
    { fields: ['status'] }
  ]
});

module.exports = Product;
