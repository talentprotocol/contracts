/**
 * @packageDocumentation
 *
 * Return the last value from an (async)iterable.
 *
 * @example
 *
 * ```javascript
 * import last from 'it-last'
 *
 * // This can also be an iterator, generator, etc
 * const values = [0, 1, 2, 3, 4]
 *
 * const res = last(values)
 *
 * console.info(res) // 4
 * ```
 *
 * Async sources must be awaited:
 *
 * ```javascript
 * import last from 'it-last'
 *
 * const values = async function * () {
 *   yield * [0, 1, 2, 3, 4]
 * }
 *
 * const res = await last(values())
 *
 * console.info(res) // 4
 * ```
 */
/**
 * Returns the last item of an (async) iterable, unless empty, in which case
 * return `undefined`
 */
declare function last<T>(source: Iterable<T>): T | undefined;
declare function last<T>(source: Iterable<T> | AsyncIterable<T>): Promise<T | undefined>;
export default last;
//# sourceMappingURL=index.d.ts.map