import { useState, useEffect } from 'react'
import { getSolPrice, GetPriceError, PriceService } from './api'
import './App.css'
import { Effect, Exit, Cause } from 'effect'
import { FetchHttpClient } from '@effect/platform'

function App() {
  const [price, setPrice] = useState<number | undefined>(undefined)
  const [error, setError] = useState<GetPriceError | undefined>(undefined)

  useEffect(() => {
    const program = getSolPrice().pipe(
      Effect.provide(PriceService.Default),
      Effect.provide(FetchHttpClient.layer),
      Effect.runPromiseExit
    )

    const runFetch = () => {
      program.then((exit: Exit.Exit<number, GetPriceError>) => {
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

    runFetch()
    const interval = setInterval(runFetch, 60000) // Refresh every 60 seconds

    return () => clearInterval(interval)
  }, [])

  const renderContent = () => {
    if (error) {
      return <p>Error fetching price</p>
    }
    if (price !== undefined) {
      return <h1>${price.toFixed(2)}</h1>
    }
    return <p>Loading...</p>
  }

  return <main className="container">{renderContent()}</main>
}

export default App
