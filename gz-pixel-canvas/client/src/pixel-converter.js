// 像素转换器 - 将图片/文字转换为像素画
// 支持最大 400x400 像素输出

const MAX_SIZE = 400

/**
 * 将图片文件转换为像素数据
 * @param {File} file - 图片文件
 * @param {Object} options - 配置选项
 * @returns {Promise<{pixels: Array, width: number, height: number}>}
 */
export async function imageToPixels(file, options = {}) {
  const {
    maxWidth = MAX_SIZE,
    maxHeight = MAX_SIZE,
    threshold = 128, // 二值化阈值
    colorMode = 'color' // 'color' | 'bw' | 'grayscale'
  } = options

  return new Promise((resolve, reject) => {
    const img = new Image()
    const canvas = document.createElement('canvas')
    const ctx = canvas.getContext('2d')

    img.onload = () => {
      // 计算缩放后的尺寸
      let { width, height } = calculateAspectRatioFit(
        img.width,
        img.height,
        maxWidth,
        maxHeight
      )

      // 确保不超过最大尺寸
      width = Math.min(width, maxWidth)
      height = Math.min(height, maxHeight)

      canvas.width = width
      canvas.height = height

      // 绘制图片
      ctx.drawImage(img, 0, 0, width, height)

      // 获取像素数据
      const imageData = ctx.getImageData(0, 0, width, height)
      const pixels = extractPixels(imageData, colorMode, threshold)

      resolve({
        pixels,
        width,
        height,
        originalWidth: img.width,
        originalHeight: img.height
      })
    }

    img.onerror = () => reject(new Error('图片加载失败'))

    // 读取文件
    const reader = new FileReader()
    reader.onload = (e) => {
      img.src = e.target.result
    }
    reader.onerror = () => reject(new Error('文件读取失败'))
    reader.readAsDataURL(file)
  })
}

/**
 * 将文字转换为像素数据
 * @param {string} text - 文字内容
 * @param {Object} options - 配置选项
 * @returns {Promise<{pixels: Array, width: number, height: number}>}
 */
export async function textToPixels(text, options = {}) {
  const {
    fontSize = 48,
    fontFamily = 'Arial, sans-serif',
    fontWeight = 'bold',
    color = '#000000',
    maxWidth = MAX_SIZE,
    maxHeight = MAX_SIZE,
    backgroundColor = '#ffffff',
    textAlign = 'center',
    textBaseline = 'middle'
  } = options

  const canvas = document.createElement('canvas')
  const ctx = canvas.getContext('2d')

  // 创建临时 canvas 计算文字尺寸
  const tempCanvas = document.createElement('canvas')
  const tempCtx = tempCanvas.getContext('2d')
  tempCtx.font = `${fontWeight} ${fontSize}px ${fontFamily}`

  // 计算文字尺寸
  const lines = text.split('\n')
  let maxLineWidth = 0
  lines.forEach(line => {
    const metrics = tempCtx.measureText(line)
    maxLineWidth = Math.max(maxLineWidth, metrics.width)
  })

  // 计算合适的 canvas 尺寸
  let width = Math.min(Math.ceil(maxLineWidth) + 40, maxWidth)
  let height = Math.min(lines.length * fontSize * 1.5 + 40, maxHeight)

  // 如果文字太大，缩小字体
  let actualFontSize = fontSize
  while ((width > maxWidth || height > maxHeight) && actualFontSize > 12) {
    actualFontSize -= 4
    tempCtx.font = `${fontWeight} ${actualFontSize}px ${fontFamily}`

    maxLineWidth = 0
    lines.forEach(line => {
      const metrics = tempCtx.measureText(line)
      maxLineWidth = Math.max(maxLineWidth, metrics.width)
    })

    width = Math.min(Math.ceil(maxLineWidth) + 40, maxWidth)
    height = Math.min(lines.length * actualFontSize * 1.5 + 40, maxHeight)
  }

  canvas.width = width
  canvas.height = height

  // 填充背景
  ctx.fillStyle = backgroundColor
  ctx.fillRect(0, 0, width, height)

  // 绘制文字
  ctx.font = `${fontWeight} ${actualFontSize}px ${fontFamily}`
  ctx.fillStyle = color
  ctx.textAlign = textAlign
  ctx.textBaseline = textBaseline

  const lineHeight = actualFontSize * 1.5
  const startY = height / 2 - ((lines.length - 1) * lineHeight) / 2

  lines.forEach((line, index) => {
    const x = textAlign === 'center' ? width / 2 : width / 2
    const y = startY + index * lineHeight
    ctx.fillText(line, x, y)
  })

  // 获取像素数据 - 文字模式跳过白色背景
  const imageData = ctx.getImageData(0, 0, width, height)
  const pixels = extractPixels(imageData, 'text', 128)

  return {
    pixels,
    width,
    height,
    fontSize: actualFontSize
  }
}

/**
 * 计算保持宽高比的缩放尺寸
 */
function calculateAspectRatioFit(srcWidth, srcHeight, maxWidth, maxHeight) {
  const ratio = Math.min(maxWidth / srcWidth, maxHeight / srcHeight)
  return {
    width: Math.round(srcWidth * ratio),
    height: Math.round(srcHeight * ratio)
  }
}

/**
 * 从 ImageData 提取像素
 */
function extractPixels(imageData, colorMode, threshold) {
  const { data, width, height } = imageData
  const pixels = []

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const i = (y * width + x) * 4
      const r = data[i]
      const g = data[i + 1]
      const b = data[i + 2]
      const a = data[i + 3]

      // 跳过透明像素
      if (a < 128) continue

      // 文字模式：跳过接近白色的背景
      if (colorMode === 'text') {
        const gray = (r + g + b) / 3
        // 如果像素接近白色（灰度值 > 240），则跳过
        if (gray > 240) continue
        // 使用原始颜色
        const color = rgbToHex(r, g, b)
        pixels.push({ x, y, color, r, g, b })
        continue
      }

      let color
      if (colorMode === 'bw') {
        // 黑白模式
        const gray = (r + g + b) / 3
        color = gray > threshold ? '#ffffff' : '#000000'
        if (gray > threshold) continue // 跳过白色背景
      } else if (colorMode === 'grayscale') {
        // 灰度模式
        const gray = Math.round((r + g + b) / 3)
        color = rgbToHex(gray, gray, gray)
      } else {
        // 彩色模式 - 使用256色调色板
        color = quantizeColor256(r, g, b)
      }

      pixels.push({
        x,
        y,
        color,
        r,
        g,
        b
      })
    }
  }

  return pixels
}

/**
 * 颜色量化 - 将颜色简化为16色
 */
function quantizeColor(r, g, b) {
  // 定义主题色板（16色）
  const palette = [
    { r: 0, g: 0, b: 0, color: '#000000' },      // 黑
    { r: 255, g: 255, b: 255, color: '#ffffff' }, // 白
    { r: 255, g: 0, b: 0, color: '#ff0000' },     // 红
    { r: 0, g: 255, b: 0, color: '#00ff00' },     // 绿
    { r: 0, g: 0, b: 255, color: '#0000ff' },     // 蓝
    { r: 255, g: 255, b: 0, color: '#ffff00' },   // 黄
    { r: 255, g: 0, b: 255, color: '#ff00ff' },   // 品红
    { r: 0, g: 255, b: 255, color: '#00ffff' },   // 青
    { r: 128, g: 0, b: 0, color: '#800000' },     // 深红
    { r: 0, g: 128, b: 0, color: '#008000' },     // 深绿
    { r: 0, g: 0, b: 128, color: '#000080' },     // 深蓝
    { r: 128, g: 128, b: 0, color: '#808000' },   // 橄榄
    { r: 128, g: 0, b: 128, color: '#800080' },   // 紫
    { r: 0, g: 128, b: 128, color: '#008080' },   // 深青
    { r: 128, g: 128, b: 128, color: '#808080' }, // 灰
    { r: 192, g: 192, b: 192, color: '#c0c0c0' }  // 浅灰
  ]

  // 找到最近的颜色
  let minDistance = Infinity
  let nearestColor = palette[0].color

  palette.forEach(p => {
    const distance = Math.sqrt(
      Math.pow(r - p.r, 2) +
      Math.pow(g - p.g, 2) +
      Math.pow(b - p.b, 2)
    )
    if (distance < minDistance) {
      minDistance = distance
      nearestColor = p.color
    }
  })

  return nearestColor
}

/**
 * 256色量化 - 将颜色简化为256色（Web安全色）
 * 每个通道量化为6个级别：0, 51, 102, 153, 204, 255
 */
function quantizeColor256(r, g, b) {
  // 将每个通道量化为6个级别
  const quantizeChannel = (value) => {
    return Math.round(value / 51) * 51
  }

  const qr = quantizeChannel(r)
  const qg = quantizeChannel(g)
  const qb = quantizeChannel(b)

  return rgbToHex(qr, qg, qb)
}

/**
 * RGB 转 Hex
 */
function rgbToHex(r, g, b) {
  const toHex = (n) => {
    const hex = Math.max(0, Math.min(255, n)).toString(16)
    return hex.length === 1 ? '0' + hex : hex
  }
  return `#${toHex(r)}${toHex(g)}${toHex(b)}`
}

/**
 * 将像素数据转换为网格坐标
 * @param {Array} pixels - 像素数组
 * @param {number} width - 图像宽度
 * @param {number} height - 图像高度
 * @param {number} gridX - 起始网格X坐标
 * @param {number} gridY - 起始网格Y坐标
 * @returns {Array} 网格像素数组
 */
export function pixelsToGrid(pixels, width, height, gridX = 0, gridY = 0) {
  // 居中放置，注意：Canvas Y轴向下，地理坐标Y轴向上，需要翻转
  const offsetX = Math.floor(gridX - width / 2)
  const offsetY = Math.floor(gridY + height / 2) // 从底部开始

  return pixels.map(p => ({
    gridX: offsetX + p.x,
    gridY: offsetY - p.y, // 翻转Y坐标
    color: p.color
  }))
}

/**
 * 预览像素图像
 * @param {Array} pixels - 像素数组
 * @param {number} width - 图像宽度
 * @param {number} height - 图像高度
 * @param {number} scale - 缩放比例
 * @returns {string} Data URL
 */
export function previewPixels(pixels, width, height, scale = 2) {
  const canvas = document.createElement('canvas')
  const ctx = canvas.getContext('2d')

  canvas.width = width * scale
  canvas.height = height * scale

  // 填充白色背景
  ctx.fillStyle = '#ffffff'
  ctx.fillRect(0, 0, canvas.width, canvas.height)

  // 绘制像素
  pixels.forEach(p => {
    ctx.fillStyle = p.color
    ctx.fillRect(p.x * scale, p.y * scale, scale, scale)
  })

  return canvas.toDataURL('image/png')
}

/**
 * 检测图像主体区域（去除空白边框）
 */
export function detectSubjectBounds(pixels, width, height) {
  let minX = width, minY = height, maxX = 0, maxY = 0
  let hasContent = false

  pixels.forEach(p => {
    if (p.color !== '#ffffff') {
      minX = Math.min(minX, p.x)
      minY = Math.min(minY, p.y)
      maxX = Math.max(maxX, p.x)
      maxY = Math.max(maxY, p.y)
      hasContent = true
    }
  })

  if (!hasContent) {
    return { x: 0, y: 0, width, height }
  }

  return {
    x: minX,
    y: minY,
    width: maxX - minX + 1,
    height: maxY - minY + 1
  }
}

/**
 * 裁剪像素数据
 */
export function cropPixels(pixels, bounds) {
  return pixels.filter(p =>
    p.x >= bounds.x &&
    p.x < bounds.x + bounds.width &&
    p.y >= bounds.y &&
    p.y < bounds.y + bounds.height
  ).map(p => ({
    ...p,
    x: p.x - bounds.x,
    y: p.y - bounds.y
  }))
}

export default {
  imageToPixels,
  textToPixels,
  pixelsToGrid,
  previewPixels,
  detectSubjectBounds,
  cropPixels
}
