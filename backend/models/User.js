'use strict';
const { DataTypes } = require('sequelize');
const sequelize = require('../models/index');

const User = sequelize.define('User', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  username: {
    type: DataTypes.STRING(50),
    allowNull: false,
    unique: true,
    validate: {
      len: [2, 50],
      notEmpty: true
    }
  },
  email: {
    type: DataTypes.STRING(100),
    allowNull: false,
    unique: true,
    validate: {
      isEmail: true,
      notEmpty: true
    }
  },
  password: {
    type: DataTypes.STRING(255),
    allowNull: false,
    validate: {
      notEmpty: true
    }
  },
  is_subscribed: {
    type: DataTypes.BOOLEAN,
    defaultValue: false,
    comment: '订阅状态（暂不使用）'
  },
  subscription_expires_at: {
    type: DataTypes.DATE,
    allowNull: true,
    comment: '订阅到期时间（暂不使用）'
  },
  member_expires_at: {
    type: DataTypes.DATE,
    allowNull: true,
    comment: '会员到期时间'
  },
  role: {
    type: DataTypes.ENUM('user', 'admin'),
    defaultValue: 'user'
  },
  status: {
    type: DataTypes.ENUM('active', 'banned'),
    defaultValue: 'active'
  },
  password_changed_at: {
    type: DataTypes.DATE,
    allowNull: true,
    comment: '密码修改时间，用于使旧token失效'
  }
}, {
  tableName: 'users',
  timestamps: true,
  indexes: [
    { unique: true, fields: ['username'] },
    { unique: true, fields: ['email'] },
    { fields: ['status'] }
  ]
});

module.exports = User;
