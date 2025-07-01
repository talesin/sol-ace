import { Effect, Stream } from 'effect'
import { HttpClient, Headers, HttpClientError, HttpClientResponse } from '@effect/platform'
import { fetch } from '@tauri-apps/plugin-http'

// fetch wrapper pattern from @effect/platform/src/internal/fetchHttpClient.ts

const tauriFetch: HttpClient.HttpClient = HttpClient.make((request, url, signal, _fiber) => {
  const options: RequestInit = {}
  const headers = options.headers
    ? Headers.merge(Headers.fromInput(options.headers), request.headers)
    : request.headers
  const send = Effect.fn(function* (body: BodyInit | undefined) {
    const response = yield* Effect.tryPromise({
      try: () =>
        fetch(url, {
          ...options,
          method: request.method,
          headers,
          body,
          // duplex: request.body._tag === 'Stream' ? 'half' : undefined,
          signal
        } as RequestInit),
      catch: (cause) =>
        new HttpClientError.RequestError({
          request,
          reason: 'Transport',
          cause
        })
    })

    return HttpClientResponse.fromWeb(request, response)
  })

  switch (request.body._tag) {
    case 'Raw':
    case 'Uint8Array':
      return send(request.body.body as BodyInit)
    case 'FormData':
      return send(request.body.formData)
    case 'Stream':
      return Effect.flatMap(Stream.toReadableStreamEffect(request.body.stream), send)
  }
  return send(undefined)
})

export default HttpClient.layerMergedContext(Effect.succeed(tauriFetch))
