# 穗绘像素 - 完整部署指南

## 项目结构

```
gz-pixel-canvas/
├── client/          # 前端 (Vite + Leaflet)
├── server/          # 后端 (Socket.io)
├── vercel.json      # Vercel 配置
├── railway.toml     # Railway 配置
└── DEPLOY.md        # 本文件
```

## 部署架构

- **前端**: Vercel (免费) - 提供网页访问
- **后端**: Railway (免费) - 提供 WebSocket 多人联机
- **通信**: Socket.io 实现实时同步

---

## 第一步：部署后端到 Railway

### 1.1 准备代码

确保 `server/` 目录包含以下文件：
- `index.js` - 服务器主文件
- `package.json` - 依赖配置

### 1.2 注册 Railway 账号

1. 访问 https://railway.app
2. 使用 GitHub 账号登录
3. 完成邮箱验证

### 1.3 创建项目

**方法 A: 通过 GitHub 部署 (推荐)**

1. 将整个 `gz-pixel-canvas` 项目推送到 GitHub
2. 在 Railway 控制台点击 "New Project"
3. 选择 "Deploy from GitHub repo"
4. 选择你的仓库
5. 添加环境变量：
   - `PORT = 3001`
6. 点击 Deploy

**方法 B: 直接部署 server 目录**

1. 在 Railway 控制台点击 "New Project"
2. 选择 "Empty Project"
3. 点击 "Add Service" → "GitHub Repo"
4. 选择仓库，设置 Root Directory 为 `server`
5. 添加环境变量 `PORT = 3001`
6. 点击 Deploy

### 1.4 获取后端地址

部署完成后：
1. 点击服务名称进入详情
2. 在 "Settings" → "Domains" 中找到 URL
3. 格式类似：`https://sui-pixel-server.up.railway.app`
4. **复制这个 URL，下一步需要用到**

---

## 第二步：配置前端服务器地址

### 2.1 修改 main.js

打开 `client/src/main.js`，找到 `initSocket()` 函数：

```javascript
// 生产环境配置 - 修改这里为你的后端服务器地址
const PRODUCTION_SERVER_URL = 'https://sui-pixel-server.up.railway.app'
```

将 `https://sui-pixel-server.up.railway.app` 替换为你从 Railway 获取的实际地址。

### 2.2 构建前端

```bash
cd client
npm install
npm run build
```

构建完成后会生成 `client/dist/` 目录。

---

## 第三步：部署前端到 Vercel

### 3.1 注册 Vercel 账号

1. 访问 https://vercel.com
2. 使用 GitHub 账号登录

### 3.2 导入项目

1. 点击 "Add New Project"
2. 导入 `gz-pixel-canvas` 仓库
3. 配置：
   - **Framework Preset**: Vite
   - **Root Directory**: `client`
   - **Build Command**: `npm run build`
   - **Output Directory**: `dist`
4. 点击 Deploy

### 3.3 获取访问链接

部署完成后，Vercel 会提供一个 `.vercel.app` 结尾的链接，例如：
```
https://sui-pixel.vercel.app
```

**这就是你可以分享给所有人的链接！**

---

## 第四步：验证部署

### 4.1 测试后端

访问你的 Railway 地址：
```
https://your-server.up.railway.app/health
```

应该返回：
```json
{
  "status": "ok",
  "users": 0,
  "pixels": 0,
  "uptime": 123
}
```

### 4.2 测试前端

1. 打开 Vercel 提供的链接
2. 打开浏览器开发者工具 (F12)
3. 查看 Console，应该看到：
   - `✅ 地图初始化完成`
   - `🔄 正在连接服务器: https://...`
   - `✅ 已连接到服务器`

### 4.3 测试多人联机

1. 用浏览器 A 打开网站，绘制一些像素
2. 用浏览器 B (隐身模式) 打开同一链接
3. 验证浏览器 B 能看到浏览器 A 绘制的像素
4. 验证实时同步功能

---

## 故障排除

### 问题：前端无法连接后端

**症状**: Console 显示连接错误或超时

**解决**:
1. 检查 Railway 服务是否运行中
2. 确认 `main.js` 中的 `PRODUCTION_SERVER_URL` 是否正确
3. 检查 Railway 的 CORS 设置
4. 查看 Railway 日志排查错误

### 问题：像素无法显示

**症状**: 绘制后看不到像素

**解决**:
1. 检查是否处于绘制模式 (不是拖拽模式)
2. 查看 Console 是否有 JavaScript 错误
3. 检查网格是否可见 (帮助定位)

### 问题：Socket.io 连接失败

**症状**: 一直显示 "正在连接服务器"

**解决**:
1. 确认后端地址正确
2. 检查 Railway 的防火墙设置
3. 确认 `transports: ['websocket', 'polling']` 配置正确

---

## 自定义域名 (可选)

### Vercel 自定义域名

1. 在 Vercel 项目设置中找到 "Domains"
2. 添加你的域名
3. 按提示配置 DNS

### Railway 自定义域名

1. 在 Railway 服务设置中找到 "Domains"
2. 添加你的域名
3. 按提示配置 DNS

---

## 环境变量参考

### 后端 (Railway)

| 变量名 | 值 | 说明 |
|--------|-----|------|
| PORT | 3001 | 服务器端口 |
| NODE_ENV | production | 环境模式 |

### 前端 (Vercel)

无需特殊环境变量，服务器地址在代码中配置。

---

## 免费额度说明

### Vercel (Hobby 计划)
- 带宽: 100GB/月
- 构建: 6000分钟/月
- 足够小型项目使用

### Railway (免费计划)
- 运行时间: 500小时/月
- 内存: 512MB
- 磁盘: 1GB
- **注意**: 免费计划有休眠机制，长时间无访问会休眠，首次访问需要唤醒时间 (约10-30秒)

---

## 更新部署

### 更新后端

1. 修改 `server/index.js`
2. 提交到 GitHub
3. Railway 会自动重新部署

### 更新前端

1. 修改前端代码
2. 提交到 GitHub
3. Vercel 会自动重新构建和部署

---

## 安全建议

1. **限制 CORS**: 生产环境应该限制 `origin` 为你的前端域名
2. **添加速率限制**: 防止恶意刷像素
3. **数据持久化**: 目前使用内存存储，重启后数据丢失。如需持久化，可添加 Redis 或数据库
4. **HTTPS**: 确保使用 HTTPS，WebSocket 需要 wss://

---

## 联系方式

如有问题，请查看：
- Railway 文档: https://docs.railway.app
- Vercel 文档: https://vercel.com/docs
- Socket.io 文档: https://socket.io/docs

---

**祝你部署顺利！🎨**
