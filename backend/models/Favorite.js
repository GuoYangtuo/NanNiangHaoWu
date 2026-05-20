'use strict';
const { DataTypes } = require('sequelize');
const sequelize = require('../models/index');

const Favorite = sequelize.define('Favorite', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  user_id: {
    type: DataTypes.INTEGER,
    allowNull: false
  },
  product_id: {
    type: DataTypes.INTEGER,
    allowNull: false
  }
}, {
  tableName: 'favorites',
  timestamps: true,
  underscored: false,
  createdAt: 'created_at',
  updatedAt: 'updated_at',
  indexes: [
    { fields: ['user_id'] },
    { fields: ['product_id'] },
    { unique: true, fields: ['user_id', 'product_id'] }
  ]
});

module.exports = Favorite;
