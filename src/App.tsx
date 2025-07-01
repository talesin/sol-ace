import { useState, useEffect } from 'react'
import { GetPriceError, GetHistoricalDataError, HistoricalPriceData } from './PriceService'
import './App.css'
import { PriceHistoryChart } from './ChartUtils'
import { fetchInitialData, setupPriceRefreshInterval } from './DataUtils'

// App component

function App() {
  const [price, setPrice] = useState<number | undefined>(undefined)
  const [error, setError] = useState<GetPriceError | undefined>(undefined)
  const [historicalData, setHistoricalData] = useState<HistoricalPriceData | undefined>(undefined)
  const [historicalError, setHistoricalError] = useState<GetHistoricalDataError | undefined>(
    undefined
  )

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

  // No longer need chart rendering effect with recharts

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
        <PriceHistoryChart historicalData={historicalData} width="100%" height={300} />
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
