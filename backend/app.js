'use strict';

require('dotenv').config();

const express = require('express');
const cors = require('cors');
const morgan = require('morgan');
const path = require('path');
const fs = require('fs');

const dbModule = require('./models/index');
const sequelize = dbModule;
const { createDatabaseIfNotExists } = dbModule;
const User = require('./models/User');
const Product = require('./models/Product');
const ContentEdit = require('./models/ContentEdit');
const Favorite = require('./models/Favorite');
const Review = require('./models/Review');
const logger = require('./utils/logger');

const authRoutes = require('./routes/auth');
const productRoutes = require('./routes/products');
const categoryRoutes = require('./routes/categories');
const adminRoutes = require('./routes/admin');
const favoritesRoutes = require('./routes/favorites');
const subscriptionRoutes = require('./routes/subscription');
const reviewsRoutes = require('./routes/reviews');
const { getRandomSchedule, setLockedIds, getLeafIds } = require('./data/categories');

const app = express();
const PORT = process.env.PORT || 3002;

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
app.use('/api/favorites', favoritesRoutes);
app.use('/api/subscription', subscriptionRoutes);
app.use('/api/reviews', reviewsRoutes);

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
      return res.status(400).json({ success: false, message: '文件大小超过限制（最大 10MB）' });
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
  Favorite.belongsTo(User, { as: 'user', foreignKey: 'user_id' });
  Favorite.belongsTo(Product, { as: 'product', foreignKey: 'product_id' });
  Product.hasMany(Favorite, { as: 'favorites', foreignKey: 'product_id' });
  Review.belongsTo(User, { as: 'user', foreignKey: 'user_id' });
  Review.belongsTo(Product, { as: 'product', foreignKey: 'product_id' });
  Product.hasMany(Review, { as: 'reviews', foreignKey: 'product_id' });
};

// 初始化数据库并创建管理员账号
const initializeDatabase = async () => {
  try {
    // 确保数据库存在，不存在则自动创建
    await createDatabaseIfNotExists();

    // 连接数据库
    await sequelize.authenticate();
    logger.info('Database', '数据库连接成功');

    // 设置关联
    setupAssociations();

    // 清理旧版本遗留的验证码相关列（如存在则删除，不再存储到数据库）
    const dropColIfExists = async (colName) => {
      try {
        const [r] = await sequelize.query(
          `SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'users' AND COLUMN_NAME = '${colName}' LIMIT 1`
        );
        if (r && r.length > 0) {
          await sequelize.query(`ALTER TABLE \`users\` DROP COLUMN \`${colName}\``);
          logger.info('Database', `users 表 ${colName} 列已删除`);
        }
      } catch (err) {
        logger.warn('Database', `清理列 ${colName} 失败: ${err.message}，不影响启动`);
      }
    };
    await dropColIfExists('email_verified');
    await dropColIfExists('email_verify_code');
    await dropColIfExists('email_verify_expires');
    await dropColIfExists('password_reset_code');
    await dropColIfExists('password_reset_expires');

    // 安全同步：仅创建缺失的表/列，不 alter 现有表，避免 MySQL 64 key 限制
    await sequelize.sync();
    logger.info('Database', '数据库模型同步完成');

    // 手动创建 content_edits 表（如果不存在），避免依赖 alter 触发 64 key 限制
    const [tables] = await sequelize.query(
      "SHOW TABLES LIKE 'content_edits'"
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

    // 确保 users 表存在 member_expires_at 列（旧数据库升级用）
    try {
      const [results] = await sequelize.query(
        "SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'users' AND COLUMN_NAME = 'member_expires_at' LIMIT 1"
      );
      if (!results || results.length === 0) {
        await sequelize.query(
          "ALTER TABLE `users` ADD COLUMN `member_expires_at` DATETIME NULL COMMENT '会员到期时间' AFTER `subscription_expires_at`"
        );
        logger.info('Database', 'users 表 member_expires_at 列已添加');
      }
    } catch (err) {
      logger.warn('Database', `member_expires_at 列检查/创建失败: ${err.message}，将跳过`);
    }

    // 确保 products 表存在 average_rating 和 review_count 列（旧数据库升级用）
    try {
      const [results2] = await sequelize.query(
        "SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'products' AND COLUMN_NAME = 'average_rating' LIMIT 1"
      );
      if (!results2 || results2.length === 0) {
        await sequelize.query(
          "ALTER TABLE `products` ADD COLUMN `average_rating` DECIMAL(3,2) NOT NULL DEFAULT 0.00 COMMENT '平均评分' AFTER `images`"
        );
        await sequelize.query(
          "ALTER TABLE `products` ADD COLUMN `review_count` INT NOT NULL DEFAULT 0 COMMENT '评论总数' AFTER `average_rating`"
        );
        logger.info('Database', 'products 表 average_rating 和 review_count 列已添加');
      }
    } catch (err) {
      logger.warn('Database', `products average_rating/review_count 列检查/创建失败: ${err.message}，将跳过`);
    }

    // 确保 reviews 表存在（旧数据库升级用）
    try {
      const [reviewTables] = await sequelize.query(
        "SHOW TABLES LIKE 'reviews'"
      );
      if (!reviewTables || reviewTables.length === 0) {
        await sequelize.query(`
          CREATE TABLE IF NOT EXISTS reviews (
            id INT AUTO_INCREMENT PRIMARY KEY,
            product_id INT NOT NULL,
            user_id INT NOT NULL,
            rating INT NOT NULL,
            comment TEXT,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
            INDEX idx_product (product_id),
            INDEX idx_user (user_id),
            UNIQUE INDEX idx_product_user (product_id, user_id),
            FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE,
            FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
          ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
        `);
        logger.info('Database', 'reviews 表创建完成');
      }
    } catch (err) {
      logger.warn('Database', `reviews 表检查/创建失败: ${err.message}，将跳过`);
    }

    // 确保 favorites 表存在且 id 列正确为自增主键（旧数据库升级用）
    try {
      const [favTables] = await sequelize.query(
        "SHOW TABLES LIKE 'favorites'"
      );
      if (!favTables || favTables.length === 0) {
        await sequelize.query(`
          CREATE TABLE IF NOT EXISTS favorites (
            id INT AUTO_INCREMENT PRIMARY KEY,
            user_id INT NOT NULL,
            product_id INT NOT NULL,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
            INDEX idx_user (user_id),
            INDEX idx_product (product_id),
            UNIQUE INDEX idx_user_product (user_id, product_id),
            FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
            FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE
          ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
        `);
        logger.info('Database', 'favorites 表创建完成');
      } else {
        // 检查 id 列是否正确设置为自增主键
        const [idColInfo] = await sequelize.query(
          "SELECT COLUMN_DEFAULT, IS_NULLABLE, DATA_TYPE, EXTRA FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'favorites' AND COLUMN_NAME = 'id'"
        );
        if (!idColInfo || idColInfo.length === 0 || idColInfo[0].EXTRA !== 'auto_increment') {
          // id 列存在但没有 auto_increment，需要修复
          await sequelize.query("ALTER TABLE `favorites` MODIFY COLUMN `id` INT AUTO_INCREMENT PRIMARY KEY");
          logger.info('Database', 'favorites 表 id 列已修复为自增主键');
        }
      }
    } catch (err) {
      logger.warn('Database', `favorites 表检查/创建失败: ${err.message}，将跳过`);
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

// 随机锁定定时器
let randomLockTimer = null;

const startRandomLockScheduler = () => {
  if (randomLockTimer) {
    clearInterval(randomLockTimer);
    randomLockTimer = null;
  }
  const schedule = getRandomSchedule();
  if (!schedule.enabled) return;

  const ms = schedule.period_hours * 60 * 60 * 1000;
  randomLockTimer = setInterval(() => {
    const currentSchedule = getRandomSchedule();
    if (!currentSchedule.enabled) return;
    const leafIds = getLeafIds();
    const n = Math.min(currentSchedule.lock_count, leafIds.length);
    const shuffled = [...leafIds].sort(() => Math.random() - 0.5);
    const selected = shuffled.slice(0, n);
    setLockedIds(selected);
    logger.info('CategoryLock', `定时随机锁定触发，锁定了 ${n} 个分类: [${selected.join(', ')}]`);
  }, ms);

  logger.info('CategoryLock', `随机锁定定时器已启动，周期 ${schedule.period_hours} 小时，每次锁定 ${schedule.lock_count} 个分类`);
};

const stopRandomLockScheduler = () => {
  if (randomLockTimer) {
    clearInterval(randomLockTimer);
    randomLockTimer = null;
    logger.info('CategoryLock', '随机锁定定时器已停止');
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
    startRandomLockScheduler();
  });
};

startServer();

module.exports = app;
