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

function App() {
  const [price, setPrice] = useState<number | undefined>(undefined)
  const [error, setError] = useState<GetPriceError | undefined>(undefined)
  const [historicalData, setHistoricalData] = useState<HistoricalPriceData | undefined>(undefined)
  const [historicalError, setHistoricalError] = useState<GetHistoricalDataError | undefined>(
    undefined
  )
  const chartRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    // Setup service layers
    const serviceLayer = Layer.provideMerge(PriceService.Default, FetchHttpClient.layer)

    // Current price program
    const priceProgram = getSolPrice().pipe(Effect.provide(serviceLayer), Effect.runPromiseExit)

    // Historical data program
    const historicalProgram = getSolHistoricalPrices().pipe(
      Effect.provide(serviceLayer),
      Effect.runPromiseExit
    )

    const fetchCurrentPrice = () => {
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

    const fetchHistoricalData = () => {
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

    // Fetch both current and historical data
    fetchCurrentPrice()
    fetchHistoricalData()

    // Only refresh current price periodically
    const interval = setInterval(fetchCurrentPrice, 60000) // Refresh every 60 seconds

    return () => clearInterval(interval)
  }, [])

  // Draw the chart whenever historical data changes
  useEffect(() => {
    if (historicalData && chartRef.current) {
      const canvas = chartRef.current
      const ctx = canvas.getContext('2d')

      if (!ctx) return

      const width = canvas.width
      const height = canvas.height

      // Clear canvas
      ctx.clearRect(0, 0, width, height)

      // Skip if no data
      if (historicalData.length === 0) return

      // Extract price values for min/max calculation
      const prices = historicalData.map((item) => item.price)
      // Find min and max for scaling
      const minPrice = Math.min(...prices)
      const maxPrice = Math.max(...prices)
      const priceRange = maxPrice - minPrice

      // Padding
      const padding = 20
      const innerHeight = height - 2 * padding
      const innerWidth = width - 2 * padding

      // Style
      ctx.lineWidth = 2
      ctx.strokeStyle = '#8884d8'
      ctx.fillStyle = '#8884d8'

      // Draw axes
      ctx.beginPath()
      ctx.moveTo(padding, padding)
      ctx.lineTo(padding, height - padding)
      ctx.lineTo(width - padding, height - padding)
      ctx.stroke()

      // Plot points
      ctx.beginPath()
      historicalData.forEach((dataPoint, index) => {
        const x = padding + (index / (historicalData.length - 1)) * innerWidth
        const normalizedPrice = priceRange ? (dataPoint.price - minPrice) / priceRange : 0.5
        const y = height - padding - normalizedPrice * innerHeight

        if (index === 0) {
          ctx.moveTo(x, y)
        } else {
          ctx.lineTo(x, y)
        }
      })
      ctx.stroke()

      // Add price labels
      ctx.fillStyle = '#333'
      ctx.font = '12px Arial'
      ctx.textAlign = 'right'
      ctx.fillText(`$${maxPrice.toFixed(2)}`, padding - 5, padding + 5)
      ctx.fillText(`$${minPrice.toFixed(2)}`, padding - 5, height - padding)

      // Add date labels (first and last)
      if (historicalData.length > 0) {
        const firstDataPoint = historicalData[0]
        const lastDataPoint = historicalData[historicalData.length - 1]

        if (firstDataPoint && lastDataPoint) {
          const firstDate = firstDataPoint.timestamp
          const lastDate = lastDataPoint.timestamp

          ctx.textAlign = 'left'
          ctx.fillText(firstDate.toLocaleDateString(), padding, height - padding + 15)

          ctx.textAlign = 'right'
          ctx.fillText(lastDate.toLocaleDateString(), width - padding, height - padding + 15)
        }
      }
    }
  }, [historicalData])

  const renderPriceContent = () => {
    if (error) {
      return <p className="error">Error fetching price</p>
    }
    if (price !== undefined) {
      return <h1 className="price">${price.toFixed(2)}</h1>
    }
    return <p className="loading">Loading price...</p>
  }

  const renderChart = () => {
    if (historicalError) {
      return <p className="error">Error fetching historical data</p>
    }
    if (!historicalData) {
      return <p className="loading">Loading chart...</p>
    }

    return (
      <div className="chart-container">
        <h2>30-Day Price History</h2>
        <canvas ref={chartRef} width="600" height="300" className="price-chart" />
      </div>
    )
  }

  return (
    <main className="container">
      <div className="price-container">{renderPriceContent()}</div>
      <div className="chart-section">{renderChart()}</div>
    </main>
  )
}

export default App
