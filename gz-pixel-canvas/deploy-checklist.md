# 穗绘像素 - 部署检查清单

## 部署前准备

- [ ] 1. 注册 GitHub 账号 (https://github.com)
- [ ] 2. 注册 Railway 账号 (https://railway.app) - 使用 GitHub 登录
- [ ] 3. 注册 Vercel 账号 (https://vercel.com) - 使用 GitHub 登录
- [ ] 4. 将代码推送到 GitHub 仓库

## 第一步：部署后端 (Railway)

- [ ] 1. 登录 Railway 控制台
- [ ] 2. 点击 "New Project"
- [ ] 3. 选择 "Deploy from GitHub repo"
- [ ] 4. 选择 `gz-pixel-canvas` 仓库
- [ ] 5. 添加环境变量:
  - `PORT = 3001`
- [ ] 6. 设置 Root Directory 为 `server` (如果整个仓库导入)
- [ ] 7. 点击 Deploy
- [ ] 8. 等待部署完成 (约 2-3 分钟)
- [ ] 9. 获取域名: Settings → Domains → 复制 URL
- [ ] 10. 测试: 访问 `https://your-url.up.railway.app/health`

## 第二步：更新前端配置

- [ ] 1. 打开 `client/src/main.js`
- [ ] 2. 找到 `PRODUCTION_SERVER_URL`
- [ ] 3. 将 `'https://sui-pixel-server.up.railway.app'` 替换为你的 Railway URL
- [ ] 4. 保存文件
- [ ] 5. 提交并推送到 GitHub:
  ```bash
  git add .
  git commit -m "更新生产环境服务器地址"
  git push
  ```

## 第三步：部署前端 (Vercel)

- [ ] 1. 登录 Vercel 控制台
- [ ] 2. 点击 "Add New Project"
- [ ] 3. 导入 `gz-pixel-canvas` 仓库
- [ ] 4. 配置项目:
  - Framework Preset: **Vite**
  - Root Directory: **client**
  - Build Command: `npm run build`
  - Output Directory: `dist`
- [ ] 5. 点击 Deploy
- [ ] 6. 等待构建完成 (约 1-2 分钟)
- [ ] 7. 获取链接: 类似 `https://sui-pixel.vercel.app`

## 第四步：验证部署

- [ ] 1. 打开 Vercel 链接
- [ ] 2. 按 F12 打开开发者工具 → Console
- [ ] 3. 检查输出:
  - [ ] `✅ 地图初始化完成`
  - [ ] `🔄 正在连接服务器: https://...`
  - [ ] `✅ 已连接到服务器`
- [ ] 4. 测试绘制功能:
  - [ ] 切换到绘制模式
  - [ ] 在地图上点击绘制像素
  - [ ] 确认像素显示正常
- [ ] 5. 测试多人联机:
  - [ ] 用 Chrome 正常窗口打开网站
  - [ ] 用 Chrome 隐身窗口打开同一链接
  - [ ] 在窗口 A 绘制，确认窗口 B 实时显示

## 分享链接

你的分享链接是:
```
https://your-project.vercel.app
```

将这个链接发送给朋友们，大家就可以一起绘制了！

## 故障排查

如果部署遇到问题，请检查:

1. **后端连接失败**
   - Railway 服务是否运行中?
   - `main.js` 中的 URL 是否正确?
   - 是否包含 `https://` 前缀?

2. **像素无法显示**
   - 是否处于"绘制"模式而非"拖拽"模式?
   - 浏览器 Console 是否有错误?

3. **Socket.io 连接问题**
   - 检查 Railway 日志
   - 确认 CORS 配置正确
   - 尝试刷新页面

## 恭喜部署完成! 🎉

现在你可以:
- 分享链接给朋友们
- 一起在广州地图上创作像素艺术
- 实时看到其他人的绘制

---

**最后更新时间**: 2026-03-28
