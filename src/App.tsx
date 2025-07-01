import { useState, useEffect, useRef } from 'react'
import { GetPriceError, GetHistoricalDataError, HistoricalPriceData } from './PriceService'
import './App.css'
import { renderHistoricalChart } from './ChartUtils'
import { fetchInitialData, setupPriceRefreshInterval } from './DataUtils'

// App component

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
    const updatePrice = (newPrice: number | undefined, newError: GetPriceError | undefined) => {
      setPrice(newPrice)
      setError(newError)
    }

    const updateHistoricalData = (
      data: HistoricalPriceData | undefined,
      dataError: GetHistoricalDataError | undefined
    ) => {
      setHistoricalData(data)
      setHistoricalError(dataError)
    }

    fetchInitialData(updatePrice, updateHistoricalData)
    const interval = setupPriceRefreshInterval(updatePrice)
    return () => clearInterval(interval)
  }, [])

  // Chart rendering effect
  useEffect(() => {
    if (historicalData && chartRef.current) {
      renderHistoricalChart(chartRef, historicalData)
    }
  }, [historicalData])

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
