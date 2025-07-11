import type { Readable } from 'node:stream'

/**
 * Convert a Node.js [`Readable`](https://nodejs.org/dist/latest/docs/api/stream.html#class-streamreadable)
 * stream or a browser [`ReadableStream`](https://developer.mozilla.org/en-US/docs/Web/API/ReadableStream)
 * to an [iterable source](https://achingbrain.github.io/it-stream-types/types/Source.html).
 */
export function source <T = Uint8Array> (readable: Readable | ReadableStream<T>): AsyncGenerator<T> {
  // Browser ReadableStream
  if (isReadableStream(readable)) {
    return (async function * () {
      const reader = readable.getReader()

      try {
        while (true) {
          const { done, value } = await reader.read()

          if (done) {
            return
          }

          yield value
        }
      } finally {
        reader.releaseLock()
      }
    })()
  }

  if (isNodeStream<T>(readable)) {
    return readable
  }

  throw new Error('unknown stream')
}

function isNodeStream <T = any> (obj?: any): obj is AsyncGenerator<T> {
  return obj[Symbol.asyncIterator] != null
}

function isReadableStream (obj?: any): obj is ReadableStream {
  return typeof obj?.getReader === 'function'
}
