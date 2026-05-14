'use strict';

require('dotenv').config();

const express = require('express');
const cors = require('cors');
const morgan = require('morgan');
const path = require('path');
const fs = require('fs');

const sequelize = require('./models/index');
const User = require('./models/User');
const Category = require('./models/Category');
const Product = require('./models/Product');
const logger = require('./utils/logger');

const authRoutes = require('./routes/auth');
const productRoutes = require('./routes/products');
const categoryRoutes = require('./routes/categories');
const adminRoutes = require('./routes/admin');

const app = express();
const PORT = process.env.PORT || 3001;

// 确保 uploads 目录存在
const uploadsDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

// 中间件
app.use(cors({
  origin: ['http://localhost:5173', 'http://localhost:3000', 'http://127.0.0.1:5173'],
  credentials: true
}));

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// 请求日志
app.use(morgan('dev'));

// 静态文件服务
app.use('/uploads', express.static(uploadsDir));

// API 路由
app.use('/api/auth', authRoutes);
app.use('/api/products', productRoutes);
app.use('/api/categories', categoryRoutes);
app.use('/api/admin', adminRoutes);

// 健康检查
app.get('/api/health', (req, res) => {
  res.json({ success: true, message: '服务运行正常', timestamp: new Date().toISOString() });
});

// 404 处理
app.use((req, res) => {
  res.status(404).json({ success: false, message: '请求的资源不存在' });
});

// 全局错误处理
app.use((err, req, res, next) => {
  logger.error('Global', '未捕获的错误', {
    error: err.message,
    stack: err.stack,
    path: req.path,
    method: req.method
  });

  if (err.name === 'MulterError') {
    if (err.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({ success: false, message: '文件大小超过限制（最大 5MB）' });
    }
    if (err.code === 'LIMIT_FILE_COUNT') {
      return res.status(400).json({ success: false, message: '图片数量超过限制（最多 9 张）' });
    }
    return res.status(400).json({ success: false, message: err.message });
  }

  res.status(500).json({ success: false, message: '服务器内部错误' });
});

// 设置模型关联
const setupAssociations = () => {
  Category.hasMany(Category, { as: 'children', foreignKey: 'parent_id', sourceKey: 'id' });
  Category.belongsTo(Category, { as: 'parent', foreignKey: 'parent_id', targetKey: 'id' });

  Product.belongsTo(Category, { as: 'category', foreignKey: 'category_id' });
  Product.belongsTo(User, { as: 'user', foreignKey: 'user_id' });
};

// 初始化数据库并创建管理员账号
const initializeDatabase = async () => {
  try {
    // 连接数据库
    await sequelize.authenticate();
    logger.info('Database', '数据库连接成功');

    // 设置关联
    setupAssociations();

    // 同步模型（开发环境使用）
    await sequelize.sync({ alter: true });
    logger.info('Database', '数据库模型同步完成');

    // 创建管理员账号
    const adminPassword = process.env.ADMIN_PASSWORD || 'admin123456';
    const [adminUser, created] = await User.findOrCreate({
      where: { username: 'admin' },
      defaults: {
        email: 'admin@nanmeihao.local',
        password: require('bcryptjs').hashSync(adminPassword, 10),
        role: 'admin',
        status: 'active'
      }
    });

    if (created) {
      logger.info('Admin', `管理员账号已创建 (用户名: admin, 密码: ${adminPassword})`);
    } else {
      logger.info('Admin', '管理员账号已存在');
    }

    // 初始化分类数据（如果为空）
    const categoryCount = await Category.count();
    if (categoryCount === 0) {
      await Category.bulkCreate([
        { name: '小裙子', slug: 'dresses', parent_id: null, sort_order: 1 },
        { name: '化妆品', slug: 'cosmetics', parent_id: null, sort_order: 2 },
        { name: '洗护用品', slug: 'personal-care', parent_id: null, sort_order: 3 },
        { name: '大码女装', slug: 'plus-size', parent_id: null, sort_order: 4 },
        { name: '饰品', slug: 'accessories', parent_id: null, sort_order: 5 },
        { name: '情趣玩具', slug: 'adult-toys', parent_id: null, sort_order: 6 }
      ]);

      const parents = await Category.findAll({ where: { parent_id: null } });
      const categoryMappings = {
        '小裙子': 'lolita',
        '化妆品': 'cosmetics-personal',
        '洗护用品': 'body-hair',
        '大码女装': 'plus-clothing',
        '饰品': 'jewelry',
        '情趣玩具': 'adult'
      };

      for (const parent of parents) {
        await Category.bulkCreate([
          { name: 'Lolita 小裙子', slug: `${categoryMappings[parent.name]}-lolita`, parent_id: parent.id, sort_order: 1 },
          { name: 'JK 制服', slug: `${categoryMappings[parent.name]}-jk`, parent_id: parent.id, sort_order: 2 },
          { name: '软妹服 / 日常可爱风', slug: `${categoryMappings[parent.name]}-soft`, parent_id: parent.id, sort_order: 3 },
          { name: '漢服 / 漢元素', slug: `${categoryMappings[parent.name]}-han`, parent_id: parent.id, sort_order: 4 }
        ]);
      }
      logger.info('Database', '分类数据初始化完成');
    }

    return true;
  } catch (err) {
    logger.error('Database', '数据库初始化失败', { error: err.message });
    return false;
  }
};

// 启动服务器
const startServer = async () => {
  const dbReady = await initializeDatabase();

  if (!dbReady) {
    logger.error('Server', '数据库连接失败，服务器无法启动');
    process.exit(1);
  }

  app.listen(PORT, () => {
    logger.info('Server', `🚀 服务器已启动，端口: ${PORT}`);
    logger.info('Server', `📱 前端地址: http://localhost:5173`);
    logger.info('Server', `🔌 API 地址: http://localhost:${PORT}/api`);
    logger.info('Admin', `🔐 管理员账号: admin / ${process.env.ADMIN_PASSWORD || 'admin123456'}`);
  });
};

startServer();

module.exports = app;
