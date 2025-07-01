import { HistoricalPriceData } from './PriceService'

// Chart rendering types
export type ChartDimensions = {
  width: number
  height: number
  padding: number
  innerWidth: number
  innerHeight: number
}

export type PriceRange = {
  min: number
  max: number
  range: number
}

export const renderHistoricalChart = (
  chartRef: React.RefObject<HTMLCanvasElement>,
  historicalData: HistoricalPriceData
): void => {
  if (historicalData.length === 0 || !chartRef.current) return

  const canvas = chartRef.current
  const ctx = canvas.getContext('2d')
  if (!ctx) return

  // Skip if no data
  if (historicalData.length === 0) return

  const dimensions = getChartDimensions(canvas)
  const priceRange = calculatePriceRange(historicalData)

  // Prepare canvas
  ctx.clearRect(0, 0, dimensions.width, dimensions.height)

  // Draw the chart components
  setupChartStyle(ctx)
  drawAxes(ctx, dimensions)
  plotDataPoints(ctx, historicalData, dimensions, priceRange)
  addPriceLabels(ctx, priceRange, dimensions)
  addDateLabels(ctx, historicalData, dimensions)
}

export const getChartDimensions = (canvas: HTMLCanvasElement): ChartDimensions => {
  const width = canvas.width
  const height = canvas.height
  const padding = 20

  return {
    width,
    height,
    padding,
    innerWidth: width - 2 * padding,
    innerHeight: height - 2 * padding
  }
}

export const calculatePriceRange = (data: HistoricalPriceData): PriceRange => {
  // Extract price values for min/max calculation
  const prices = data.map((item) => item.price)
  const min = Math.min(...prices)
  const max = Math.max(...prices)

  return {
    min,
    max,
    range: max - min
  }
}

export const setupChartStyle = (ctx: CanvasRenderingContext2D): void => {
  ctx.lineWidth = 2
  ctx.strokeStyle = '#8884d8'
  ctx.fillStyle = '#8884d8'
}

export const drawAxes = (ctx: CanvasRenderingContext2D, dimensions: ChartDimensions): void => {
  const { width, height, padding } = dimensions

  ctx.beginPath()
  ctx.moveTo(padding, padding)
  ctx.lineTo(padding, height - padding) // Y axis
  ctx.lineTo(width - padding, height - padding) // X axis
  ctx.stroke()
}

export const plotDataPoints = (
  ctx: CanvasRenderingContext2D,
  data: HistoricalPriceData,
  dimensions: ChartDimensions,
  priceRange: PriceRange
): void => {
  const { padding, innerHeight, innerWidth } = dimensions
  const { min, range } = priceRange

  ctx.beginPath()
  data.forEach((dataPoint, index) => {
    const x = padding + (index / (data.length - 1)) * innerWidth
    const normalizedPrice = range ? (dataPoint.price - min) / range : 0.5
    const y = dimensions.height - padding - normalizedPrice * innerHeight

    if (index === 0) {
      ctx.moveTo(x, y)
    } else {
      ctx.lineTo(x, y)
    }
  })
  ctx.stroke()
}

export const addPriceLabels = (
  ctx: CanvasRenderingContext2D,
  priceRange: PriceRange,
  dimensions: ChartDimensions
): void => {
  const { padding, height } = dimensions
  const { min, max } = priceRange

  ctx.fillStyle = '#333'
  ctx.font = '12px Arial'
  ctx.textAlign = 'right'
  ctx.fillText(`$${max.toFixed(2)}`, padding - 5, padding + 5)
  ctx.fillText(`$${min.toFixed(2)}`, padding - 5, height - padding)
}

export const addDateLabels = (
  ctx: CanvasRenderingContext2D,
  data: HistoricalPriceData,
  dimensions: ChartDimensions
): void => {
  const { padding, width, height } = dimensions

  if (data.length > 0) {
    const firstDataPoint = data[0]
    const lastDataPoint = data[data.length - 1]

    if (firstDataPoint && lastDataPoint) {
      const firstDate = firstDataPoint.timestamp
      const lastDate = lastDataPoint.timestamp

      ctx.fillStyle = '#333'
      ctx.textAlign = 'left'
      ctx.fillText(firstDate.toLocaleDateString(), padding, height - padding + 15)

      ctx.textAlign = 'right'
      ctx.fillText(lastDate.toLocaleDateString(), width - padding, height - padding + 15)
    }
  }
}
