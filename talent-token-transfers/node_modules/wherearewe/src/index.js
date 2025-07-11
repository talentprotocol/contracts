import detectElectron from 'is-electron'

export const isEnvWithDom = typeof window === 'object' && typeof document === 'object' && document.nodeType === 9
export const isElectron = detectElectron()

/**
 * Detects browser main thread  **NOT** web worker or service worker
 */
export const isBrowser = isEnvWithDom && !isElectron
export const isElectronMain = isElectron && !isEnvWithDom
export const isElectronRenderer = isElectron && isEnvWithDom
export const isNode = typeof globalThis.process !== 'undefined' && typeof globalThis.process.release !== 'undefined' && globalThis.process.release.name === 'node' && !isElectron
// @ts-ignore
// eslint-disable-next-line no-undef
export const isWebWorker = typeof importScripts === 'function' && typeof self !== 'undefined' && typeof WorkerGlobalScope !== 'undefined' && self instanceof WorkerGlobalScope

// defeat bundlers replacing process.env.NODE_ENV with "development" or whatever
export const isTest = typeof globalThis.process !== 'undefined' && typeof globalThis.process.env !== 'undefined' && globalThis.process.env['NODE' + (() => '_')() + 'ENV'] === 'test'
export const isReactNative = typeof navigator !== 'undefined' && navigator.product === 'ReactNative'
