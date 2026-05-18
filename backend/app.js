'use strict';

require('dotenv').config();

const express = require('express');
const cors = require('cors');
const morgan = require('morgan');
const path = require('path');
const fs = require('fs');

const sequelize = require('./models/index');
const User = require('./models/User');
const Product = require('./models/Product');
const ContentEdit = require('./models/ContentEdit');
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
  Product.belongsTo(User, { as: 'user', foreignKey: 'user_id' });
  ContentEdit.belongsTo(User, { as: 'user', foreignKey: 'user_id' });
};

// 初始化数据库并创建管理员账号
const initializeDatabase = async () => {
  try {
    // 连接数据库
    await sequelize.authenticate();
    logger.info('Database', '数据库连接成功');

    // 设置关联
    setupAssociations();

    // 安全同步：仅创建缺失的表/列，不 alter 现有表，避免 MySQL 64 key 限制
    await sequelize.sync();
    logger.info('Database', '数据库模型同步完成');

    // 手动创建 content_edits 表（如果不存在），避免依赖 alter 触发 64 key 限制
    const [tables] = await sequelize.query(
      "SHOW TABLES LIKE 'content_edits'",
      { type: sequelize.QueryTypes.SHOWTABLE }
    );
    if (!tables || tables.length === 0) {
      await sequelize.query(`
        CREATE TABLE IF NOT EXISTS content_edits (
          id INT AUTO_INCREMENT PRIMARY KEY,
          category_id VARCHAR(100) NOT NULL,
          user_id INT NOT NULL,
          new_content TEXT NOT NULL,
          status ENUM('pending','approved','rejected') DEFAULT 'pending',
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
          INDEX idx_category (category_id),
          INDEX idx_user (user_id),
          INDEX idx_status (status),
          FOREIGN KEY (user_id) REFERENCES users(id)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
      `);
      logger.info('Database', 'content_edits 表创建完成');
    }

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
