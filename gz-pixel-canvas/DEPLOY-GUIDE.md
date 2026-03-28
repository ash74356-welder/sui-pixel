# 穗绘像素 - 部署操作指南

## 项目信息

- **GitHub 仓库**: https://github.com/ash74356-welder/sui-pixel
- **项目结构**:
  ```
  sui-pixel/
  ├── client/          # 前端 (Vite + Leaflet)
  ├── server/          # 后端 (Socket.io)
  ├── railway.toml     # Railway 配置
  ├── vercel.json      # Vercel 配置
  └── DEPLOY.md        # 部署文档
  ```

---

## 第一步：部署后端到 Railway

### 1.1 访问 Railway

1. 打开浏览器访问: https://railway.app
2. 点击 "Sign in with GitHub" 使用你的 GitHub 账号登录

### 1.2 创建新项目

1. 登录后点击 "New Project" 按钮
2. 选择 "Deploy from GitHub repo"
3. 在列表中找到并选择 `ash74356-welder/sui-pixel` 仓库
4. 点击 "Add Variables" 添加环境变量:
   - 点击 "New Variable"
   - Name: `PORT`
   - Value: `3001`
   - 点击 "Add"
5. 点击 "Deploy" 开始部署

### 1.3 配置部署选项

1. 部署开始后，点击服务名称（默认是 "sui-pixel"）
2. 进入 "Settings" 标签
3. 找到 "Root Directory" 设置
4. 输入: `server`
5. 点击 "Save"

### 1.4 获取后端地址

1. 等待部署完成（约 2-3 分钟，显示绿点表示成功）
2. 点击 "Settings" → "Domains"
3. 你会看到一个类似 `https://sui-pixel-production-xxx.up.railway.app` 的 URL
4. **复制这个 URL，下一步需要用到**

### 1.5 验证后端运行

在浏览器中访问:
```
https://你的-railway-url.up.railway.app/health
```

应该返回:
```json
{
  "status": "ok",
  "users": 0,
  "pixels": 0,
  "uptime": 123
}
```

---

## 第二步：更新前端配置

### 2.1 修改 main.js

1. 打开项目文件: `client/src/main.js`
2. 找到第 1605 行:
   ```javascript
   const PRODUCTION_SERVER_URL = 'https://sui-pixel-server.up.railway.app'
   ```
3. 将其中的 URL 替换为你从 Railway 复制的实际地址
4. 保存文件

### 2.2 提交更改

在终端中运行:
```bash
cd c:\Users\10276\Desktop\trae0328\gz-pixel-canvas
git add client/src/main.js
git commit -m "更新生产环境服务器地址"
git push origin main
```

---

## 第三步：部署前端到 Vercel

### 3.1 访问 Vercel

1. 打开浏览器访问: https://vercel.com
2. 点击 "Sign in with GitHub" 使用你的 GitHub 账号登录

### 3.2 导入项目

1. 登录后点击 "Add New Project"
2. 在 "Import Git Repository" 部分找到 `ash74356-welder/sui-pixel`
3. 点击 "Import"

### 3.3 配置构建设置

在配置页面填写:

- **Framework Preset**: 选择 `Vite`
- **Root Directory**: 输入 `client`
- **Build Command**: 保持默认 `npm run build`
- **Output Directory**: 保持默认 `dist`

点击 "Deploy"

### 3.4 等待部署完成

- 部署过程约 1-2 分钟
- 成功后会出现 "Congratulations!" 页面
- **复制生成的域名，这就是你的分享链接！**

---

## 第四步：验证部署

### 4.1 测试网站访问

1. 打开 Vercel 提供的链接（如 `https://sui-pixel-xxx.vercel.app`）
2. 按 F12 打开开发者工具 → Console 标签
3. 检查输出信息:
   - ✅ 地图初始化完成
   - 🔄 正在连接服务器: https://...
   - ✅ 已连接到服务器

### 4.2 测试绘制功能

1. 确保处于 "绘制模式"（不是拖拽模式）
2. 在地图上点击绘制几个像素
3. 确认像素正常显示

### 4.3 测试多人联机

1. 用 Chrome 正常窗口打开网站
2. 用 Chrome 隐身模式（Ctrl+Shift+N）打开同一链接
3. 在窗口 A 绘制像素
4. 确认窗口 B 实时显示新绘制的像素

---

## 分享你的作品

部署完成后，你可以将 Vercel 链接分享给朋友们：

```
🎨 穗绘像素 - 广州地图多人协作像素画布
🔗 https://你的项目.vercel.app

一起来创作吧！
```

---

## 故障排除

### 问题 1: 前端显示 "连接服务器失败"

**原因**: 前端无法连接到 Railway 后端

**解决**:
1. 检查 Railway 服务是否运行中（显示绿点）
2. 确认 `main.js` 中的 `PRODUCTION_SERVER_URL` 是否正确
3. 确认 URL 包含 `https://` 前缀
4. 检查 Railway 日志是否有错误

### 问题 2: 像素绘制后不显示

**原因**: 可能处于拖拽模式，或有 JavaScript 错误

**解决**:
1. 确认工具栏显示 "绘制模式"（不是 "拖拽模式"）
2. 按 F12 打开 Console 查看是否有红色错误信息
3. 尝试刷新页面

### 问题 3: 多人联机不同步

**原因**: Socket.io 连接问题

**解决**:
1. 检查 Railway 的 CORS 设置（已配置为 `*` 允许所有域名）
2. 确认使用的是 WebSocket 或 Polling 传输
3. 查看 Railway 日志中的连接记录

### 问题 4: Railway 服务休眠

**原因**: Railway 免费计划长时间无访问会休眠

**解决**:
- 首次访问可能需要 10-30 秒唤醒时间
- 可以设置定时 ping 保持活跃（可选）

---

## 重要提示

1. **免费额度**:
   - Railway: 500小时/月运行时间
   - Vercel: 100GB/月带宽

2. **数据存储**:
   - 目前使用内存存储，服务器重启后像素数据会丢失
   - 如需持久化，后续可添加 Redis 或数据库

3. **自定义域名**（可选）:
   - Vercel: 项目设置 → Domains → 添加你的域名
   - Railway: 服务设置 → Domains → 添加你的域名

---

## 更新部署

### 更新后端

1. 修改 `server/index.js`
2. 提交到 GitHub: `git push origin main`
3. Railway 会自动重新部署

### 更新前端

1. 修改前端代码
2. 提交到 GitHub: `git push origin main`
3. Vercel 会自动重新构建和部署

---

**祝你部署顺利！🎉**

如有问题，请查看:
- Railway 文档: https://docs.railway.app
- Vercel 文档: https://vercel.com/docs
