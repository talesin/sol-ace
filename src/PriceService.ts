import { Data, Effect, Either, Layer, Schema } from 'effect'
import { HttpClient, HttpClientError } from '@effect/platform'
import { ParseError } from 'effect/ParseResult'

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

    // Shared error handling function for each specific error type
    const handleCoinGeckoError =
      <T>(
        errorPrefix: string,
        errorConstructor: new (params: {
          message: string
          statusCode?: number
          cause: unknown
        }) => T
      ) =>
      (error: HttpClientError.HttpClientError | ParseError) => {
        return Schema.decodeUnknownEither(CoinGeckoErrorSchema)(
          error._tag === 'ParseError' ? error.issue.actual : error
        ).pipe(
          Either.match({
            onRight: (apiError) => {
              return new errorConstructor({
                message: `CoinGecko API Error: ${apiError.status.error_message}`,
                statusCode: apiError.status.error_code,
                cause: apiError
              })
            },
            onLeft: () => {
              return new errorConstructor({
                message: `${errorPrefix}: ${error}`,
                cause: error
              })
            }
          })
        )
      }

    const getPrice = () => {
      return Effect.gen(function* () {
        // Make the HTTP request
        const response = yield* httpClient.get(CoingeckoUrl)
        const rawResponse = yield* response.json

        // Try to decode as a successful response
        const result = yield* Schema.decodeUnknown(CoingeckoResponse)(rawResponse)
        return result.solana.usd
      }).pipe(Effect.mapError(handleCoinGeckoError('Failed to fetch price', GetPriceError)))
    }

    const getHistoricalPrices = () => {
      return Effect.gen(function* () {
        // Make the HTTP request
        const response = yield* httpClient.get(CoingeckoHistoricalUrl)
        const rawResponse = yield* response.json

        // Try to decode as a successful response
        const result = yield* Schema.decodeUnknown(HistoricalDataResponse)(rawResponse)
        return result.prices.map(([timestamp, price]) => ({
          timestamp: new Date(timestamp),
          price
        }))
      }).pipe(
        Effect.mapError(
          handleCoinGeckoError('Failed to fetch historical data', GetHistoricalDataError)
        )
      )
    }

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
