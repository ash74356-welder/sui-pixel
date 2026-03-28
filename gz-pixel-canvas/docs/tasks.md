# 广州像素画布 - 任务分解文档

## 项目结构

```
gz-pixel-canvas/
├── docs/                       # 文档目录
│   ├── spec.md                # 项目规格说明书
│   ├── tasks.md               # 本文件 - 任务分解
│   └── checklist.md           # 验收清单
├── client/                     # 前端代码
│   ├── public/                # 静态资源
│   │   ├── images/            # 地图图片
│   │   │   ├── guangzhou-overview.jpg
│   │   │   ├── guangzhou-district.jpg
│   │   │   └── guangzhou-detailed.jpg
│   │   └── icons/             # 图标资源
│   ├── src/
│   │   ├── components/        # 组件
│   │   │   ├── Map/           # 地图组件
│   │   │   ├── Canvas/        # Canvas 绘制层
│   │   │   ├── Toolbar/       # 工具栏
│   │   │   ├── UserPanel/     # 用户面板 (IP 标识)
│   │   │   └── Import/        # 导入功能
│   │   ├── core/              # 核心模块
│   │   │   ├── MapController.js
│   │   │   ├── CanvasOverlay.js
│   │   │   ├── PixelGrid.js
│   │   │   ├── **PixelVisibilityManager.js**  # **像素显示管理**
│   │   │   └── SocketClient.js
│   │   ├── tools/             # 工具模块
│   │   │   ├── DrawingTool.js
│   │   │   ├── ColorPicker256.js    # 256色调色板
│   │   │   ├── EraserTool.js
│   │   │   └── PixelSize.js         # **仅大小，无形状**
│   │   ├── utils/             # 工具函数
│   │   │   ├── CoordinateConverter.js
│   │   │   ├── EventBus.js
│   │   │   ├── Storage.js
│   │   │   └── ImageProcessor.js
│   │   ├── store/             # 状态管理
│   │   │   ├── userStore.js   # IP 用户状态
│   │   │   └── pixelStore.js
│   │   ├── styles/            # 样式文件
│   │   └── main.js            # 入口文件
│   ├── index.html
│   └── package.json
├── server/                     # 后端代码
│   ├── src/
│   │   ├── config/            # 配置文件
│   │   ├── controllers/       # 控制器
│   │   │   ├── ipController.js      # IP 识别
│   │   │   ├── pixelController.js
│   │   │   └── imageController.js
│   │   ├── models/            # 数据模型
│   │   │   ├── UserSession.js       # IP 会话
│   │   │   └── Pixel.js
│   │   ├── routes/            # 路由
│   │   │   ├── session.js     # IP 会话路由
│   │   │   ├── pixels.js
│   │   │   └── images.js
│   │   ├── middleware/        # 中间件
│   │   │   ├── ipIdentifier.js      # IP 识别
│   │   │   ├── drawLimiter.js       # 绘制限制 400x400
│   │   │   └── cooldown.js          # 冷却时间
│   │   ├── socket/            # WebSocket 处理
│   │   │   ├── connection.js
│   │   │   ├── pixelEvents.js       # 覆盖机制
│   │   │   └── userEvents.js
│   │   ├── services/          # 业务逻辑
│   │   │   ├── pixelService.js      # UPSERT 逻辑
│   │   │   └── **ImageProcessingService.js**  # **独立图片处理服务**
│   │   └── app.js             # 应用入口
│   ├── tests/                 # 测试文件
│   └── package.json
├── database/                   # 数据库
│   ├── migrations/            # 迁移文件
│   └── seeds/                 # 种子数据
├── docker-compose.yml          # Docker 配置
└── README.md
```

***

## 阶段一: 基础架构 (2-3 天)

### 任务 1.1: 项目初始化

**优先级**: P0\
**预计耗时**: 3 小时\
**依赖**: 无

**前端**:

- [ ] 创建 client 目录结构
- [ ] 初始化 npm 项目
- [ ] 安装依赖: Leaflet, Socket.io-client
- [ ] 配置 Vite 构建工具
- [ ] 创建基础 HTML 和 CSS

**后端**:

- [ ] 创建 server 目录结构
- [ ] 初始化 npm 项目
- [ ] 安装依赖: Express, Socket.io, PostgreSQL, Redis, **Sharp**
- [ ] 配置 ESLint 和 Prettier

**输出文件**:

- `client/package.json`
- `server/package.json`
- `client/index.html`
- `client/vite.config.js`

***

### 任务 1.2: IP 识别用户系统

**优先级**: P0\
**预计耗时**: 6 小时\
**依赖**: 1.1

**后端**:

- [ ] 实现 IP 地址获取中间件
- [ ] IP 哈希处理 (隐私保护)
- [ ] 生成用户显示名称 (如 "用户 192.168")
- [ ] Redis 存储 IP 会话
- [ ] 会话过期处理

**前端**:

- [ ] 获取当前用户标识
- [ ] 显示用户标识在顶部
- [ ] 用户状态管理

**输出文件**:

- `server/src/middleware/ipIdentifier.js`
- `server/src/controllers/ipController.js`
- `server/src/models/UserSession.js`
- `client/src/store/userStore.js`

***

### 任务 1.3: 地图集成与滚轮缩放

**优先级**: P0\
**预计耗时**: 6 小时\
**依赖**: 1.1

- [ ] 引入 Leaflet.js
- [ ] 初始化地图容器 (全屏)
- [ ] 设置广州中心坐标 (23.1291, 113.2644)
- [ ] 配置缩放范围 (10-18 级)
- [ ] **实现鼠标滚轮缩放**
- [ ] 添加基础地图图层 (OpenStreetMap)
- [ ] 地图平移功能

**输出文件**:

- `client/src/core/MapController.js`
- `client/src/components/Map/MapContainer.vue`

***

### 任务 1.4: Canvas 叠加层

**优先级**: P0\
**预计耗时**: 8 小时\
**依赖**: 1.3

- [ ] 创建自定义 Leaflet Canvas 图层
- [ ] Canvas 随地图移动同步更新
- [ ] 处理 Canvas 分辨率和缩放适配
- [ ] 实现视口裁剪优化
- [ ] Canvas 事件处理 (点击、拖动)

**输出文件**:

- `client/src/core/CanvasOverlay.js`

***

### 任务 1.5: 像素网格系统

**优先级**: P0\
**预计耗时**: 8 小时\
**依赖**: 1.4

- [ ] 定义最小像素单元 (0.0001° ≈ 10米)
- [ ] 实现网格坐标系统
- [ ] 像素坐标与地理坐标互转
- [ ] **正方形网格对齐算法** (无缝铺满)
- [ ] 网格线显示 (可开关)

**输出文件**:

- `client/src/core/PixelGrid.js`
- `client/src/utils/CoordinateConverter.js`

***

## 阶段二: 核心绘制功能 (3-4 天)

### 任务 2.1: 基础像素绘制

**优先级**: P0\
**预计耗时**: 8 小时\
**依赖**: 1.5

- [ ] 点击事件监听
- [ ] 坐标转换与网格对齐
- [ ] **在 Canvas 上绘制正方形像素**
- [ ] 固定像素视觉大小
- [ ] 批量绘制 (按住拖动)

**输出文件**:

- `client/src/tools/DrawingTool.js`

***

### 任务 2.2: 像素大小

**优先级**: P0\
**预计耗时**: 6 小时\
**依赖**: 2.1

- [ ] 实现三种像素大小 (小/中/大)
- [ ] 大小切换 UI
- [ ] **仅正方形像素** (移除形状切换)
- [ ] 像素大小与地图缩放的关系处理

**像素大小定义**:

| 等级    | 实际尺寸  | 视觉尺寸 |
| ----- | ----- | ---- |
| 小 (S) | \~10m | 8px  |
| 中 (M) | \~20m | 12px |
| 大 (L) | \~40m | 16px |

**输出文件**:

- `client/src/tools/PixelSize.js`

***

### 任务 2.3: 256 色调色板

**优先级**: P0\
**预计耗时**: 6 小时\
**依赖**: 2.1

- [ ] **经典 256 色调色板**
- [ ] 调色板 UI 设计 (16x16 网格)
- [ ] 当前颜色显示
- [ ] 最近使用颜色记录

**输出文件**:

- `client/src/tools/ColorPicker256.js`
- `client/src/components/Toolbar/ColorPalette256.vue`

***

### 任务 2.4: 橡皮擦工具

**优先级**: P0\
**预计耗时**: 6 小时\
**依赖**: 2.1

- [ ] 橡皮擦模式切换
- [ ] 删除像素逻辑
- [ ] 批量擦除 (按住拖动)
- [ ] 视觉反馈

**输出文件**:

- `client/src/tools/EraserTool.js`

***

### 任务 2.5: 后来者覆盖机制

**优先级**: P0\
**预计耗时**: 8 小时\
**依赖**: 2.1

**后端**:

- [ ] 设计 UPSERT 逻辑
- [ ] 数据库唯一索引 (gridX, gridY)
- [ ] 冲突时更新数据
- [ ] 广播覆盖事件

**前端**:

- [ ] 接收覆盖事件
- [ ] 更新 Canvas 显示

**数据库**:

```sql
CREATE TABLE pixels (
  id UUID PRIMARY KEY,
  gridX INTEGER NOT NULL,
  gridY INTEGER NOT NULL,
  -- ... 其他字段
  UNIQUE(gridX, gridY)
);

-- UPSERT 语法
INSERT INTO pixels (gridX, gridY, color, ...)
VALUES (?, ?, ?, ...)
ON CONFLICT (gridX, gridY)
DO UPDATE SET
  color = EXCLUDED.color,
  authorId = EXCLUDED.authorId,
  updatedAt = NOW();
```

**输出文件**:

- `server/src/services/pixelService.js`

***

### 任务 2.6: **像素层自动隐藏逻辑**

**优先级**: P0\
**预计耗时**: 8 小时\
**依赖**: 2.1

- [ ] **计算视口内像素数量**
- [ ] **设定显示阈值** (如 500,000 像素)
- [ ] **超过阈值时隐藏 Canvas 层**
- [ ] **仅显示地图背景**
- [ ] 绘制时临时显示新像素
- [ ] 地图移动/缩放时重新计算

**输出文件**:

- `client/src/core/PixelVisibilityManager.js`

***

### 任务 2.7: 多层级地图切换

**优先级**: P0\
**预计耗时**: 8 小时\
**依赖**: 1.3

- [ ] 准备 3 张广州地图图片
- [ ] 实现自定义 TileLayer 类
- [ ] 监听缩放级别变化
- [ ] 根据缩放级别切换地图图层
- [ ] 图层切换过渡效果

**输出文件**:

- `client/src/core/MultiLevelMap.js`

***

### 任务 2.8: 工具栏与 UI

**优先级**: P0\
**预计耗时**: 6 小时\
**依赖**: 2.2, 2.3, 2.4

- [ ] 底部工具栏设计
- [ ] 256 色调色板整合
- [ ] **仅大小选择** (移除形状切换)
- [ ] 当前工具状态显示
- [ ] 响应式布局

**输出文件**:

- `client/src/components/Toolbar/Toolbar.vue`
- `client/src/styles/toolbar.css`

***

## 阶段三: 多人实时协作 (4-5 天)

### 任务 3.1: WebSocket 服务端

**优先级**: P0\
**预计耗时**: 8 小时\
**依赖**: 1.2

- [ ] Socket.io 服务器搭建
- [ ] IP 识别与连接绑定
- [ ] 用户连接管理
- [ ] 房间/频道管理
- [ ] 心跳检测

**输出文件**:

- `server/src/socket/connection.js`
- `server/src/app.js` (WebSocket 集成)

***

### 任务 3.2: 像素数据持久化

**优先级**: P0\
**预计耗时**: 8 小时\
**依赖**: 3.1

- [ ] PostgreSQL 数据库设计
- [ ] PostGIS 扩展配置
- [ ] Pixel 数据模型 (含覆盖机制)
- [ ] 像素 CRUD API
- [ ] 空间查询优化

**数据库表结构**:

```sql
CREATE TABLE pixels (
  id UUID PRIMARY KEY,
  lat DECIMAL(10, 8) NOT NULL,
  lng DECIMAL(11, 8) NOT NULL,
  grid_x INTEGER NOT NULL,
  grid_y INTEGER NOT NULL,
  color VARCHAR(7) NOT NULL,
  size VARCHAR(10) NOT NULL,
  **shape VARCHAR(10) DEFAULT 'square'**,  -- **仅正方形**
  author_id VARCHAR(255) NOT NULL,  -- IP 会话 ID
  author_name VARCHAR(255) NOT NULL, -- IP 显示名称
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(grid_x, grid_y)  -- 唯一索引，实现覆盖
);

CREATE INDEX idx_pixels_location ON pixels USING GIST (point(lng, lat));
CREATE INDEX idx_pixels_grid ON pixels (grid_x, grid_y);
```

**输出文件**:

- `server/src/models/Pixel.js`
- `server/src/controllers/pixelController.js`
- `server/src/routes/pixels.js`

***

### 任务 3.3: 绘制事件实时同步

**优先级**: P0\
**预计耗时**: 10 小时\
**依赖**: 3.1, 3.2

- [ ] 客户端 WebSocket 连接
- [ ] 绘制事件发送
- [ ] 接收并显示其他用户绘制
- [ ] 批量像素加载
- [ ] 增量更新机制

**事件类型**:

```javascript
// 客户端发送
socket.emit('pixel:draw', { lat, lng, color, size });
socket.emit('pixel:erase', { lat, lng });

// 服务端广播
socket.on('pixel:drawn', (pixel) => { ... });
socket.on('pixel:erased', (pixelId) => { ... });
```

**输出文件**:

- `client/src/core/SocketClient.js`
- `server/src/socket/pixelEvents.js`

***

### 任务 3.4: 在线用户显示 (IP 标识)

**优先级**: P0\
**预计耗时**: 6 小时\
**依赖**: 3.1

- [ ] 在线用户列表维护 (基于 IP)
- [ ] 用户上线/下线通知
- [ ] 右侧面板显示在线用户 (IP 后四位)
- [ ] 在线人数统计

**输出文件**:

- `server/src/socket/userEvents.js`
- `client/src/components/UserPanel/OnlineUsers.vue`

***

### 任务 3.5: 绘制限制 (400x400)

**优先级**: P0\
**预计耗时**: 8 小时\
**依赖**: 3.3

- [ ] **单次绘制区域限制 400x400**
- [ ] 绘制范围检测
- [ ] 超出限制提示
- [ ] 批量绘制计数

**输出文件**:

- `server/src/middleware/drawLimiter.js`

***

### 任务 3.6: 冷却时间

**优先级**: P1\
**预计耗时**: 6 小时\
**依赖**: 3.3

- [ ] 服务端冷却时间控制
- [ ] 客户端冷却时间显示
- [ ] 倒计时 UI
- [ ] 配置可调 (1-3 秒)

**输出文件**:

- `server/src/middleware/cooldown.js`

***

### 任务 3.7: 性能优化

**优先级**: P1\
**预计耗时**: 8 小时\
**依赖**: 3.3

- [ ] 视口裁剪实现
- [ ] 像素数据分块加载
- [ ] Canvas 分层渲染
- [ ] 大数据量渲染优化
- [ ] 60fps 性能目标

**输出文件**:

- `client/src/core/ViewportManager.js`

***

## 阶段四: 高级功能 (4-5 天)

### 任务 4.1: **独立图片处理模块** (高精度/多格式/多规格)

**优先级**: P1\
**预计耗时**: 16 小时\
**依赖**: 阶段三

**独立模块设计**:

- [ ] **创建独立 ImageProcessingService**
- [ ] **多格式支持**: JPG, PNG, GIF, WebP, BMP, TIFF
- [ ] **格式验证和解析**
- [ ] **高精度缩放算法**:
  - [ ] 最近邻 (Nearest Neighbor)
  - [ ] 双线性 (Bilinear)
  - [ ] Lanczos
- [ ] **多种转换规格**:
  - [ ] 原比例缩放
  - [ ] 固定宽度
  - [ ] 固定高度
  - [ ] 固定尺寸
  - [ ] 裁剪模式
- [ ] **颜色量化算法**:
  - [ ] 中位切分 (Median Cut)
  - [ ] K-Means
  - [ ] 八叉树 (Octree)
- [ ] **生成多种规格预览**
- [ ] 用户选择规格和尺寸
- [ ] **尺寸限制检查 (最大 400x400)**
- [ ] 批量 UPSERT 像素点

**技术选型**: Sharp (Node.js 高性能图片处理库)

**输出文件**:

- `server/src/services/ImageProcessingService.js`
- `server/src/controllers/imageController.js`
- `client/src/components/Import/ImageImporter.vue`
- `client/src/utils/ImageProcessor.js`

***

### 任务 4.2: **独立文字转像素模块**

**优先级**: P1\
**预计耗时**: 8 小时\
**依赖**: 4.1

- [ ] **创建独立 TextProcessingService**
- [ ] 文字输入界面
- [ ] 字体选择 (系统字体)
- [ ] Canvas 文字渲染
- [ ] **尺寸限制 (<= 400x400)**
- [ ] 文字转像素数据 (256色)
- [ ] 预览和放置

**输出文件**:

- `server/src/services/TextProcessingService.js`
- `client/src/components/Import/TextToPixel.vue`

***

### 任务 4.3: 视图控制与导航

**优先级**: P1\
**预计耗时**: 6 小时\
**依赖**: 阶段三

- [ ] 缩放按钮 (+/-)
- [ ] 复位视图按钮
- [ ] 坐标显示
- [ ] 像素计数显示
- [ ] 图层控制 (地图/像素/网格)

**输出文件**:

- `client/src/components/Map/MapControls.vue`

***

### 任务 4.4: 数据导出

**优先级**: P2\
**预计耗时**: 6 小时\
**依赖**: 阶段三

- [ ] 导出为 PNG/JPG
- [ ] 导出像素数据为 JSON
- [ ] 导入像素数据

**输出文件**:

- `client/src/utils/ExportManager.js`

***

## 阶段五: 部署上线 (2-3 天)

### 任务 5.1: 生产环境配置

**优先级**: P0\
**预计耗时**: 6 小时\
**依赖**: 阶段四

- [ ] 环境变量配置
- [ ] 数据库生产配置
- [ ] Redis 生产配置
- [ ] 前端生产构建
- [ ] Docker 配置

**输出文件**:

- `docker-compose.yml`
- `.env.production`
- `client/.env.production`

***

### 任务 5.2: 服务器部署

**优先级**: P0\
**预计耗时**: 8 小时\
**依赖**: 5.1

- [ ] 云服务器选购配置
- [ ] 域名配置
- [ ] SSL 证书配置
- [ ] Nginx 反向代理
- [ ] 服务启动脚本

***

### 任务 5.3: 监控与日志

**优先级**: P1\
**预计耗时**: 4 小时\
**依赖**: 5.2

- [ ] 应用监控
- [ ] 错误日志收集
- [ ] 性能监控
- [ ] 告警配置

***

### 任务 5.4: 最终测试

**优先级**: P0\
**预计耗时**: 6 小时\
**依赖**: 5.2

- [ ] 功能测试
- [ ] 性能测试
- [ ] 并发测试
- [ ] 浏览器兼容性测试
- [ ] Bug 修复

***

## 任务依赖图

```
阶段一:
1.1 项目初始化
    ├── 1.2 IP 识别用户系统
    └── 1.3 地图集成
            └── 1.4 Canvas 叠加层
                    └── 1.5 像素网格系统

阶段二:
2.1 基础像素绘制 (依赖 1.5)
    ├── 2.2 像素大小 (**仅正方形**)
    ├── 2.3 256色调色板
    └── 2.4 橡皮擦
            └── 2.8 工具栏 UI
2.5 后来者覆盖机制 (依赖 2.1)
2.6 **像素层自动隐藏** (依赖 2.1)
2.7 多层级地图 (依赖 1.3)

阶段三:
3.1 WebSocket 服务端 (依赖 1.2)
    ├── 3.2 像素数据持久化
    ├── 3.3 绘制事件同步
    │       └── 3.7 性能优化
    └── 3.4 在线用户显示
            ├── 3.5 绘制限制 (400x400)
            └── 3.6 冷却时间

阶段四:
4.1 **独立图片处理模块** (依赖 阶段三)
    └── 4.2 **独立文字转像素模块**
4.3 视图控制 (依赖 阶段三)
4.4 数据导出 (依赖 阶段三)

阶段五:
5.1 生产配置 (依赖 阶段四)
    └── 5.2 服务器部署
            ├── 5.3 监控日志
            └── 5.4 最终测试
```

***

## 里程碑

| 里程碑       | 日期     | 交付物          | 关键功能                                |
| --------- | ------ | ------------ | ----------------------------------- |
| M1 - 基础架构 | Day 3  | IP 识别 + 地图应用 | IP标识、地图显示、滚轮缩放                      |
| M2 - 核心绘制 | Day 7  | 完整绘制工具       | 像素绘制、256色、**仅正方形**、**自动隐藏**、覆盖机制    |
| M3 - 多人协作 | Day 12 | 实时协作平台       | WebSocket、实时同步、在线用户、400x400限制       |
| M4 - 高级功能 | Day 17 | 完整功能应用       | **独立图片处理模块**、**独立文字模块**、多格式/多规格/高精度 |
| M5 - 上线部署 | Day 20 | 线上应用         | 生产环境、监控、SSL                         |

***

## 资源需求

### 开发资源

- 广州地图图片素材 (3 张)
- 图标资源 (绘制工具等)
- **测试图片** (多种格式: JPG, PNG, GIF, WebP, BMP, TIFF)
- 测试字体

### 服务器资源

- 云服务器: 2核4G 起步 (图片处理需要更多内存)
- 数据库: PostgreSQL + PostGIS
- 缓存: Redis
- 域名 + SSL 证书
- CDN (可选)

### 第三方库

- **Sharp**: Node.js 高性能图片处理
- **Socket.io**: 实时通信
- **Leaflet**: 地图引擎

***

*文档版本: 4.0*\
*创建日期: 2026-03-28*\
*最后更新: 2026-03-28*
