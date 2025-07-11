import { sink } from './sink.js'
import { source } from './source.js'
import type { Source, Duplex as ItDuplex } from 'it-stream-types'
import type { Duplex } from 'node:stream'

/**
 * Convert a Node.js [`Duplex`](https://nodejs.org/dist/latest/docs/api/stream.html#class-streamduplex)
 * stream to a [duplex iterable](https://achingbrain.github.io/it-stream-types/interfaces/Duplex.html).
 */
export function duplex <TSource = Uint8Array, TSink = TSource> (duplex: Duplex): ItDuplex<AsyncGenerator<TSource>, Source<TSink>, Promise<void>> {
  return {
    sink: sink(duplex),
    source: source(duplex)
  }
}
