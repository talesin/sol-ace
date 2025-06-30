import { Data, Effect, Layer } from 'effect'
import { HttpClient } from '@effect/platform'
import * as Schema from 'effect/Schema'

// Error
export class GetPriceError extends Data.TaggedError('GetPriceError')<{
  message: string
  readonly cause: unknown
}> {}

// Schema
const CoingeckoResponse = Schema.Struct({
  solana: Schema.Struct({
    usd: Schema.Number
  })
})

// Service
const CoingeckoUrl = 'https://api.coingecko.com/api/v3/simple/price?ids=solana&vs_currencies=usd'

export class PriceService extends Effect.Service<PriceService>()('PriceService', {
  effect: Effect.gen(function* () {
    const httpClient = yield* HttpClient.HttpClient

    const getPrice = () =>
      httpClient.get(CoingeckoUrl).pipe(
        Effect.flatMap((res) => res.json),
        Effect.flatMap(Schema.decodeUnknown(CoingeckoResponse)), // Use decodeUnknown for safety
        Effect.map((res) => res.solana.usd),
        Effect.mapError(
          (cause) => new GetPriceError({ message: `Failed to fetch price: ${cause}`, cause })
        )
      )

    return {
      getPrice
    }
  })
}) {}

// Test Layer
export const TestPriceServiceLayer = (fn?: {
  getPrice?: () => Effect.Effect<number, GetPriceError>
}) =>
  Layer.succeed(
    PriceService,
    PriceService.of({
      _tag: 'PriceService',
      getPrice: fn?.getPrice ?? (() => Effect.succeed(123))
    })
  )

// Entrypoint
export const getSolPrice = () => Effect.flatMap(PriceService, (service) => service.getPrice())
