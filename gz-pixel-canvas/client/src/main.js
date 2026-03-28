// 广州像素画布 - 主入口文件
import L from 'leaflet'
import { io } from 'socket.io-client'
import {
  imageToPixels,
  textToPixels,
  pixelsToGrid,
  previewPixels
} from './pixel-converter.js'

// 全局状态
const state = {
  map: null,
  canvasLayer: null,
  gridLayer: null,
  socket: null,
  user: null,
  currentTool: 'draw',
  currentColor: '#ff0000',
  isDrawing: false,
  pixels: new Map(),
  onlineUsers: new Map(),
  pixelCount: 0,
  isPixelLayerVisible: true,
  isGridVisible: false,
  pixelDisplayThreshold: 50000,
  cooldown: 0,
  // 测试模式 - 关闭冷却
  testMode: true,
  // 交互模式: 'draw' = 绘制模式, 'pan' = 拖拽模式
  interactionMode: 'draw',
  // 框选状态
  isSelecting: false,
  selectionStart: null,
  selectionEnd: null,
  // 图形绘制状态
  shapeStart: null,
  isDrawingShape: false,
  // 导入对话框状态
  importData: null,
  importType: null
}

// 像素大小配置 - 固定为1个网格单元
const PIXEL_SIZE = 1

// 网格精度
const GRID_PRECISION = 0.0001 // 约 10 米

// 计算网格单元在当前缩放级别下的屏幕像素大小
function getGridCellPixelSize() {
  const map = state.map
  if (!map) return 48 // 默认值

  // 取当前中心点附近的两个相邻网格点计算距离
  const center = map.getCenter()
  const lat = center.lat
  const lng = center.lng

  // 计算一个网格单元在屏幕上的宽度和高度
  const p1 = map.latLngToContainerPoint([lat, lng])
  const p2 = map.latLngToContainerPoint([lat, lng + GRID_PRECISION])
  const p3 = map.latLngToContainerPoint([lat + GRID_PRECISION, lng])

  const width = Math.max(1, Math.abs(p2.x - p1.x))
  const height = Math.max(1, Math.abs(p3.y - p1.y))

  // 使用较大的值确保填满
  return Math.max(width, height)
}

// 初始化地图
function initMap() {
  const guangzhouCenter = [23.1291, 113.2644]

  state.map = L.map('map', {
    center: guangzhouCenter,
    zoom: 13,
    minZoom: 10,
    maxZoom: 18,
    zoomControl: false,
    attributionControl: false
  })

  // 添加地图瓦片层 - 使用 Voyager 彩色主题
  L.tileLayer('https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png', {
    maxZoom: 19,
    attribution: '© OpenStreetMap © CARTO'
  }).addTo(state.map)

  // 创建 Canvas 叠加层
  initCanvasLayer()
  initGridLayer()

  // 监听地图移动事件
  state.map.on('move', () => {
    requestAnimationFrame(() => {
      updateCanvasPosition()
      drawGrid()
    })
  })

  // 监听鼠标移动显示坐标
  state.map.on('mousemove', (e) => {
    const lat = e.latlng.lat.toFixed(4)
    const lng = e.latlng.lng.toFixed(4)
    document.getElementById('coords-latlng').textContent = `${lat}, ${lng}`
  })

  console.log('✅ 地图初始化完成')
}

// 初始化 Canvas 叠加层 - 简单可靠的实现
function initCanvasLayer() {
  const mapContainer = document.getElementById('map')
  const canvas = document.createElement('canvas')
  canvas.className = 'pixel-canvas'
  canvas.id = 'pixel-canvas'

  // 设置 Canvas 大小为地图容器大小
  canvas.width = mapContainer.clientWidth
  canvas.height = mapContainer.clientHeight

  // 添加到地图容器
  mapContainer.appendChild(canvas)

  state.canvasLayer = {
    element: canvas,
    ctx: canvas.getContext('2d'),
    visible: true
  }

  // 绑定绘制事件
  bindDrawingEvents()

  console.log('✅ Canvas 层初始化完成')
}

// 初始化网格层
function initGridLayer() {
  const mapContainer = document.getElementById('map')
  const canvas = document.createElement('canvas')
  canvas.className = 'grid-canvas'
  canvas.id = 'grid-canvas'

  canvas.width = mapContainer.clientWidth
  canvas.height = mapContainer.clientHeight

  // 确保网格层在像素层之后添加，这样网格会在上方
  mapContainer.appendChild(canvas)

  state.gridLayer = {
    element: canvas,
    ctx: canvas.getContext('2d'),
    visible: false
  }

  console.log('✅ 网格层初始化完成')
}

// 绘制网格
function drawGrid() {
  if (!state.gridLayer || !state.isGridVisible) return

  const canvas = state.gridLayer.element
  const ctx = state.gridLayer.ctx
  const map = state.map

  // 清空画布
  ctx.clearRect(0, 0, canvas.width, canvas.height)

  // 获取当前视口的经纬度范围
  const bounds = map.getBounds()
  const northEast = bounds.getNorthEast()
  const southWest = bounds.getSouthWest()

  // 计算网格起点和终点
  const startLng = Math.floor(southWest.lng / GRID_PRECISION) * GRID_PRECISION
  const endLng = Math.ceil(northEast.lng / GRID_PRECISION) * GRID_PRECISION
  const startLat = Math.floor(southWest.lat / GRID_PRECISION) * GRID_PRECISION
  const endLat = Math.ceil(northEast.lat / GRID_PRECISION) * GRID_PRECISION

  // 绘制网格线 - 使用更明显的颜色
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.6)'
  ctx.lineWidth = 2

  // 垂直线
  for (let lng = startLng; lng <= endLng; lng += GRID_PRECISION) {
    const startPoint = map.latLngToContainerPoint([startLat, lng])
    const endPoint = map.latLngToContainerPoint([endLat, lng])

    ctx.beginPath()
    ctx.moveTo(startPoint.x, startPoint.y)
    ctx.lineTo(endPoint.x, endPoint.y)
    ctx.stroke()
  }

  // 水平线
  for (let lat = startLat; lat <= endLat; lat += GRID_PRECISION) {
    const startPoint = map.latLngToContainerPoint([lat, startLng])
    const endPoint = map.latLngToContainerPoint([lat, endLng])

    ctx.beginPath()
    ctx.moveTo(startPoint.x, startPoint.y)
    ctx.lineTo(endPoint.x, endPoint.y)
    ctx.stroke()
  }

  // 绘制网格交叉点
  ctx.fillStyle = 'rgba(255, 255, 255, 0.8)'
  for (let lng = startLng; lng <= endLng; lng += GRID_PRECISION) {
    for (let lat = startLat; lat <= endLat; lat += GRID_PRECISION) {
      const point = map.latLngToContainerPoint([lat, lng])
      ctx.beginPath()
      ctx.arc(point.x, point.y, 2, 0, Math.PI * 2)
      ctx.fill()
    }
  }
}

// 绑定绘制事件
function bindDrawingEvents() {
  const canvas = state.canvasLayer.element

  // 鼠标按下
  canvas.addEventListener('mousedown', (e) => {
    // 拖拽模式下：不拦截事件，让地图可以拖动
    if (state.interactionMode === 'pan') {
      return
    }

    // 绘制模式下才处理绘制/删除/图形工具
    // 橡皮擦模式下开始框选删除
    if (state.currentTool === 'erase') {
      e.preventDefault()
      e.stopPropagation()
      startSelection(e)
      return
    }

    // 图形工具模式下开始绘制图形
    if (['line', 'circle', 'star'].includes(state.currentTool)) {
      e.preventDefault()
      e.stopPropagation()
      startShapeDraw(e)
      return
    }

    // 绘制模式下阻止事件并绘制
    e.preventDefault()
    e.stopPropagation()
    if (!state.testMode && state.cooldown > 0) return
    state.isDrawing = true
    handleDraw(e)
  }, { capture: true })

  // 鼠标移动
  canvas.addEventListener('mousemove', (e) => {
    // 拖拽模式下不处理
    if (state.interactionMode === 'pan') {
      return
    }

    // 框选模式下更新框选
    if (state.isSelecting) {
      e.preventDefault()
      e.stopPropagation()
      updateSelection(e)
      return
    }

    // 图形绘制模式下更新预览
    if (state.isDrawingShape) {
      e.preventDefault()
      e.stopPropagation()
      updateShapePreview(e)
      return
    }

    // 绘制模式下绘制
    if (state.currentTool === 'draw') {
      e.preventDefault()
      e.stopPropagation()
      if (state.isDrawing && (state.testMode || state.cooldown === 0)) {
        handleDraw(e)
      }
    }
  }, { capture: true })

  // 鼠标释放
  canvas.addEventListener('mouseup', (e) => {
    // 拖拽模式下不处理
    if (state.interactionMode === 'pan') {
      return
    }

    // 结束框选
    if (state.isSelecting) {
      e.preventDefault()
      e.stopPropagation()
      endSelection()
      return
    }

    // 结束图形绘制
    if (state.isDrawingShape) {
      e.preventDefault()
      e.stopPropagation()
      endShapeDraw(e)
      return
    }

    // 绘制模式下
    if (state.currentTool === 'draw') {
      e.preventDefault()
      e.stopPropagation()
      state.isDrawing = false
    }
  }, { capture: true })

  canvas.addEventListener('mouseleave', (e) => {
    // 拖拽模式下不处理
    if (state.interactionMode === 'pan') {
      return
    }

    // 取消框选
    if (state.isSelecting) {
      cancelSelection()
      return
    }

    // 取消图形绘制
    if (state.isDrawingShape) {
      cancelShapeDraw()
      return
    }

    if (state.currentTool === 'draw') {
      e.preventDefault()
      e.stopPropagation()
      state.isDrawing = false
    }
  }, { capture: true })

  // 阻止 click 事件（绘制模式下）
  canvas.addEventListener('click', (e) => {
    if (state.interactionMode === 'draw' && state.currentTool === 'draw') {
      e.preventDefault()
      e.stopPropagation()
    }
  }, { capture: true })

  // 阻止拖拽事件
  canvas.addEventListener('dragstart', (e) => {
    e.preventDefault()
    e.stopPropagation()
  }, { capture: true })
}

// 开始框选
function startSelection(e) {
  const rect = state.canvasLayer.element.getBoundingClientRect()
  state.isSelecting = true
  state.selectionStart = {
    x: e.clientX - rect.left,
    y: e.clientY - rect.top
  }
  state.selectionEnd = { ...state.selectionStart }

  const selectionBox = document.getElementById('selection-box')
  selectionBox.classList.add('active')
  updateSelectionBox()
}

// 更新框选
function updateSelection(e) {
  if (!state.isSelecting) return

  const rect = state.canvasLayer.element.getBoundingClientRect()
  state.selectionEnd = {
    x: e.clientX - rect.left,
    y: e.clientY - rect.top
  }

  updateSelectionBox()
}

// 更新框选框显示
function updateSelectionBox() {
  const selectionBox = document.getElementById('selection-box')
  const start = state.selectionStart
  const end = state.selectionEnd

  const left = Math.min(start.x, end.x)
  const top = Math.min(start.y, end.y)
  const width = Math.abs(end.x - start.x)
  const height = Math.abs(end.y - start.y)

  selectionBox.style.left = left + 'px'
  selectionBox.style.top = top + 'px'
  selectionBox.style.width = width + 'px'
  selectionBox.style.height = height + 'px'
}

// 结束框选并删除像素
function endSelection() {
  if (!state.isSelecting) return

  const selectionBox = document.getElementById('selection-box')
  selectionBox.classList.remove('active')

  // 计算框选区域的地理范围
  const start = state.selectionStart
  const end = state.selectionEnd

  const left = Math.min(start.x, end.x)
  const top = Math.min(start.y, end.y)
  const right = Math.max(start.x, end.x)
  const bottom = Math.max(start.y, end.y)

  // 转换为经纬度
  const nw = state.map.containerPointToLatLng([left, top])
  const se = state.map.containerPointToLatLng([right, bottom])

  const minLng = Math.min(nw.lng, se.lng)
  const maxLng = Math.max(nw.lng, se.lng)
  const minLat = Math.min(nw.lat, se.lat)
  const maxLat = Math.max(nw.lat, se.lat)

  // 删除框选范围内的所有像素
  let deletedCount = 0
  state.pixels.forEach((pixel, key) => {
    if (pixel.lng >= minLng && pixel.lng <= maxLng &&
        pixel.lat >= minLat && pixel.lat <= maxLat) {
      state.pixels.delete(key)
      deletedCount++
    }
  })

  if (deletedCount > 0) {
    state.pixelCount = state.pixels.size
    updateCanvasPosition()
    updatePixelCount()
    console.log(`🧼 框选删除 ${deletedCount} 个像素`)

    // 发送到服务器
    if (state.socket) {
      state.socket.emit('pixel:erase-batch', {
        minLng, maxLng, minLat, maxLat
      })
    }
  }

  state.isSelecting = false
  state.selectionStart = null
  state.selectionEnd = null
}

// 取消框选
function cancelSelection() {
  const selectionBox = document.getElementById('selection-box')
  selectionBox.classList.remove('active')
  state.isSelecting = false
  state.selectionStart = null
  state.selectionEnd = null
}

// 开始图形绘制
function startShapeDraw(e) {
  const rect = state.canvasLayer.element.getBoundingClientRect()
  const x = e.clientX - rect.left
  const y = e.clientY - rect.top

  // 转换为网格坐标
  const point = state.map.containerPointToLatLng([x, y])
  const gridX = Math.floor(point.lng / GRID_PRECISION)
  const gridY = Math.floor(point.lat / GRID_PRECISION)

  state.isDrawingShape = true
  state.shapeStart = { gridX, gridY, x, y }
}

// 更新图形预览
function updateShapePreview(e) {
  if (!state.isDrawingShape) return

  const rect = state.canvasLayer.element.getBoundingClientRect()
  const x = e.clientX - rect.left
  const y = e.clientY - rect.top

  // 转换为网格坐标
  const point = state.map.containerPointToLatLng([x, y])
  const gridX = Math.floor(point.lng / GRID_PRECISION)
  const gridY = Math.floor(point.lat / GRID_PRECISION)

  // 重绘画布并显示预览
  updateCanvasPosition()
  drawShapePreview(state.shapeStart.gridX, state.shapeStart.gridY, gridX, gridY)
}

// 绘制图形预览
function drawShapePreview(startX, startY, endX, endY) {
  const ctx = state.canvasLayer.ctx
  const gridCellSize = getGridCellPixelSize()

  ctx.save()
  ctx.globalAlpha = 0.5
  ctx.fillStyle = state.currentColor

  let pixels = []

  switch (state.currentTool) {
    case 'line':
      pixels = drawLine(startX, startY, endX, endY)
      break
    case 'circle':
      const radius = Math.round(Math.sqrt(Math.pow(endX - startX, 2) + Math.pow(endY - startY, 2)))
      pixels = drawCircle(startX, startY, radius)
      break
    case 'star':
      const outerRadius = Math.round(Math.sqrt(Math.pow(endX - startX, 2) + Math.pow(endY - startY, 2)))
      const innerRadius = Math.round(outerRadius * 0.4)
      pixels = drawStar(startX, startY, outerRadius, innerRadius, 5)
      break
  }

  // 绘制预览像素
  pixels.forEach(({ gridX, gridY }) => {
    const lng = (gridX + 0.5) * GRID_PRECISION
    const lat = (gridY + 0.5) * GRID_PRECISION
    const point = state.map.latLngToContainerPoint([lat, lng])

    const x = Math.ceil(point.x - gridCellSize / 2)
    const y = Math.ceil(point.y - gridCellSize / 2)
    const w = Math.ceil(gridCellSize + 0.5)
    const h = Math.ceil(gridCellSize + 0.5)

    ctx.fillRect(x, y, w, h)
  })

  ctx.restore()
}

// 结束图形绘制
function endShapeDraw(e) {
  if (!state.isDrawingShape) return

  const rect = state.canvasLayer.element.getBoundingClientRect()
  const x = e.clientX - rect.left
  const y = e.clientY - rect.top

  // 转换为网格坐标
  const point = state.map.containerPointToLatLng([x, y])
  const endGridX = Math.floor(point.lng / GRID_PRECISION)
  const endGridY = Math.floor(point.lat / GRID_PRECISION)

  const startX = state.shapeStart.gridX
  const startY = state.shapeStart.gridY

  let pixels = []

  switch (state.currentTool) {
    case 'line':
      pixels = drawLine(startX, startY, endGridX, endGridY)
      console.log(`📏 绘制直线: (${startX}, ${startY}) -> (${endGridX}, ${endGridY}), ${pixels.length} 个像素`)
      break
    case 'circle':
      const radius = Math.round(Math.sqrt(Math.pow(endGridX - startX, 2) + Math.pow(endGridY - startY, 2)))
      pixels = drawCircle(startX, startY, radius)
      console.log(`⭕ 绘制圆形: 中心(${startX}, ${startY}), 半径${radius}, ${pixels.length} 个像素`)
      break
    case 'star':
      const outerRadius = Math.round(Math.sqrt(Math.pow(endGridX - startX, 2) + Math.pow(endGridY - startY, 2)))
      const innerRadius = Math.round(outerRadius * 0.4)
      pixels = drawStar(startX, startY, outerRadius, innerRadius, 5)
      console.log(`⭐ 绘制星形: 中心(${startX}, ${startY}), 外径${outerRadius}, ${pixels.length} 个像素`)
      break
  }

  // 批量绘制像素
  drawPixelsBatch(pixels)

  state.isDrawingShape = false
  state.shapeStart = null
}

// 取消图形绘制
function cancelShapeDraw() {
  state.isDrawingShape = false
  state.shapeStart = null
  updateCanvasPosition()
}

// 处理绘制
function handleDraw(e) {
  const rect = state.canvasLayer.element.getBoundingClientRect()
  const x = e.clientX - rect.left
  const y = e.clientY - rect.top

  // 转换为经纬度
  const point = state.map.containerPointToLatLng([x, y])

  // 对齐到网格
  const gridX = Math.floor(point.lng / GRID_PRECISION)
  const gridY = Math.floor(point.lat / GRID_PRECISION)

  // 计算网格中心点的经纬度
  const lng = (gridX + 0.5) * GRID_PRECISION
  const lat = (gridY + 0.5) * GRID_PRECISION

  // 检查是否已存在相同位置的像素
  const key = `${gridX},${gridY}`
  if (state.pixels.has(key)) {
    const existing = state.pixels.get(key)
    if (existing.color === state.currentColor) {
      return // 颜色和位置都相同，跳过
    }
  }

  const pixelData = {
    lat,
    lng,
    gridX,
    gridY,
    color: state.currentColor,
    size: PIXEL_SIZE,
    tool: state.currentTool,
    timestamp: Date.now()
  }

  // 绘制像素
  drawPixel(pixelData)

  // 发送到服务器
  if (state.socket) {
    state.socket.emit('pixel:draw', pixelData)
  }

  // 触发冷却（仅在非测试模式）
  if (!state.testMode) {
    startCooldown()
  }
}

// 绘制像素 - 像素大小与网格单元对齐
function drawPixel(data) {
  const { lat, lng, color } = data
  const ctx = state.canvasLayer.ctx

  // 转换为屏幕坐标
  const point = state.map.latLngToContainerPoint([lat, lng])

  // 计算网格单元的屏幕像素大小
  const gridCellSize = getGridCellPixelSize()

  // 绘制正方形像素 - 对齐到网格，使用 ceil 确保填满无间隙
  ctx.fillStyle = color
  const x = Math.ceil(point.x - gridCellSize / 2)
  const y = Math.ceil(point.y - gridCellSize / 2)
  const w = Math.ceil(gridCellSize + 0.5) // +0.5 确保填满
  const h = Math.ceil(gridCellSize + 0.5)

  ctx.fillRect(x, y, w, h)

  // 存储像素数据
  const key = `${data.gridX},${data.gridY}`
  state.pixels.set(key, data)
  state.pixelCount = state.pixels.size

  // 更新显示
  updatePixelCount()

  console.log(`🎨 绘制像素: ${key}, 颜色: ${color}, 大小: ${gridCellSize.toFixed(2)}px`)
}

// 擦除像素
function erasePixel(gridX, gridY) {
  const key = `${gridX},${gridY}`
  const pixel = state.pixels.get(key)
  if (!pixel) return

  state.pixels.delete(key)
  state.pixelCount = state.pixels.size

  // 重绘整个画布
  updateCanvasPosition()
  updatePixelCount()

  // 发送到服务器
  if (state.socket) {
    state.socket.emit('pixel:erase', { gridX, gridY })
  }
}

// 更新 Canvas 位置（重绘所有像素）
function updateCanvasPosition() {
  if (!state.isPixelLayerVisible) return

  const ctx = state.canvasLayer.ctx
  const canvas = state.canvasLayer.element

  // 清空画布
  ctx.clearRect(0, 0, canvas.width, canvas.height)

  // 计算网格单元的屏幕像素大小
  const gridCellSize = getGridCellPixelSize()

  // 重绘所有像素 - 像素大小与网格单元对齐
  state.pixels.forEach(pixel => {
    const point = state.map.latLngToContainerPoint([pixel.lat, pixel.lng])

    // 检查是否在视口内
    if (point.x < -gridCellSize || point.x > canvas.width + gridCellSize ||
        point.y < -gridCellSize || point.y > canvas.height + gridCellSize) {
      return
    }

    // 绘制像素 - 使用 ceil 确保填满无间隙
    ctx.fillStyle = pixel.color
    const x = Math.ceil(point.x - gridCellSize / 2)
    const y = Math.ceil(point.y - gridCellSize / 2)
    const w = Math.ceil(gridCellSize + 0.5)
    const h = Math.ceil(gridCellSize + 0.5)

    ctx.fillRect(x, y, w, h)
  })
}

// 绘制直线
function drawLine(startGridX, startGridY, endGridX, endGridY) {
  const pixels = []

  // 使用 Bresenham 算法绘制直线
  let x0 = startGridX
  let y0 = startGridY
  let x1 = endGridX
  let y1 = endGridY

  const dx = Math.abs(x1 - x0)
  const dy = Math.abs(y1 - y0)
  const sx = x0 < x1 ? 1 : -1
  const sy = y0 < y1 ? 1 : -1
  let err = dx - dy

  while (true) {
    pixels.push({ gridX: x0, gridY: y0 })

    if (x0 === x1 && y0 === y1) break

    const e2 = 2 * err
    if (e2 > -dy) {
      err -= dy
      x0 += sx
    }
    if (e2 < dx) {
      err += dx
      y0 += sy
    }
  }

  return pixels
}

// 绘制圆形
function drawCircle(centerGridX, centerGridY, radius) {
  const pixels = []

  // 使用 Bresenham 算法绘制圆形
  let x = 0
  let y = radius
  let d = 3 - 2 * radius

  while (y >= x) {
    // 添加八个对称点
    addCirclePoints(pixels, centerGridX, centerGridY, x, y)

    x++
    if (d > 0) {
      y--
      d = d + 4 * (x - y) + 10
    } else {
      d = d + 4 * x + 6
    }
  }

  return pixels
}

// 添加圆形的对称点
function addCirclePoints(pixels, cx, cy, x, y) {
  const points = [
    { gridX: cx + x, gridY: cy + y },
    { gridX: cx - x, gridY: cy + y },
    { gridX: cx + x, gridY: cy - y },
    { gridX: cx - x, gridY: cy - y },
    { gridX: cx + y, gridY: cy + x },
    { gridX: cx - y, gridY: cy + x },
    { gridX: cx + y, gridY: cy - x },
    { gridX: cx - y, gridY: cy - x }
  ]

  points.forEach(p => {
    // 去重
    if (!pixels.some(existing => existing.gridX === p.gridX && existing.gridY === p.gridY)) {
      pixels.push(p)
    }
  })
}

// 绘制星形
function drawStar(centerGridX, centerGridY, outerRadius, innerRadius, points = 5) {
  const pixels = []
  const angleStep = Math.PI / points

  for (let i = 0; i < 2 * points; i++) {
    const radius = i % 2 === 0 ? outerRadius : innerRadius
    const angle = i * angleStep - Math.PI / 2

    const x = Math.round(centerGridX + radius * Math.cos(angle))
    const y = Math.round(centerGridY + radius * Math.sin(angle))

    // 连接到下一个点
    const nextI = (i + 1) % (2 * points)
    const nextRadius = nextI % 2 === 0 ? outerRadius : innerRadius
    const nextAngle = nextI * angleStep - Math.PI / 2
    const nextX = Math.round(centerGridX + nextRadius * Math.cos(nextAngle))
    const nextY = Math.round(centerGridY + nextRadius * Math.sin(nextAngle))

    // 绘制两点之间的直线
    const linePixels = drawLine(x, y, nextX, nextY)
    linePixels.forEach(p => {
      if (!pixels.some(existing => existing.gridX === p.gridX && existing.gridY === p.gridY)) {
        pixels.push(p)
      }
    })
  }

  return pixels
}

// 批量绘制像素
function drawPixelsBatch(pixels) {
  // 准备批量数据
  const pixelDataList = pixels.map(({ gridX, gridY }) => {
    const lng = (gridX + 0.5) * GRID_PRECISION
    const lat = (gridY + 0.5) * GRID_PRECISION

    return {
      lat,
      lng,
      gridX,
      gridY,
      color: state.currentColor,
      size: PIXEL_SIZE,
      tool: 'draw',
      timestamp: Date.now()
    }
  })

  // 本地绘制
  pixelDataList.forEach(pixelData => {
    drawPixel(pixelData)
  })

  // 批量发送到服务器
  if (state.socket && state.socket.connected) {
    state.socket.emit('pixels:draw-batch', pixelDataList)
  }
}

// 初始化颜色选择器
function initColorPicker() {
  const colorWheel = document.getElementById('color-wheel')
  const rInput = document.getElementById('rgb-r')
  const gInput = document.getElementById('rgb-g')
  const bInput = document.getElementById('rgb-b')
  const hexDisplay = document.getElementById('color-hex')
  const applyBtn = document.getElementById('apply-color')

  if (!colorWheel) return

  const ctx = colorWheel.getContext('2d')
  const centerX = colorWheel.width / 2
  const centerY = colorWheel.height / 2
  const radius = colorWheel.width / 2 - 5

  // 绘制色轮
  function drawColorWheel() {
    for (let angle = 0; angle < 360; angle++) {
      const startAngle = (angle - 1) * Math.PI / 180
      const endAngle = angle * Math.PI / 180

      ctx.beginPath()
      ctx.moveTo(centerX, centerY)
      ctx.arc(centerX, centerY, radius, startAngle, endAngle)
      ctx.closePath()
      ctx.fillStyle = `hsl(${angle}, 100%, 50%)`
      ctx.fill()
    }

    // 绘制中心白色到透明的渐变
    const gradient = ctx.createRadialGradient(centerX, centerY, 0, centerX, centerY, radius)
    gradient.addColorStop(0, 'rgba(255, 255, 255, 1)')
    gradient.addColorStop(1, 'rgba(255, 255, 255, 0)')
    ctx.fillStyle = gradient
    ctx.beginPath()
    ctx.arc(centerX, centerY, radius, 0, Math.PI * 2)
    ctx.fill()
  }

  drawColorWheel()

  // 从色轮选择颜色
  let isPicking = false

  function pickColor(e) {
    const rect = colorWheel.getBoundingClientRect()
    const x = e.clientX - rect.left
    const y = e.clientY - rect.top

    const dx = x - centerX
    const dy = y - centerY
    const distance = Math.sqrt(dx * dx + dy * dy)

    if (distance > radius) return

    // 计算角度和饱和度
    let angle = Math.atan2(dy, dx) * 180 / Math.PI
    if (angle < 0) angle += 360

    const saturation = Math.min(distance / radius * 100, 100)
    const lightness = 50

    // 转换为 RGB
    const hslToRgb = (h, s, l) => {
      s /= 100
      l /= 100
      const k = n => (n + h / 30) % 12
      const a = s * Math.min(l, 1 - l)
      const f = n => l - a * Math.max(-1, Math.min(k(n) - 3, Math.min(9 - k(n), 1)))
      return [Math.round(f(0) * 255), Math.round(f(8) * 255), Math.round(f(4) * 255)]
    }

    const [r, g, b] = hslToRgb(angle, saturation, lightness)

    // 更新输入框
    if (rInput) rInput.value = r
    if (gInput) gInput.value = g
    if (bInput) bInput.value = b

    // 更新颜色预览
    const color = `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`
    if (hexDisplay) hexDisplay.textContent = color.toUpperCase()
  }

  colorWheel.addEventListener('mousedown', (e) => {
    isPicking = true
    pickColor(e)
  })

  document.addEventListener('mousemove', (e) => {
    if (isPicking) {
      pickColor(e)
    }
  })

  document.addEventListener('mouseup', () => {
    isPicking = false
  })

  // 应用颜色按钮
  applyBtn?.addEventListener('click', () => {
    const r = parseInt(rInput?.value || '0')
    const g = parseInt(gInput?.value || '0')
    const b = parseInt(bInput?.value || '0')

    state.currentColor = `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`

    // 更新当前颜色显示
    const currentColorEl = document.getElementById('current-color')
    if (currentColorEl) {
      currentColorEl.style.background = state.currentColor
    }

    console.log(`🎨 颜色已更新: ${state.currentColor}`)
  })
}

// 初始化工具栏
function initToolbar() {
  // 绘制工具
  const drawBtn = document.getElementById('tool-draw')
  const eraseBtn = document.getElementById('tool-erase')

  drawBtn.addEventListener('click', () => {
    state.currentTool = 'draw'
    drawBtn.classList.add('active')
    eraseBtn.classList.remove('active')
    // 取消图形工具的激活状态
    document.getElementById('tool-line')?.classList.remove('active')
    document.getElementById('tool-circle')?.classList.remove('active')
    document.getElementById('tool-star')?.classList.remove('active')
    updateCursor()
    // 切换到绘制工具时，根据当前模式更新 pointer-events
    const canvas = state.canvasLayer.element
    if (state.interactionMode === 'pan') {
      canvas.style.pointerEvents = 'none'
    } else {
      canvas.style.pointerEvents = 'auto'
    }
  })

  eraseBtn.addEventListener('click', () => {
    state.currentTool = 'erase'
    eraseBtn.classList.add('active')
    drawBtn.classList.remove('active')
    // 取消图形工具的激活状态
    document.getElementById('tool-line')?.classList.remove('active')
    document.getElementById('tool-circle')?.classList.remove('active')
    document.getElementById('tool-star')?.classList.remove('active')
    updateCursor()
    // 切换到橡皮擦时，确保 Canvas 可以接收事件（用于框选）
    state.canvasLayer.element.style.pointerEvents = 'auto'
  })

  // 模式切换
  const modeDrawBtn = document.getElementById('mode-draw')
  const modePanBtn = document.getElementById('mode-pan')

  modeDrawBtn.addEventListener('click', () => {
    setInteractionMode('draw')
    modeDrawBtn.classList.add('active')
    modePanBtn.classList.remove('active')
  })

  modePanBtn.addEventListener('click', () => {
    setInteractionMode('pan')
    modePanBtn.classList.add('active')
    modeDrawBtn.classList.remove('active')
  })

  // 快速图形工具
  const lineBtn = document.getElementById('tool-line')
  const circleBtn = document.getElementById('tool-circle')
  const starBtn = document.getElementById('tool-star')

  lineBtn?.addEventListener('click', () => {
    setShapeTool('line', lineBtn)
  })

  circleBtn?.addEventListener('click', () => {
    setShapeTool('circle', circleBtn)
  })

  starBtn?.addEventListener('click', () => {
    setShapeTool('star', starBtn)
  })

  // 图层控制
  const togglePixelLayer = document.getElementById('toggle-pixel-layer')
  const toggleGrid = document.getElementById('toggle-grid')

  togglePixelLayer?.addEventListener('change', (e) => {
    state.isPixelLayerVisible = e.target.checked
    state.canvasLayer.element.style.display = state.isPixelLayerVisible ? 'block' : 'none'
    if (state.isPixelLayerVisible) {
      updateCanvasPosition()
    }
  })

  toggleGrid?.addEventListener('change', (e) => {
    state.isGridVisible = e.target.checked
    if (state.isGridVisible) {
      drawGrid()
    } else {
      state.gridLayer.ctx.clearRect(0, 0, state.gridLayer.element.width, state.gridLayer.element.height)
    }
  })

  // 导入按钮
  document.getElementById('tool-import-image').addEventListener('click', () => {
    openImportModal('image')
  })

  document.getElementById('tool-import-text').addEventListener('click', () => {
    openImportModal('text')
  })
}

// 设置交互模式
function setInteractionMode(mode) {
  state.interactionMode = mode
  updateCursor()

  // 更新 Canvas 的 pointer-events
  const canvas = state.canvasLayer.element
  // 橡皮擦模式下始终拦截事件（用于框选）
  // 绘制模式下根据 interactionMode 决定
  if (state.currentTool === 'erase') {
    canvas.style.pointerEvents = 'auto'
  } else if (mode === 'pan') {
    // 拖拽模式下，Canvas 不拦截事件，让地图可以拖动
    canvas.style.pointerEvents = 'none'
  } else {
    // 绘制模式下，Canvas 拦截事件
    canvas.style.pointerEvents = 'auto'
  }

  console.log(`🔄 切换到${mode === 'draw' ? '绘制' : '拖拽'}模式`)
}

// 更新鼠标光标样式
function updateCursor() {
  const canvas = state.canvasLayer.element

  if (state.currentTool === 'erase') {
    canvas.style.cursor = 'crosshair' // 橡皮擦框选
  } else if (['draw', 'line', 'circle', 'star'].includes(state.currentTool)) {
    canvas.style.cursor = 'crosshair' // 绘制或图形工具
  }
}

// 设置图形工具
function setShapeTool(toolName, btnElement) {
  // 重置所有工具按钮
  document.getElementById('tool-draw')?.classList.remove('active')
  document.getElementById('tool-erase')?.classList.remove('active')
  document.getElementById('tool-line')?.classList.remove('active')
  document.getElementById('tool-circle')?.classList.remove('active')
  document.getElementById('tool-star')?.classList.remove('active')

  // 激活当前工具
  btnElement?.classList.add('active')
  state.currentTool = toolName

  // 确保 Canvas 可以接收事件
  state.canvasLayer.element.style.pointerEvents = 'auto'
  updateCursor()

  console.log(`🎨 切换到${toolName}工具`)
}

// 更新像素计数显示
function updatePixelCount() {
  const countEl = document.getElementById('pixel-count')
  if (countEl) {
    countEl.textContent = state.pixelCount.toLocaleString()
  }
}

// 更新在线人数显示
function updateOnlineCount() {
  const countEl = document.getElementById('online-count')
  if (countEl) {
    countEl.textContent = state.onlineUsers.size.toString()
  }
}

// 冷却时间控制
function startCooldown() {
  state.cooldown = 5 // 5秒冷却
  const cooldownDisplay = document.getElementById('cooldown-display')
  const cooldownTime = document.getElementById('cooldown-time')

  if (cooldownDisplay) {
    cooldownDisplay.style.display = 'block'
  }

  const timer = setInterval(() => {
    state.cooldown--
    if (cooldownTime) {
      cooldownTime.textContent = state.cooldown
    }

    if (state.cooldown <= 0) {
      clearInterval(timer)
      if (cooldownDisplay) {
        cooldownDisplay.style.display = 'none'
      }
    }
  }, 1000)
}

// ==================== 导入对话框功能 ====================

// 打开导入对话框
function openImportModal(type = 'image') {
  const modal = document.getElementById('import-modal')
  const tabImage = document.querySelector('.import-tab[data-tab="image"]')
  const tabText = document.querySelector('.import-tab[data-tab="text"]')
  const contentImage = document.getElementById('tab-image')
  const contentText = document.getElementById('tab-text')

  // 重置状态
  state.importData = null
  state.importType = null
  document.getElementById('import-confirm').disabled = true
  document.getElementById('preview-container').style.display = 'none'
  document.getElementById('file-input').value = ''
  document.getElementById('text-input').value = ''

  // 切换到指定标签
  if (type === 'image') {
    tabImage.classList.add('active')
    tabText.classList.remove('active')
    contentImage.classList.add('active')
    contentText.classList.remove('active')
  } else {
    tabImage.classList.remove('active')
    tabText.classList.add('active')
    contentImage.classList.remove('active')
    contentText.classList.add('active')
  }

  modal.classList.add('show')
}

// 关闭导入对话框
function closeImportModal() {
  const modal = document.getElementById('import-modal')
  modal.classList.remove('show')
  state.importData = null
  state.importType = null
}

// 初始化导入对话框
function initImportModal() {
  const modal = document.getElementById('import-modal')
  const closeBtn = document.getElementById('import-close')
  const cancelBtn = document.getElementById('import-cancel')
  const confirmBtn = document.getElementById('import-confirm')
  const tabs = document.querySelectorAll('.import-tab')
  const fileDropZone = document.getElementById('file-drop-zone')
  const fileInput = document.getElementById('file-input')
  const textInput = document.getElementById('text-input')

  // 关闭按钮
  closeBtn?.addEventListener('click', closeImportModal)
  cancelBtn?.addEventListener('click', closeImportModal)

  // 点击模态框外部关闭
  modal?.addEventListener('click', (e) => {
    if (e.target === modal) {
      closeImportModal()
    }
  })

  // 标签切换
  tabs.forEach(tab => {
    tab.addEventListener('click', () => {
      const targetTab = tab.dataset.tab

      tabs.forEach(t => t.classList.remove('active'))
      tab.classList.add('active')

      document.querySelectorAll('.import-content').forEach(content => {
        content.classList.remove('active')
      })
      document.getElementById(`tab-${targetTab}`).classList.add('active')

      // 重置预览
      state.importData = null
      state.importType = null
      confirmBtn.disabled = true
      document.getElementById('preview-container').style.display = 'none'
    })
  })

  // 文件拖拽和选择
  fileDropZone?.addEventListener('click', () => fileInput?.click())

  fileDropZone?.addEventListener('dragover', (e) => {
    e.preventDefault()
    fileDropZone.classList.add('dragover')
  })

  fileDropZone?.addEventListener('dragleave', () => {
    fileDropZone.classList.remove('dragover')
  })

  fileDropZone?.addEventListener('drop', (e) => {
    e.preventDefault()
    fileDropZone.classList.remove('dragover')
    const files = e.dataTransfer.files
    if (files.length > 0) {
      handleImageFile(files[0])
    }
  })

  fileInput?.addEventListener('change', (e) => {
    if (e.target.files.length > 0) {
      handleImageFile(e.target.files[0])
    }
  })

  // 文字输入实时预览
  let textDebounceTimer
  textInput?.addEventListener('input', () => {
    clearTimeout(textDebounceTimer)
    textDebounceTimer = setTimeout(() => {
      handleTextInput()
    }, 500)
  })

  // 选项改变时重新生成预览
  document.getElementById('image-color-mode')?.addEventListener('change', () => {
    if (state.importType === 'image' && state.importData?.file) {
      handleImageFile(state.importData.file)
    }
  })

  document.getElementById('text-font-size')?.addEventListener('change', () => {
    if (state.importType === 'text') {
      handleTextInput()
    }
  })

  // 文字颜色选择器初始化
  initTextColorPicker()

  // 确认导入
  confirmBtn?.addEventListener('click', () => {
    if (!state.importData) return

    // 获取地图中心作为放置位置
    const center = state.map.getCenter()
    const gridX = Math.floor(center.lng / GRID_PRECISION)
    const gridY = Math.floor(center.lat / GRID_PRECISION)

    // 转换像素到网格坐标
    const gridPixels = pixelsToGrid(
      state.importData.pixels,
      state.importData.width,
      state.importData.height,
      gridX,
      gridY
    )

    // 准备批量绘制的数据
    const pixelDataList = gridPixels.map(({ gridX, gridY, color }) => {
      const lng = (gridX + 0.5) * GRID_PRECISION
      const lat = (gridY + 0.5) * GRID_PRECISION

      return {
        lat,
        lng,
        gridX,
        gridY,
        color,
        size: PIXEL_SIZE,
        tool: 'draw',
        timestamp: Date.now()
      }
    })

    // 本地绘制
    pixelDataList.forEach(pixelData => {
      drawPixel(pixelData)
    })

    // 发送到服务器（批量）
    if (state.socket && state.socket.connected) {
      state.socket.emit('pixels:draw-batch', pixelDataList)
    }

    console.log(`✅ 导入完成: ${pixelDataList.length} 个像素`)
    closeImportModal()
  })
}

// 初始化文字颜色选择器
function initTextColorPicker() {
  const colorPicker = document.getElementById('text-color-picker')
  const colorPanel = document.getElementById('text-color-panel')
  const colorWheel = document.getElementById('text-color-wheel')
  const rInput = document.getElementById('text-rgb-r')
  const gInput = document.getElementById('text-rgb-g')
  const bInput = document.getElementById('text-rgb-b')

  if (!colorWheel) return

  const ctx = colorWheel.getContext('2d')
  const centerX = colorWheel.width / 2
  const centerY = colorWheel.height / 2
  const radius = colorWheel.width / 2 - 5

  // 绘制色轮
  function drawColorWheel() {
    for (let angle = 0; angle < 360; angle++) {
      const startAngle = (angle - 1) * Math.PI / 180
      const endAngle = angle * Math.PI / 180

      ctx.beginPath()
      ctx.moveTo(centerX, centerY)
      ctx.arc(centerX, centerY, radius, startAngle, endAngle)
      ctx.closePath()
      ctx.fillStyle = `hsl(${angle}, 100%, 50%)`
      ctx.fill()
    }

    // 绘制中心白色到透明的渐变
    const gradient = ctx.createRadialGradient(centerX, centerY, 0, centerX, centerY, radius)
    gradient.addColorStop(0, 'rgba(255, 255, 255, 1)')
    gradient.addColorStop(1, 'rgba(255, 255, 255, 0)')
    ctx.fillStyle = gradient
    ctx.beginPath()
    ctx.arc(centerX, centerY, radius, 0, Math.PI * 2)
    ctx.fill()
  }

  drawColorWheel()

  // 切换颜色面板显示
  colorPicker?.addEventListener('click', () => {
    const isVisible = colorPanel.style.display === 'block'
    colorPanel.style.display = isVisible ? 'none' : 'block'
  })

  // 从色轮选择颜色
  let isPicking = false

  function pickColor(e) {
    const rect = colorWheel.getBoundingClientRect()
    const x = e.clientX - rect.left
    const y = e.clientY - rect.top

    const dx = x - centerX
    const dy = y - centerY
    const distance = Math.sqrt(dx * dx + dy * dy)

    if (distance > radius) return

    // 计算角度和饱和度
    let angle = Math.atan2(dy, dx) * 180 / Math.PI
    if (angle < 0) angle += 360

    const saturation = Math.min(distance / radius * 100, 100)
    const lightness = 50

    // 转换为 RGB
    const hslToRgb = (h, s, l) => {
      s /= 100
      l /= 100
      const k = n => (n + h / 30) % 12
      const a = s * Math.min(l, 1 - l)
      const f = n => l - a * Math.max(-1, Math.min(k(n) - 3, Math.min(9 - k(n), 1)))
      return [Math.round(f(0) * 255), Math.round(f(8) * 255), Math.round(f(4) * 255)]
    }

    const [r, g, b] = hslToRgb(angle, saturation, lightness)

    // 更新输入框
    if (rInput) rInput.value = r
    if (gInput) gInput.value = g
    if (bInput) bInput.value = b

    // 更新颜色预览
    if (colorPicker) {
      colorPicker.style.background = `rgb(${r}, ${g}, ${b})`
    }

    // 触发文字预览更新
    if (state.importType === 'text') {
      handleTextInput()
    }
  }

  colorWheel.addEventListener('mousedown', (e) => {
    isPicking = true
    pickColor(e)
  })

  document.addEventListener('mousemove', (e) => {
    if (isPicking) {
      pickColor(e)
    }
  })

  document.addEventListener('mouseup', () => {
    isPicking = false
  })

  // RGB 输入框变化
  function updateFromRgb() {
    const r = parseInt(rInput?.value || '0')
    const g = parseInt(gInput?.value || '0')
    const b = parseInt(bInput?.value || '0')

    if (colorPicker) {
      colorPicker.style.background = `rgb(${r}, ${g}, ${b})`
    }

    if (state.importType === 'text') {
      handleTextInput()
    }
  }

  rInput?.addEventListener('input', updateFromRgb)
  gInput?.addEventListener('input', updateFromRgb)
  bInput?.addEventListener('input', updateFromRgb)
}

// 处理图片文件
async function handleImageFile(file) {
  try {
    const colorMode = document.getElementById('image-color-mode')?.value || 'color'

    console.log('🖼️ 正在处理图片...')
    const result = await imageToPixels(file, {
      maxWidth: 100,
      maxHeight: 100,
      colorMode
    })

    // 生成预览
    const previewUrl = previewPixels(result.pixels, result.width, result.height, 2)

    // 显示预览
    const previewImg = document.getElementById('preview-image')
    const previewContainer = document.getElementById('preview-container')
    const previewInfo = document.getElementById('preview-info')

    previewImg.src = previewUrl
    previewContainer.style.display = 'block'
    previewInfo.textContent = `尺寸: ${result.width} x ${result.height} 像素 | 共 ${result.pixels.length} 个像素点`

    // 保存数据
    state.importData = result
    state.importType = 'image'
    state.importData.file = file // 保存文件引用以便重新处理

    document.getElementById('import-confirm').disabled = false

    console.log(`✅ 图片处理完成: ${result.width}x${result.height}, ${result.pixels.length} 像素`)
  } catch (error) {
    console.error('❌ 图片处理失败:', error)
    alert('图片处理失败: ' + error.message)
  }
}

// 获取当前文字颜色
function getTextColor() {
  const r = parseInt(document.getElementById('text-rgb-r')?.value || '0')
  const g = parseInt(document.getElementById('text-rgb-g')?.value || '0')
  const b = parseInt(document.getElementById('text-rgb-b')?.value || '0')
  return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`
}

// 处理文字输入
async function handleTextInput() {
  const text = document.getElementById('text-input')?.value.trim()
  if (!text) {
    document.getElementById('preview-container').style.display = 'none'
    document.getElementById('import-confirm').disabled = true
    state.importData = null
    state.importType = null
    return
  }

  try {
    const fontSize = parseInt(document.getElementById('text-font-size')?.value || '48')
    const color = getTextColor()

    console.log('📝 正在处理文字...')
    const result = await textToPixels(text, {
      fontSize,
      color,
      maxWidth: 100,
      maxHeight: 100
    })

    // 生成预览
    const previewUrl = previewPixels(result.pixels, result.width, result.height, 2)

    // 显示预览
    const previewImg = document.getElementById('preview-image')
    const previewContainer = document.getElementById('preview-container')
    const previewInfo = document.getElementById('preview-info')

    previewImg.src = previewUrl
    previewContainer.style.display = 'block'
    previewInfo.textContent = `尺寸: ${result.width} x ${result.height} 像素 | 共 ${result.pixels.length} 个像素点 | 字体大小: ${result.fontSize}px`

    // 保存数据
    state.importData = result
    state.importType = 'text'

    document.getElementById('import-confirm').disabled = false

    console.log(`✅ 文字处理完成: ${result.width}x${result.height}, ${result.pixels.length} 像素`)
  } catch (error) {
    console.error('❌ 文字处理失败:', error)
    alert('文字处理失败: ' + error.message)
  }
}

// 初始化 WebSocket 连接
function initSocket() {
  // 检测环境，自动选择服务器地址
  // 优先级: 1. 环境变量 2. localhost 3. 同域
  const isLocalhost = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'

  // 生产环境配置 - 修改这里为你的后端服务器地址
  const PRODUCTION_SERVER_URL = 'https://sui-pixel-server.up.railway.app'

  // 自动检测服务器地址
  let serverUrl
  if (window.SOCKET_SERVER_URL) {
    // 如果全局变量存在，使用它
    serverUrl = window.SOCKET_SERVER_URL
  } else if (isLocalhost) {
    // 本地开发环境
    serverUrl = 'http://localhost:3001'
  } else if (window.location.hostname.includes('vercel.app')) {
    // Vercel 部署环境，使用独立的后端服务器
    serverUrl = PRODUCTION_SERVER_URL
  } else {
    // 其他环境，尝试同域
    serverUrl = window.location.origin
  }

  console.log(`🔄 正在连接服务器: ${serverUrl}`)

  // 创建 Socket.io 连接
  state.socket = io(serverUrl, {
    transports: ['websocket', 'polling'],
    reconnection: true,
    reconnectionAttempts: 5,
    reconnectionDelay: 1000
  })

  // 连接成功
  state.socket.on('connect', () => {
    console.log('✅ 已连接到服务器')
    state.user = {
      id: state.socket.id,
      ip: 'online'
    }
  })

  // 连接断开
  state.socket.on('disconnect', () => {
    console.log('⚠️ 与服务器断开连接')
  })

  // 连接错误
  state.socket.on('connect_error', (error) => {
    console.error('❌ 连接错误:', error)
    console.log('🔄 切换到本地模式')
    // 本地模式
    state.user = {
      id: 'local_' + Math.random().toString(36).substr(2, 9),
      ip: '127.0.0.1'
    }
  })

  // 接收初始像素数据
  state.socket.on('pixels:init', (data) => {
    console.log(`📥 接收 ${data.pixels.length} 个像素，在线用户: ${data.onlineUsers}`)

    // 清空本地像素
    state.pixels.clear()

    // 加载服务器像素
    data.pixels.forEach(pixel => {
      const key = `${pixel.gridX},${pixel.gridY}`
      state.pixels.set(key, pixel)
    })

    state.pixelCount = state.pixels.size

    // 更新显示
    updatePixelCount()
    updateCanvasPosition()
  })

  // 接收其他用户绘制的像素
  state.socket.on('pixel:draw', (data) => {
    const key = `${data.gridX},${data.gridY}`
    state.pixels.set(key, data)
    state.pixelCount = state.pixels.size
    drawPixel(data)
    updatePixelCount()
  })

  // 接收批量绘制的像素
  state.socket.on('pixels:draw-batch', (pixels) => {
    pixels.forEach(pixel => {
      const key = `${pixel.gridX},${pixel.gridY}`
      state.pixels.set(key, pixel)
      drawPixel(pixel)
    })
    state.pixelCount = state.pixels.size
    updatePixelCount()
  })

  // 接收擦除事件
  state.socket.on('pixel:erase', (data) => {
    const key = `${data.gridX},${data.gridY}`
    if (state.pixels.has(key)) {
      state.pixels.delete(key)
      state.pixelCount = state.pixels.size
      updateCanvasPosition()
      updatePixelCount()
    }
  })

  // 接收批量擦除事件
  state.socket.on('pixel:erase-batch', (keys) => {
    keys.forEach(({ gridX, gridY }) => {
      const key = `${gridX},${gridY}`
      state.pixels.delete(key)
    })
    state.pixelCount = state.pixels.size
    updateCanvasPosition()
    updatePixelCount()
  })

  // 用户加入/离开通知
  state.socket.on('user:join', (data) => {
    console.log(`👤 用户加入，当前在线: ${data.onlineUsers}`)
    // 可以在这里更新在线人数显示
  })

  state.socket.on('user:leave', (data) => {
    console.log(`👤 用户离开，当前在线: ${data.onlineUsers}`)
  })

  // 错误处理
  state.socket.on('error', (error) => {
    console.error('❌ 服务器错误:', error)
  })
}

// 初始化应用
function init() {
  console.log('🚀 广州像素画布启动中...')
  console.log('🧪 测试模式：冷却已关闭，可随意绘制')

  initMap()
  initColorPicker()
  initToolbar()
  initImportModal()
  initSocket()

  // 窗口大小改变时调整 Canvas
  window.addEventListener('resize', () => {
    const mapContainer = document.getElementById('map')
    state.canvasLayer.element.width = mapContainer.clientWidth
    state.canvasLayer.element.height = mapContainer.clientHeight
    state.gridLayer.element.width = mapContainer.clientWidth
    state.gridLayer.element.height = mapContainer.clientHeight
    updateCanvasPosition()
    drawGrid()
  })

  console.log('✅ 应用初始化完成')
  console.log('📖 使用说明：')
  console.log('   - 选择画笔工具，在地图上点击或拖动绘制像素')
  console.log('   - 使用鼠标滚轮缩放地图')
  console.log('   - 按住鼠标右键或选择拖拽模式移动地图')
}

// 启动应用
document.addEventListener('DOMContentLoaded', init)
