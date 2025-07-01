import React from 'react'
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend
} from 'recharts'
import { HistoricalPriceData } from './PriceService'

// Format data for recharts
export const formatChartData = (historicalData: HistoricalPriceData) => {
  return historicalData.map((item) => ({
    date: item.timestamp.toLocaleDateString(),
    price: item.price,
    // Store the original timestamp for sorting if needed
    timestamp: item.timestamp
  }))
}

// The main chart component
export const PriceHistoryChart: React.FC<{
  historicalData: HistoricalPriceData
  width?: number | string
  height?: number | string
}> = ({ historicalData, width = '100%', height = 300 }) => {
  if (historicalData.length === 0) {
    return <div>No historical data available</div>
  }

  const data = formatChartData(historicalData)

  return (
    <ResponsiveContainer width={width} height={height}>
      <LineChart data={data} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
        <CartesianGrid strokeDasharray="3 3" />
        <XAxis
          dataKey="date"
          tick={{ fontSize: 12 }}
          tickFormatter={(value) => {
            // Show dates more frequently for better interpretation
            const index = data.findIndex((item) => item.date === value)
            // Show dates at start, end, and every 3 days (or adjust as needed)
            return index === 0 || index === data.length - 1 || index % 3 === 0 ? value : ''
          }}
          label={{ value: 'Date', position: 'insideBottom', offset: -5 }}
        />
        <YAxis
          tick={{ fontSize: 12 }}
          tickFormatter={(value) => `$${value.toFixed(2)}`}
          domain={['auto', 'auto']}
          label={{ value: 'Price (USD)', angle: -90, position: 'insideLeft' }}
        />
        <Tooltip
          formatter={(value) => [`$${Number(value).toFixed(2)}`, 'Price']}
          labelFormatter={(label) => `Date: ${label}`}
        />
        <Legend />
        <Line
          name="Solana Price"
          type="monotone"
          dataKey="price"
          stroke="#8884d8"
          strokeWidth={2}
          dot={{ r: 2 }}
          activeDot={{ r: 6 }}
          animationDuration={500}
        />
      </LineChart>
    </ResponsiveContainer>
  )
}
