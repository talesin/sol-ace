import { Data, Effect, Layer } from 'effect'
import { HttpClient } from '@effect/platform'
import * as Schema from 'effect/Schema'

// CoinGecko Error Schema
const CoinGeckoErrorSchema = Schema.Struct({
  status: Schema.Struct({
    error_code: Schema.Number,
    error_message: Schema.String
  })
})

// Errors
export class GetPriceError extends Data.TaggedError('GetPriceError')<{
  message: string
  statusCode?: number
  readonly cause: unknown
}> {}

export class GetHistoricalDataError extends Data.TaggedError('GetHistoricalDataError')<{
  message: string
  statusCode?: number
  readonly cause: unknown
}> {}

// Schemas
const CoingeckoResponse = Schema.Struct({
  solana: Schema.Struct({
    usd: Schema.Number
  })
})

// Schema for historical data response
const HistoricalDataResponse = Schema.Struct({
  prices: Schema.Array(Schema.Tuple(Schema.Number, Schema.Number))
})

// Type for processed historical price data
export type HistoricalPriceData = Array<{
  timestamp: Date
  price: number
}>

// Service
const CoingeckoUrl = 'https://api.coingecko.com/api/v3/simple/price?ids=solana&vs_currencies=usd'
const CoingeckoHistoricalUrl =
  'https://api.coingecko.com/api/v3/coins/solana/market_chart?vs_currency=usd&days=30'

export class PriceService extends Effect.Service<PriceService>()('PriceService', {
  effect: Effect.gen(function* () {
    const httpClient = yield* HttpClient.HttpClient

    const getPrice = () =>
      httpClient.get(CoingeckoUrl).pipe(
        Effect.flatMap((res) => res.json),
        Effect.flatMap((rawResponse) => {
          // Try to decode as a successful response
          return Schema.decodeUnknown(CoingeckoResponse)(rawResponse).pipe(
            Effect.map((res) => res.solana.usd),
            // If decoding as a successful response fails, try to decode as an error
            Effect.mapError(() => {
              return Schema.decodeUnknown(CoinGeckoErrorSchema)(rawResponse).pipe(
                Effect.match({
                  onSuccess: (errorRes) => {
                    return Effect.fail(
                      new GetPriceError({
                        message: `CoinGecko API Error: ${errorRes.status.error_message}`,
                        statusCode: errorRes.status.error_code,
                        cause: errorRes
                      })
                    )
                  },
                  // If it's not a standard CoinGecko error either, return generic error
                  onFailure: () => {
                    return Effect.fail(
                      new GetPriceError({
                        message: `Failed to fetch price: Unknown response format`,
                        cause: rawResponse
                      })
                    )
                  }
                })
              )
            })
          )
        }),

        Effect.mapError((cause) => {
          if (cause instanceof GetPriceError) {
            return cause
          }
          return new GetPriceError({
            message: `Failed to fetch price: ${cause}`,
            cause
          })
        })
      )

    const getHistoricalPrices = () =>
      httpClient.get(CoingeckoHistoricalUrl).pipe(
        Effect.flatMap((res) => res.json),
        Effect.flatMap((rawResponse) => {
          // Try to decode as a successful response
          return Schema.decodeUnknown(HistoricalDataResponse)(rawResponse).pipe(
            Effect.map(
              (res): HistoricalPriceData =>
                res.prices.map(([timestamp, price]) => ({
                  timestamp: new Date(timestamp),
                  price
                }))
            ),
            // If decoding as a successful response fails, try to decode as an error
            Effect.mapError(() => {
              return Schema.decodeUnknown(CoinGeckoErrorSchema)(rawResponse).pipe(
                Effect.match({
                  onSuccess: (errorRes) => {
                    return Effect.fail(
                      new GetHistoricalDataError({
                        message: `CoinGecko API Error: ${errorRes.status.error_message}`,
                        statusCode: errorRes.status.error_code,
                        cause: errorRes
                      })
                    )
                  },
                  // If it's not a standard CoinGecko error either, return generic error
                  onFailure: () => {
                    return Effect.fail(
                      new GetHistoricalDataError({
                        message: `Failed to fetch historical data: Unknown response format`,
                        cause: rawResponse
                      })
                    )
                  }
                })
              )
            })
          )
        }),
        Effect.mapError((cause) => {
          if (cause instanceof GetHistoricalDataError) {
            return cause
          }
          return new GetHistoricalDataError({
            message: `Failed to fetch historical data: ${cause}`,
            cause
          })
        })
      )

    return {
      getPrice,
      getHistoricalPrices
    }
  })
}) {}

// Test Layer
export const TestPriceServiceLayer = (fn?: {
  getPrice?: () => Effect.Effect<number, GetPriceError>
  getHistoricalPrices?: () => Effect.Effect<HistoricalPriceData, GetHistoricalDataError>
}) =>
  Layer.succeed(
    PriceService,
    PriceService.of({
      _tag: 'PriceService',
      getPrice: fn?.getPrice ?? (() => Effect.succeed(123)),
      getHistoricalPrices:
        fn?.getHistoricalPrices ??
        (() =>
          Effect.succeed([
            { timestamp: new Date(1625097600000), price: 35.23 },
            { timestamp: new Date(1625184000000), price: 34.5 },
            { timestamp: new Date(1625270400000), price: 36.12 }
          ]))
    })
  )

// Entrypoints
export const getSolPrice = () => Effect.flatMap(PriceService, (service) => service.getPrice())
export const getSolHistoricalPrices = () =>
  Effect.flatMap(PriceService, (service) => service.getHistoricalPrices())
