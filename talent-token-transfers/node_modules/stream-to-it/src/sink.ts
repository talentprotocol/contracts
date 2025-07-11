import type { Sink, Source } from 'it-stream-types'
import type { Writable } from 'node:stream'

/**
 * Convert a Node.js [`Writable`](https://nodejs.org/dist/latest/docs/api/stream.html#class-streamwritable)
 * stream to a [sink](https://achingbrain.github.io/it-stream-types/interfaces/Sink.html).
 */
export function sink <T> (writable: Writable): Sink<Source<T>, Promise<void>> {
  return async (source: Source<T>): Promise<void> => {
    const maybeEndSource = async (): Promise<void> => {
      if (isAsyncGenerator(source)) {
        await source.return(undefined)
      }
    }

    let error: Error | undefined
    let errCb: ((err: Error) => void) | undefined
    const errorHandler = (err: Error): void => {
      error = err

      // When the writable errors, try to end the source to exit iteration early
      maybeEndSource()
        .catch(err => {
          err = new AggregateError([
            error,
            err
          ], 'The Writable emitted an error, additionally an error occurred while ending the Source')
        })
        .finally(() => {
          errCb?.(err)
        })
    }

    let closeCb: (() => void) | undefined
    let closed = false
    const closeHandler = (): void => {
      closed = true
      closeCb?.()
    }

    let finishCb: (() => void) | undefined
    let finished = false
    const finishHandler = (): void => {
      finished = true
      finishCb?.()
    }

    let drainCb: (() => void) | undefined
    const drainHandler = (): void => {
      drainCb?.()
    }

    const waitForDrainOrClose = async (): Promise<void> => {
      return new Promise<void>((resolve, reject) => {
        closeCb = drainCb = resolve
        errCb = reject

        writable.once('drain', drainHandler)
      })
    }

    const waitForDone = async (): Promise<void> => {
      // Immediately try to end the source
      await maybeEndSource()

      return new Promise<void>((resolve, reject) => {
        if (closed || finished || (error != null)) {
          resolve()
          return
        }

        finishCb = closeCb = resolve
        errCb = reject
      })
    }

    const cleanup = (): void => {
      writable.removeListener('error', errorHandler)
      writable.removeListener('close', closeHandler)
      writable.removeListener('finish', finishHandler)
      writable.removeListener('drain', drainHandler)
    }

    writable.once('error', errorHandler)
    writable.once('close', closeHandler)
    writable.once('finish', finishHandler)

    try {
      for await (const value of source) {
        if (!writable.writable || writable.destroyed || (error != null)) {
          break
        }

        if (!writable.write(value as any)) {
          await waitForDrainOrClose()
        }
      }
    } catch (err: any) {
      // error is set by stream error handler so only destroy stream if source
      // threw
      if (error == null) {
        writable.destroy(err)
      }

      // could we be obscuring an error here?
      error = err
    }

    try {
      // We're done writing, end everything (n.b. stream may be destroyed at this
      // point but then this is a no-op)
      if (writable.writable) {
        writable.end()
      }

      // Wait until we close or finish. This supports halfClosed streams
      await waitForDone()

      // Notify the user an error occurred
      if (error != null) throw error
    } finally {
      // Clean up listeners
      cleanup()
    }
  }
}

function isAsyncGenerator <T = any> (obj?: any): obj is AsyncGenerator<T> {
  return obj.return != null
}
