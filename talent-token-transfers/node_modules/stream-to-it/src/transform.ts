import { duplex } from './duplex.js'
import type { Source, Transform } from 'it-stream-types'
import type { Duplex } from 'node:stream'

/**
 * Convert a [`Transform`](https://nodejs.org/dist/latest/docs/api/stream.html#class-streamtransform)
 * stream to an [iterable transform](https://achingbrain.github.io/it-stream-types/interfaces/Transform.html).
 */
export function transform <Input = unknown, Output = Input> (transform: Duplex): Transform<Source<Input>, AsyncGenerator<Output>> {
  return async function * (source: Source<Input>): AsyncGenerator<Output> {
    const d = duplex<Output, Input>(transform)
    // In a transform the sink and source are connected, an error in the sink
    // will be thrown in the source also. Catch the sink error to avoid unhandled
    // rejections and yield from the source.
    let sinkError: Error | undefined

    d.sink(source)
      .catch((err: Error) => {
        sinkError = err
      })

    yield * d.source

    if (sinkError != null) {
      throw sinkError
    }
  }
}
