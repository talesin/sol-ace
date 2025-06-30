import { useState, useEffect } from 'react'
import { getSolPrice } from './api'
import './App.css'

function App() {
  const [price, setPrice] = useState<number | undefined>(undefined)

  useEffect(() => {
    const fetchPrice = async () => {
      const solPrice = await getSolPrice()
      setPrice(solPrice)
    }

    fetchPrice()

    const interval = setInterval(fetchPrice, 60000) // Refresh every 60 seconds

    return () => clearInterval(interval)
  }, [])

  return (
    <main className="container">
      {price !== undefined ? <h1>${price.toFixed(2)}</h1> : <p>Loading...</p>}
    </main>
  )
}

export default App
