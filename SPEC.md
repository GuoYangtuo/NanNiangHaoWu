# 小南娘好物推荐网站 — 项目规格说明

## 1. 项目概述

### 项目名称
**小南娘好物** — 亚文化安利社区

### 核心定位
一个面向女性亚文化群体的好物推荐与互相"抄作业"的垂直社区，覆盖小裙子、化妆品、洗护用品、大码女装、饰品、情趣玩具等品类。用户可浏览推荐、上传分享商品，后台统一审核管理。

### 目标用户
- LGBTQ+ 女性群体、跨性别女性
- 大码女装需求群体
- 情趣用品/成人用品消费者
- 亚文化服饰爱好者（Lolita、JK、软妹服等）

### 典型使用场景
- 用户浏览各分类下的好物推荐卡片，点赞收藏
- 用户上传自己使用过的好物，填写详细使用感受
- 管理员审核用户提交的好物，通过后公开展示
- 管理员管理用户账号，禁用违规用户

---

## 2. 技术选型

| 层级 | 技术方案 |
|------|----------|
| 前端框架 | React 18 + Vite |
| UI 样式 | Tailwind CSS v3 |
| 前端路由 | React Router v6 |
| HTTP 客户端 | Axios |
| 后端框架 | Node.js + Express |
| 数据库 | MySQL 8 |
| ORM | Sequelize |
| 认证 | JWT (jsonwebtoken) |
| 文件上传 | Multer |
| 图片存储 | 本地文件系统 (`uploads/` 目录) |
| 环境配置 | dotenv |
| 密码加密 | bcryptjs |
| 后端日志 | morgan + 自定义日志 |
| CORS | cors 中间件 |

---

## 3. 视觉与 UI 设计

### 整体风格
- **简约现代、清新温暖**，避免紫色主题
- 圆润卡片风格，大量留白，柔和阴影
- 主色调：**玫瑰粉 + 奶茶色系**（偏温暖不刺眼）
- 圆角：8px–16px
- 字体：系统默认无衬线字体

### 色彩体系
```
Primary:     #E879A9  (玫瑰粉，用于主按钮、Logo 高亮)
Primary2:    #F5C6D6  (浅粉，用于标签背景、hover 态)
Accent:      #FFB3C6  (桃粉，用于图标、强调)
Background:  #FDF8F5  (米白暖色，主背景)
Surface:     #FFFFFF  (纯白，卡片背景)
Border:      #F0E8E4  (浅米灰，边框)
Text1:       #2D2A32  (深棕黑，主文本)
Text2:       #8A7F8A  (灰紫，次要文本)
Success:     #52C784  (绿色)
Warning:     #FFB347  (橙黄)
Danger:      #FF6B6B  (红色)
```

### 分类树配色
- 文件夹节点：浅粉色背景 + 粉红图标
- 类目叶子节点：纯白背景 + 粉红文字

### 瀑布流卡片
- 圆角 12px
- 柔和阴影：`0 2px 12px rgba(0,0,0,0.06)`
- 图片自适应高度
- hover：轻微上浮 + 阴影加深

---

## 4. 后端架构

### 项目结构
```
backend/
├── app.js                  # Express 主入口
├── .env                    # 环境变量（不提交 git）
├── config/
│   └── config.json         # Sequelize 数据库配置
├── migrations/             # 数据库迁移文件
├── models/                 # Sequelize 模型
│   ├── User.js
│   ├── Product.js
│   └── Category.js
├── routes/
│   ├── auth.js
│   ├── products.js
│   ├── categories.js
│   └── admin.js
├── middlewares/
│   ├── auth.js
│   └── admin.js
├── utils/
│   ├── logger.js
│   └── response.js
└── uploads/                # 上传文件目录
```

### 数据库设计

#### users 表
| 字段 | 类型 | 说明 |
|------|------|------|
| id | INT AUTO_INCREMENT | 主键 |
| username | VARCHAR(50) | 用户名，唯一 |
| email | VARCHAR(100) | 邮箱，唯一 |
| password | VARCHAR(255) | bcrypt 加密后密码 |
| is_subscribed | BOOLEAN | 订阅状态（暂不使用） |
| subscription_expires_at | DATE | 订阅到期时间（暂不使用） |
| role | ENUM('user','admin') | 角色 |
| status | ENUM('active','banned') | 账号状态 |
| created_at | DATETIME | 创建时间 |
| updated_at | DATETIME | 更新时间 |

#### categories 表
| 字段 | 类型 | 说明 |
|------|------|------|
| id | INT AUTO_INCREMENT | 主键 |
| name | VARCHAR(100) | 分类名称 |
| slug | VARCHAR(100) | URL slug |
| parent_id | INT | 父级分类 ID（顶层为 NULL） |
| sort_order | INT | 排序序号 |
| created_at | DATETIME | 创建时间 |

#### products 表
| 字段 | 类型 | 说明 |
|------|------|------|
| id | INT AUTO_INCREMENT | 主键 |
| category_id | INT | 所属分类 ID |
| user_id | INT | 推荐人用户 ID |
| name | VARCHAR(200) | 商品名称 |
| description | TEXT | 简介/使用感受 |
| purchase_link | VARCHAR(500) | 参考购买链接 |
| images | JSON | 多张图片路径 JSON 数组 |
| status | ENUM('pending','approved','rejected') | 审核状态 |
| created_at | DATETIME | 创建时间 |
| updated_at | DATETIME | 更新时间 |

---

## 5. 前端架构

### 项目结构
```
frontend/
├── src/
│   ├── main.jsx
│   ├── App.jsx
│   ├── index.css
│   ├── api/
│   │   ├── index.js         # axios 实例
│   │   ├── auth.js
│   │   ├── product.js
│   │   └── admin.js
│   ├── components/
│   │   ├── Layout.jsx        # 页面布局（侧边+主内容）
│   │   ├── CategoryTree.jsx # 分类树组件
│   │   ├── ProductCard.jsx   # 商品瀑布流卡片
│   │   ├── Waterfall.jsx     # 瀑布流容器
│   │   ├── ImageUpload.jsx   # 多图上传组件
│   │   └── ProtectedRoute.jsx
│   ├── pages/
│   │   ├── Login.jsx
│   │   ├── Register.jsx
│   │   ├── Home.jsx
│   │   ├── ProductDetail.jsx
│   │   ├── Upload.jsx
│   │   └── Admin.jsx
│   ├── hooks/
│   │   └── useAuth.js
│   ├── context/
│   │   └── AuthContext.jsx
│   └── utils/
│       └── constants.js      # 分类树 JSON
└── index.html
```

---

## 6. 分类树结构（JSON，存于前端常量）

```
- 📂 小裙子
  ├── Lolita 小裙子
  ├── JK 制服
  ├── 软妹服 / 日常可爱风
  └── 漢服 / 漢元素
- 📂 化妆品
  ├── 底妆
  ├── 眼妆
  ├── 唇妆
  └── 指甲油 / 美甲
- 📂 洗护用品
  ├── 沐浴露 / 身体乳
  ├── 洗发护发
  └── 口腔护理
- 📂 大码女装
  ├── 连衣裙
  ├── 上装
  └── 下装
- 📂 饰品
  ├── 发饰
  ├── 耳饰
  └── 项链 / 手链
- 📂 情趣玩具
  ├── 按摩棒 / 跳蛋
  ├── 情趣内衣
  └── 润滑液 / 辅助用品
```

> 注意：前端分类树 **不存储在数据库中**，仅用于展示与组织商品类目。数据库 `categories` 表存储的分类名称与前端 JSON 中的类目名称一一对应。

---

## 7. API 接口设计

### 认证模块 `/api/auth`
| 方法 | 路径 | 说明 | 权限 |
|------|------|------|------|
| POST | /api/auth/register | 注册 | 公开 |
| POST | /api/auth/login | 登录 | 公开 |
| GET | /api/auth/me | 获取当前用户信息 | 登录 |
| GET | /api/auth/check-email | 检查邮箱是否已注册 | 公开 |

### 商品模块 `/api/products`
| 方法 | 路径 | 说明 | 权限 |
|------|------|------|------|
| GET | /api/products | 获取已审核通过的商品列表（支持分类筛选、分页） | 公开 |
| GET | /api/products/:id | 获取商品详情 | 公开 |
| POST | /api/products | 上传推荐好物 | 登录 |
| PUT | /api/products/:id | 更新自己的推荐好物 | 登录(作者) |
| DELETE | /api/products/:id | 删除自己的推荐好物 | 登录(作者) |

### 分类模块 `/api/categories`
| 方法 | 路径 | 说明 | 权限 |
|------|------|------|------|
| GET | /api/categories | 获取所有分类列表（树形结构） | 公开 |
| POST | /api/categories | 创建新分类 | 管理员 |

### 管理模块 `/api/admin`
| 方法 | 路径 | 说明 | 权限 |
|------|------|------|------|
| GET | /api/admin/products | 获取所有商品（含待审核） | 管理员 |
| PUT | /api/admin/products/:id/verify | 审核商品（通过/拒绝） | 管理员 |
| GET | /api/admin/users | 获取用户列表 | 管理员 |
| PUT | /api/admin/users/:id/status | 更新用户状态（封禁/激活） | 管理员 |
| DELETE | /api/admin/products/:id | 删除商品 | 管理员 |

---

## 8. 各页面详细说明

### 8.1 登录 / 注册页
- 简洁居中卡片布局
- 登录：用户名 + 密码
- 注册：用户名 + 邮箱 + 密码 + 确认密码
- 客户端表单校验 + 服务端校验
- 登录成功后 JWT 存入 localStorage
- 响应式：小屏移动端单列布局

### 8.2 主页
- **左侧边栏**：分类树（宽度 220px），可折叠展开子分类，选中态高亮
- **右侧主区域**：瀑布流商品卡片网格（3列，桌面；2列，平板；1列，手机）
- 顶部：Logo + 搜索框 + 登录用户信息 + 上传按钮
- 顶部右侧：普通用户显示"上传好物"；管理员显示"管理后台"
- 点击分类树类目 → 加载该分类商品（默认加载全部）
- 点击树节点文件夹 → 展开/折叠子节点

### 8.3 商品详情页
- 顶部返回按钮
- 图片画廊（支持多张图片滑动查看）
- 商品名称（标题）
- 所属分类标签
- 推荐人用户名 + 推荐时间
- 简介内容（支持多行文字，可包含使用感受/推荐理由/使用方法）
- 参考购买链接（点击跳转新窗口）
- 返回主页按钮

### 8.4 上传好物页
- 选择分类（下拉选择，支持选择现有分类或创建新分类）
- 创建新分类时：输入新分类名称
- 商品名称输入框
- 简介/推荐理由文本域（多行）
- 参考购买链接输入框
- 图片上传（支持多张，最多 9 张，支持拖拽，支持预览和删除）
- 提交按钮 → 显示"待审核"提示

### 8.5 管理后台
- 需要验证是否为 admin 账号
- 顶部 Tab 切换：商品审核 / 用户管理 / 商品管理
- **商品审核 Tab**：列表展示所有待审核商品，卡片展示 + 审核按钮（通过/拒绝）
- **用户管理 Tab**：用户列表，支持禁用/激活操作
- **商品管理 Tab**：展示所有商品，支持删除

---

## 9. 环境变量 (.env)

```env
PORT=3001
DB_HOST=localhost
DB_PORT=3306
DB_NAME=nanmeihao
DB_USER=root
DB_PASSWORD=your_mysql_password
JWT_SECRET=your_jwt_secret_key_here
ADMIN_PASSWORD=your_admin_password
NODE_ENV=development
```

---

## 10. 质量标准

- 所有表单需客户端 + 服务端双重校验
- JWT 过期时间 7 天
- 密码使用 bcrypt 加密，强度要求 ≥ 8 位
- 图片上传限制：单文件 ≤ 5MB，支持 jpg/png/webp/gif
- 错误响应统一格式：`{ success: false, message: "错误信息" }`
- 成功响应统一格式：`{ success: true, data: ... }`
- 移动端响应式布局适配（断点：sm=640px, md=768px, lg=1024px）
- 不使用紫色作为主色调
