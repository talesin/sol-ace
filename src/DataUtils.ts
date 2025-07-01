import { Effect, Exit, Cause, Layer } from 'effect'
import {
  getSolPrice,
  getSolHistoricalPrices,
  GetPriceError,
  GetHistoricalDataError,
  PriceService,
  HistoricalPriceData
} from './PriceService'
import TauriFetchLayer from './TauriFetchLayer'

// Type for the price update callback function
export type PriceUpdateCallback = (
  price: number | undefined,
  error: GetPriceError | undefined
) => void

// Type for the historical data update callback function
export type HistoricalDataUpdateCallback = (
  data: HistoricalPriceData | undefined,
  error: GetHistoricalDataError | undefined
) => void

export const fetchInitialData = (
  priceCallback: PriceUpdateCallback,
  historicalCallback: HistoricalDataUpdateCallback
): void => {
  const serviceLayer = Layer.provideMerge(PriceService.Default, TauriFetchLayer)

  // Current price program
  const priceProgram = getSolPrice().pipe(Effect.provide(serviceLayer), Effect.runPromiseExit)

  // Historical data program
  const historicalProgram = getSolHistoricalPrices().pipe(
    Effect.provide(serviceLayer),
    Effect.runPromiseExit
  )

  fetchCurrentPrice(priceProgram, priceCallback)
  fetchHistoricalData(historicalProgram, historicalCallback)
}

export const setupPriceRefreshInterval = (priceCallback: PriceUpdateCallback): number => {
  return window.setInterval(() => {
    const serviceLayer = Layer.provideMerge(PriceService.Default, TauriFetchLayer)
    const priceProgram = getSolPrice().pipe(Effect.provide(serviceLayer), Effect.runPromiseExit)
    fetchCurrentPrice(priceProgram, priceCallback)
  }, 60000) // Refresh price every 60 seconds
}

export const fetchCurrentPrice = (
  priceProgram: Promise<Exit.Exit<number, GetPriceError>>,
  callback: PriceUpdateCallback
): void => {
  priceProgram.then((exit: Exit.Exit<number, GetPriceError>) => {
    if (Exit.isSuccess(exit)) {
      callback(exit.value, undefined)
    } else if (Cause.isFailType(exit.cause)) {
      const error = exit.cause.error instanceof GetPriceError ? exit.cause.error : undefined
      callback(undefined, error)
      console.error(Cause.pretty(exit.cause))
    }
  })
}

export const fetchHistoricalData = (
  historicalProgram: Promise<Exit.Exit<HistoricalPriceData, GetHistoricalDataError>>,
  callback: HistoricalDataUpdateCallback
): void => {
  historicalProgram.then((exit: Exit.Exit<HistoricalPriceData, GetHistoricalDataError>) => {
    if (Exit.isSuccess(exit)) {
      callback(exit.value, undefined)
    } else if (Cause.isFailType(exit.cause)) {
      const error =
        exit.cause.error instanceof GetHistoricalDataError ? exit.cause.error : undefined
      callback(undefined, error)
      console.error(Cause.pretty(exit.cause))
    }
  })
}
