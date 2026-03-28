# 穗绘像素 (Sui Pixel)

基于广州地图的协作式像素画布，让创意在羊城的每个角落绽放。

![穗绘像素](https://img.shields.io/badge/穗绘像素-v1.0.0-blue)
![License](https://img.shields.io/badge/license-MIT-green)

## 功能特性

🎨 **像素与地理的完美融合**
- 每个像素都对应真实的地理坐标
- 在珠江新城画一颗爱心，在白云山绘一片云彩

👥 **多人实时协作**
- 无需注册，打开即画
- 与陌生人共同完成一幅巨作
- 后绘制的像素覆盖前者，画布永远新鲜

🖼️ **丰富的创作工具**
- 自由画笔、直线、圆形、星形一键绘制
- 图片/文字一键转像素，轻松导入创意
- 100x100像素限制，恰到好处不占地

🗺️ **轻量化地图体验**
- 彩色Voyager地图，清晰不灰暗
- 网格辅助对齐，像素精准定位

## 技术栈

- **前端**: HTML5 Canvas + Leaflet.js + Socket.io-client
- **后端**: Node.js + Express + Socket.io
- **部署**: Vercel (前端) + Railway/Render (后端)

## 本地开发

### 1. 克隆项目

```bash
git clone https://github.com/yourusername/sui-pixel.git
cd sui-pixel
```

### 2. 安装依赖

```bash
npm run install:all
```

### 3. 启动开发服务器

```bash
npm run dev
```

- 前端: http://localhost:3000
- 后端: http://localhost:3001

## 部署到 Vercel

### 前端部署

```bash
cd client
vercel --prod
```

### 后端部署

推荐使用 Railway 或 Render 部署后端：

**Railway:**
```bash
cd server
railway login
railway init
railway up
```

**Render:**
1. 在 Render 创建新的 Web Service
2. 选择 `server` 目录
3. 设置启动命令: `npm start`
4. 部署

### 更新前端 API 地址

修改 `client/src/main.js` 中的服务器地址：

```javascript
const serverUrl = 'https://your-backend-url.railway.app'
```

## 项目结构

```
sui-pixel/
├── client/                 # 前端代码
│   ├── src/
│   │   ├── main.js        # 主入口
│   │   └── pixel-converter.js  # 像素转换器
│   ├── index.html
│   └── package.json
├── server/                # 后端代码
│   ├── index.js          # Socket.io 服务器
│   └── package.json
├── vercel.json           # Vercel 配置
├── package.json
└── README.md
```

## 使用说明

1. **绘制像素**: 选择画笔工具，在地图上点击或拖动
2. **切换工具**: 使用底部工具栏切换画笔/橡皮擦/图形工具
3. **导入图片**: 点击 🖼️ 按钮，上传图片转为像素画
4. **导入文字**: 点击 🔤 按钮，输入文字转为像素画
5. **多人协作**: 分享链接给朋友，一起创作

## 核心亮点

- 🚀 轻量级，无需安装，浏览器即开即画
- 🌐 基于真实地图，创作有意义
- 👥 实时协作，多人同时创作
- 💾 自动保存，数据不丢失
- 📱 响应式设计，支持移动端

## 使用场景

- 💝 城市表白：在特定地点绘制爱心
- 🎓 集体创作：班级/团队共同完成作品
- 🎨 数字艺术：像素艺术创作与展示
- 📍 活动打卡：线下活动线上互动

## 未来规划

- [ ] 多城市支持（北京、上海、深圳...）
- [ ] 用户系统与作品保存
- [ ] 像素交易市场
- [ ] AR 实景叠加

## 贡献

欢迎提交 Issue 和 Pull Request！

## 许可证

MIT License

---

**穗绘像素，让创意在城市中生长。**
