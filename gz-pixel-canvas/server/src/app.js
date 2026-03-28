const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const dotenv = require('dotenv');

// 加载环境变量
dotenv.config();

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"]
  }
});

// 中间件
app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// 静态文件
app.use('/uploads', express.static('uploads'));

// 路由
app.get('/', (req, res) => {
  res.json({ message: '广州像素画布 API 服务运行中' });
});

// 健康检查
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Socket.io 连接处理
io.on('connection', (socket) => {
  console.log('用户连接:', socket.id);
  
  // 获取用户 IP
  const ip = socket.handshake.headers['x-forwarded-for'] || 
             socket.handshake.address || 
             'unknown';
  
  console.log('用户 IP:', ip);
  
  // 发送用户标识
  socket.emit('user:identified', {
    id: socket.id,
    ip: ip.replace(/^.*:/, '').substring(0, 15),
    displayName: `用户 ${ip.replace(/^.*:/, '').split('.').pop() || Math.floor(Math.random() * 1000)}`
  });
  
  // 监听绘制事件
  socket.on('pixel:draw', (data) => {
    console.log('绘制像素:', data);
    // 广播给所有客户端
    io.emit('pixel:drawn', {
      ...data,
      authorId: socket.id,
      timestamp: Date.now()
    });
  });
  
  // 监听擦除事件
  socket.on('pixel:erase', (data) => {
    console.log('擦除像素:', data);
    io.emit('pixel:erased', {
      ...data,
      timestamp: Date.now()
    });
  });
  
  // 断开连接
  socket.on('disconnect', () => {
    console.log('用户断开:', socket.id);
  });
});

// 启动服务器
const PORT = process.env.PORT || 3001;
server.listen(PORT, () => {
  console.log(`🚀 服务器运行在端口 ${PORT}`);
  console.log(`📍 API: http://localhost:${PORT}`);
});

module.exports = { app, server, io };
