/**
 * @packageDocumentation
 *
 * Adds types to the EventTarget class.
 *
 * Hopefully this won't be necessary
 * forever:
 *
 * - https://github.com/microsoft/TypeScript/issues/28357
 * - https://github.com/microsoft/TypeScript/issues/43477
 * - https://github.com/microsoft/TypeScript/issues/299
 * - https://www.npmjs.com/package/typed-events
 * - https://www.npmjs.com/package/typed-event-emitter
 * - https://www.npmjs.com/package/typed-event-target
 * - etc
 *
 * In addition to types, a `safeDispatchEvent` method is available which
 * prevents dispatching events that aren't in the event map, and a
 * `listenerCount` method which reports the number of listeners that are
 * currently registered for a given event.
 *
 * @example
 *
 * ```ts
 * import { TypedEventEmitter } from 'main-event'
 * import type { TypedEventTarget } from 'main-event'
 *
 * interface EventTypes {
 *   'test': CustomEvent<string>
 * }
 *
 * const target = new TypedEventEmitter<EventTypes>()
 *
 * // it's a regular EventTarget
 * console.info(target instanceof EventTarget) // true
 *
 * // register listeners normally
 * target.addEventListener('test', (evt) => {
 *   // evt is CustomEvent<string>
 * })
 *
 * // @ts-expect-error 'derp' is not in the event map
 * target.addEventListener('derp', () => {})
 *
 * // use normal dispatchEvent method
 * target.dispatchEvent(new CustomEvent('test', {
 *   detail: 'hello'
 * }))
 *
 * // use type safe dispatch method
 * target.safeDispatchEvent('test', {
 *   detail: 'world'
 * })
 *
 * // report listener count
 * console.info(target.listenerCount('test')) // 0
 *
 * // event emitters can be used purely as interfaces too
 * function acceptTarget (target: TypedEventTarget<EventTypes>) {
 *   // ...
 * }
 * ```
 */
import { setMaxListeners } from './events.js';
/**
 * An implementation of a typed event target
 */
export class TypedEventEmitter extends EventTarget {
    #listeners = new Map();
    constructor() {
        super();
        // silence MaxListenersExceededWarning warning on Node.js, this is a red
        // herring almost all of the time
        setMaxListeners(Infinity, this);
    }
    listenerCount(type) {
        const listeners = this.#listeners.get(type);
        if (listeners == null) {
            return 0;
        }
        return listeners.length;
    }
    addEventListener(type, listener, options) {
        super.addEventListener(type, listener, options);
        let list = this.#listeners.get(type);
        if (list == null) {
            list = [];
            this.#listeners.set(type, list);
        }
        list.push({
            callback: listener,
            once: (options !== true && options !== false && options?.once) ?? false
        });
    }
    removeEventListener(type, listener, options) {
        super.removeEventListener(type.toString(), listener ?? null, options);
        let list = this.#listeners.get(type);
        if (list == null) {
            return;
        }
        list = list.filter(({ callback }) => callback !== listener);
        this.#listeners.set(type, list);
    }
    dispatchEvent(event) {
        const result = super.dispatchEvent(event);
        let list = this.#listeners.get(event.type);
        if (list == null) {
            return result;
        }
        list = list.filter(({ once }) => !once);
        this.#listeners.set(event.type, list);
        return result;
    }
    safeDispatchEvent(type, detail = {}) {
        return this.dispatchEvent(new CustomEvent(type, detail));
    }
}
export { setMaxListeners };
//# sourceMappingURL=index.js.map