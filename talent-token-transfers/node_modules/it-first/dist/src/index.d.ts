/**
 * @packageDocumentation
 *
 * Return the first value in an (async)iterable
 *
 * @example
 *
 * ```javascript
 * import first from 'it-first'
 *
 * // This can also be an iterator, generator, etc
 * const values = [0, 1, 2, 3, 4]
 *
 * const res = first(values)
 *
 * console.info(res) // 0
 * ```
 *
 * Async sources must be awaited:
 *
 * ```javascript
 * import first from 'it-first'
 *
 * const values = async function * () {
 *   yield * [0, 1, 2, 3, 4]
 * }
 *
 * const res = await first(values())
 *
 * console.info(res) // 0
 * ```
 */
/**
 * Returns the first result from an (async) iterable, unless empty, in which
 * case returns `undefined`
 */
declare function first<T>(source: Iterable<T>): T | undefined;
declare function first<T>(source: Iterable<T> | AsyncIterable<T>): Promise<T | undefined>;
export default first;
//# sourceMappingURL=index.d.ts.map