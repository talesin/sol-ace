import { useState, useEffect, useRef } from 'react'
import {
  getSolPrice,
  getSolHistoricalPrices,
  GetPriceError,
  GetHistoricalDataError,
  PriceService,
  HistoricalPriceData
} from './api'
import './App.css'
import { Effect, Exit, Cause, Layer } from 'effect'
import { FetchHttpClient } from '@effect/platform'

// Chart rendering types
type ChartDimensions = {
  width: number
  height: number
  padding: number
  innerWidth: number
  innerHeight: number
}

type PriceRange = {
  min: number
  max: number
  range: number
}

function App() {
  const [price, setPrice] = useState<number | undefined>(undefined)
  const [error, setError] = useState<GetPriceError | undefined>(undefined)
  const [historicalData, setHistoricalData] = useState<HistoricalPriceData | undefined>(undefined)
  const [historicalError, setHistoricalError] = useState<GetHistoricalDataError | undefined>(
    undefined
  )
  const chartRef = useRef<HTMLCanvasElement>(null)

  // Data fetching effect
  useEffect(() => {
    fetchInitialData()
    const interval = setupPriceRefreshInterval()
    return () => clearInterval(interval)
  }, [])

  // Chart rendering effect
  useEffect(() => {
    if (historicalData) renderHistoricalChart()
  }, [historicalData])

  // Data fetching functions
  const fetchInitialData = () => {
    const serviceLayer = Layer.provideMerge(PriceService.Default, FetchHttpClient.layer)

    // Current price program
    const priceProgram = getSolPrice().pipe(Effect.provide(serviceLayer), Effect.runPromiseExit)

    // Historical data program
    const historicalProgram = getSolHistoricalPrices().pipe(
      Effect.provide(serviceLayer),
      Effect.runPromiseExit
    )

    fetchCurrentPrice(priceProgram)
    fetchHistoricalData(historicalProgram)
  }

  const setupPriceRefreshInterval = () => {
    return setInterval(() => {
      const serviceLayer = Layer.provideMerge(PriceService.Default, FetchHttpClient.layer)
      const priceProgram = getSolPrice().pipe(Effect.provide(serviceLayer), Effect.runPromiseExit)
      fetchCurrentPrice(priceProgram)
    }, 60000) // Refresh price every 60 seconds
  }

  const fetchCurrentPrice = (priceProgram: Promise<Exit.Exit<number, GetPriceError>>) => {
    priceProgram.then((exit: Exit.Exit<number, GetPriceError>) => {
      if (Exit.isSuccess(exit)) {
        setPrice(exit.value)
        setError(undefined)
      } else if (Cause.isFailType(exit.cause)) {
        if (exit.cause.error instanceof GetPriceError) {
          setError(exit.cause.error)
        }
        console.error(Cause.pretty(exit.cause))
      }
    })
  }

  const fetchHistoricalData = (
    historicalProgram: Promise<Exit.Exit<HistoricalPriceData, GetHistoricalDataError>>
  ) => {
    historicalProgram.then((exit: Exit.Exit<HistoricalPriceData, GetHistoricalDataError>) => {
      if (Exit.isSuccess(exit)) {
        setHistoricalData(exit.value)
        setHistoricalError(undefined)
      } else if (Cause.isFailType(exit.cause)) {
        if (exit.cause.error instanceof GetHistoricalDataError) {
          setHistoricalError(exit.cause.error)
        }
        console.error(Cause.pretty(exit.cause))
      }
    })
  }

  // Chart rendering functions
  const renderHistoricalChart = () => {
    if (!historicalData || !chartRef.current) return

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

  const getChartDimensions = (canvas: HTMLCanvasElement): ChartDimensions => {
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

  const calculatePriceRange = (data: HistoricalPriceData): PriceRange => {
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

  const setupChartStyle = (ctx: CanvasRenderingContext2D) => {
    ctx.lineWidth = 2
    ctx.strokeStyle = '#8884d8'
    ctx.fillStyle = '#8884d8'
  }

  const drawAxes = (ctx: CanvasRenderingContext2D, dimensions: ChartDimensions) => {
    const { width, height, padding } = dimensions

    ctx.beginPath()
    ctx.moveTo(padding, padding)
    ctx.lineTo(padding, height - padding) // Y axis
    ctx.lineTo(width - padding, height - padding) // X axis
    ctx.stroke()
  }

  const plotDataPoints = (
    ctx: CanvasRenderingContext2D,
    data: HistoricalPriceData,
    dimensions: ChartDimensions,
    priceRange: PriceRange
  ) => {
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

  const addPriceLabels = (
    ctx: CanvasRenderingContext2D,
    priceRange: PriceRange,
    dimensions: ChartDimensions
  ) => {
    const { padding, height } = dimensions
    const { min, max } = priceRange

    ctx.fillStyle = '#333'
    ctx.font = '12px Arial'
    ctx.textAlign = 'right'
    ctx.fillText(`$${max.toFixed(2)}`, padding - 5, padding + 5)
    ctx.fillText(`$${min.toFixed(2)}`, padding - 5, height - padding)
  }

  const addDateLabels = (
    ctx: CanvasRenderingContext2D,
    data: HistoricalPriceData,
    dimensions: ChartDimensions
  ) => {
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

  // UI Rendering functions
  const renderPriceContent = () => {
    if (error) {
      return <p className="error">Error fetching price</p>
    } else if (price === undefined) {
      return <p className="loading">Loading...</p>
    } else {
      return <p className="price">${price.toFixed(2)}</p>
    }
  }

  const renderChartSection = () => {
    if (historicalError) {
      return <p className="error">Error fetching historical data</p>
    }
    if (!historicalData) {
      return <p className="loading">Loading chart...</p>
    }

    return (
      <div className="chart-container">
        <h2>30-Day Price History</h2>
        <canvas ref={chartRef} width={600} height={300} className="price-chart" />
      </div>
    )
  }

  // Main component render
  return (
    <main className="container">
      <div className="price-container">{renderPriceContent()}</div>
      <div className="chart-section">{renderChartSection()}</div>
    </main>
  )
}

export default App
