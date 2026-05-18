'use strict';
const { DataTypes } = require('sequelize');
const sequelize = require('../models/index');

const ContentEdit = sequelize.define('ContentEdit', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  category_id: {
    type: DataTypes.STRING(100),
    allowNull: false,
    comment: '被编辑的分类/文件夹 ID'
  },
  user_id: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: 'users',
      key: 'id'
    }
  },
  new_content: {
    type: DataTypes.TEXT,
    allowNull: false,
    comment: '用户提交的新 markdown 内容'
  },
  status: {
    type: DataTypes.ENUM('pending', 'approved', 'rejected'),
    defaultValue: 'pending',
    allowNull: false
  }
}, {
  tableName: 'content_edits',
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

module.exports = ContentEdit;
