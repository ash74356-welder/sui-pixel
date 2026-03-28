// 穗绘像素 - Socket.io 服务器
const { createServer } = require('http')
const { Server } = require('socket.io')

// 创建 HTTP 服务器
const httpServer = createServer((req, res) => {
  // 设置 CORS 头
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type')

  if (req.method === 'OPTIONS') {
    res.writeHead(200)
    res.end()
    return
  }

  // 健康检查端点 - Railway 使用
  if (req.url === '/health' || req.url === '/api/health') {
    res.writeHead(200, { 'Content-Type': 'application/json' })
    res.end(JSON.stringify({
      status: 'ok',
      users: io.engine.clientsCount,
      pixels: pixels.size,
      uptime: process.uptime()
    }))
    return
  }

  // 获取像素数据端点
  if (req.url === '/api/pixels') {
    res.writeHead(200, { 'Content-Type': 'application/json' })
    res.end(JSON.stringify({
      pixels: Array.from(pixels.values()),
      count: pixels.size
    }))
    return
  }

  // 根路径
  if (req.url === '/') {
    res.writeHead(200, { 'Content-Type': 'application/json' })
    res.end(JSON.stringify({
      name: '穗绘像素服务器',
      version: '1.0.0',
      status: 'running',
      pixels: pixels.size,
      onlineUsers: io.engine.clientsCount
    }))
    return
  }

  res.writeHead(404)
  res.end('Not Found')
})

// 创建 Socket.io 服务器
const io = new Server(httpServer, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST']
  },
  transports: ['websocket', 'polling']
})

// 存储像素数据（内存存储，重启后丢失）
const pixels = new Map()
const users = new Map()

// 最大像素数量限制
const MAX_PIXELS = 100000

// Socket.io 连接处理
io.on('connection', (socket) => {
  console.log(`👤 用户连接: ${socket.id}`)

  // 生成用户信息
  const user = {
    id: socket.id,
    ip: socket.handshake.address,
    connectedAt: Date.now()
  }
  users.set(socket.id, user)

  // 发送当前所有像素给新用户
  socket.emit('pixels:init', {
    pixels: Array.from(pixels.values()),
    count: pixels.size,
    onlineUsers: users.size
  })

  // 广播用户加入
  socket.broadcast.emit('user:join', {
    userId: socket.id,
    onlineUsers: users.size
  })

  // 处理绘制像素
  socket.on('pixel:draw', (data) => {
    try {
      // 验证数据
      if (!data || !data.gridX === undefined || !data.gridY === undefined) {
        return
      }

      const key = `${data.gridX},${data.gridY}`

      // 检查像素数量限制
      if (!pixels.has(key) && pixels.size >= MAX_PIXELS) {
        socket.emit('error', { message: '画布已满，无法添加更多像素' })
        return
      }

      // 保存像素
      const pixelData = {
        ...data,
        userId: socket.id,
        timestamp: Date.now()
      }
      pixels.set(key, pixelData)

      // 广播给其他用户
      socket.broadcast.emit('pixel:draw', pixelData)

      console.log(`🎨 用户 ${socket.id} 绘制像素: ${key}`)
    } catch (error) {
      console.error('绘制像素错误:', error)
    }
  })

  // 处理批量绘制（导入图片/文字）
  socket.on('pixels:draw-batch', (dataList) => {
    try {
      if (!Array.isArray(dataList) || dataList.length === 0) return

      const validPixels = []

      for (const data of dataList) {
        if (!data || data.gridX === undefined || data.gridY === undefined) continue

        const key = `${data.gridX},${data.gridY}`

        // 检查限制
        if (!pixels.has(key) && pixels.size >= MAX_PIXELS) {
          break
        }

        const pixelData = {
          ...data,
          userId: socket.id,
          timestamp: Date.now()
        }
        pixels.set(key, pixelData)
        validPixels.push(pixelData)
      }

      // 批量广播
      if (validPixels.length > 0) {
        socket.broadcast.emit('pixels:draw-batch', validPixels)
        console.log(`🎨 用户 ${socket.id} 批量绘制 ${validPixels.length} 个像素`)
      }
    } catch (error) {
      console.error('批量绘制错误:', error)
    }
  })

  // 处理擦除像素
  socket.on('pixel:erase', (data) => {
    try {
      const key = `${data.gridX},${data.gridY}`

      if (pixels.has(key)) {
        pixels.delete(key)
        socket.broadcast.emit('pixel:erase', data)
        console.log(`🧼 用户 ${socket.id} 擦除像素: ${key}`)
      }
    } catch (error) {
      console.error('擦除像素错误:', error)
    }
  })

  // 处理批量擦除（框选删除）
  socket.on('pixel:erase-batch', (bounds) => {
    try {
      const { minLng, maxLng, minLat, maxLat } = bounds
      const deletedKeys = []

      pixels.forEach((pixel, key) => {
        if (pixel.lng >= minLng && pixel.lng <= maxLng &&
            pixel.lat >= minLat && pixel.lat <= maxLat) {
          pixels.delete(key)
          deletedKeys.push({ gridX: pixel.gridX, gridY: pixel.gridY })
        }
      })

      if (deletedKeys.length > 0) {
        socket.broadcast.emit('pixel:erase-batch', deletedKeys)
        console.log(`🧼 用户 ${socket.id} 批量擦除 ${deletedKeys.length} 个像素`)
      }
    } catch (error) {
      console.error('批量擦除错误:', error)
    }
  })

  // 处理视口变化（用于优化，只发送可见区域的像素）
  socket.on('viewport:change', (bounds) => {
    // 可以在这里实现只发送视口内像素的功能
    // 目前简化处理，已在连接时发送所有像素
  })

  // 用户断开连接
  socket.on('disconnect', () => {
    console.log(`👋 用户断开: ${socket.id}`)
    users.delete(socket.id)

    // 广播用户离开
    socket.broadcast.emit('user:leave', {
      userId: socket.id,
      onlineUsers: users.size
    })
  })
})

// 定期清理（可选：清理超过24小时的像素）
setInterval(() => {
  const now = Date.now()
  const ONE_DAY = 24 * 60 * 60 * 1000

  let cleaned = 0
  pixels.forEach((pixel, key) => {
    if (now - pixel.timestamp > ONE_DAY) {
      pixels.delete(key)
      cleaned++
    }
  })

  if (cleaned > 0) {
    console.log(`🧹 清理了 ${cleaned} 个过期像素`)
  }
}, 60 * 60 * 1000) // 每小时清理一次

// 启动服务器
const PORT = process.env.PORT || 3001

httpServer.listen(PORT, () => {
  console.log(`🚀 穗绘像素服务器运行在端口 ${PORT}`)
  console.log(`📊 当前像素数量: ${pixels.size}`)
})

// 导出用于测试
module.exports = { httpServer, io, pixels, users }
