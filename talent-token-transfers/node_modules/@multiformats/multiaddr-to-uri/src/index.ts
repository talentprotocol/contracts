/**
 * @packageDocumentation
 *
 * This module allows easy conversion of Multiaddrs to string URIs.
 *
 * @example Converting multiaddrs to string URIs
 *
 * ```js
 * import { multiaddrToUri } from '@multiformats/multiaddr-to-uri'
 *
 * console.log(multiaddrToUri('/dnsaddr/protocol.ai/https'))
 * // -> https://protocol.ai
 *
 * console.log(multiaddrToUri('/ip4/127.0.0.1/tcp/8080'))
 * // -> http://127.0.0.1:8080
 *
 * console.log(multiaddrToUri('/ip4/127.0.0.1/tcp/8080', { assumeHttp: false }))
 * // -> tcp://127.0.0.1:8080
 * ```
 *
 * Note:
 *
 * - When `/tcp` is the last (terminating) protocol HTTP is assumed by default (implicit `assumeHttp: true`)
 *   - this means produced URIs will start with `http://` instead of `tcp://`
 *   - passing `{ assumeHttp: false }` disables this behavior
 * - Might be lossy - e.g. a DNSv6 multiaddr
 * - Can throw if the passed multiaddr:
 *   - is not a valid multiaddr
 *   - is not supported as a URI e.g. circuit
 */

import { CODE_TCP, CODE_DNS, CODE_DNS4, CODE_DNS6, CODE_DNSADDR, multiaddr, CODE_TLS, CODE_IP6 } from '@multiformats/multiaddr'
import type { Component, Multiaddr } from '@multiformats/multiaddr'

export interface MultiaddrToUriOpts {
  assumeHttp?: boolean
}

const ASSUME_HTTP_CODES = [
  CODE_TCP,
  CODE_DNS,
  CODE_DNSADDR,
  CODE_DNS4,
  CODE_DNS6
]

interface Interpreter {
  (head: Component, rest: Component[]): string | undefined
}

function extractSNI (ma: Component[]): string | undefined {
  return extractTuple('sni', ma)?.value
}

function extractPort (ma: Component[]): string {
  const port = extractTuple('tcp', ma)?.value

  if (port == null) {
    return ''
  }

  return `:${port}`
}

function extractTuple (name: string, ma: Component[]): Component | undefined {
  return ma.find(component => component.name === name)
}

function hasTLS (ma: Component[]): boolean {
  return ma.some(({ code }) => code === CODE_TLS)
}

function interpretNext (head: Component, rest: Component[]): string | undefined {
  const interpreter = interpreters[head.name]
  if (interpreter == null) {
    throw new Error(`Can't interpret protocol ${head.name}`)
  }
  const restVal = interpreter(head, rest)
  if (head.code === CODE_IP6) {
    return `[${restVal}]`
  }
  return restVal
}

const interpreters: Record<string, Interpreter> = {
  ip4: (head, rest) => head.value,
  ip6: (head, rest) => {
    if (rest.length === 0) {
      return head.value
    }
    return `[${head.value}]`
  },
  tcp: (head, rest) => {
    const tail = rest.pop()
    if (tail == null) {
      throw new Error('Unexpected end of multiaddr')
    }
    return `tcp://${interpretNext(tail, rest)}:${head.value}`
  },
  udp: (head, rest) => {
    const tail = rest.pop()
    if (tail == null) {
      throw new Error('Unexpected end of multiaddr')
    }
    return `udp://${interpretNext(tail, rest)}:${head.value}`
  },
  dnsaddr: (head, rest) => head.value,
  dns4: (head, rest) => head.value,
  dns6: (head, rest) => head.value,
  dns: (head, rest) => head.value,
  ipfs: (head, rest) => {
    const tail = rest.pop()
    if (tail == null) {
      throw new Error('Unexpected end of multiaddr')
    }
    return `${interpretNext(tail, rest)}`
  },
  p2p: (head, rest) => {
    const tail = rest.pop()
    if (tail == null) {
      throw new Error('Unexpected end of multiaddr')
    }
    return `${interpretNext(tail, rest)}`
  },
  http: (head, rest) => {
    const maHasTLS = hasTLS(rest)
    const sni = extractSNI(rest)
    const port = extractPort(rest)
    if (maHasTLS && sni != null) {
      return `https://${sni}${port}`
    }
    const protocol = maHasTLS ? 'https://' : 'http://'
    const tail = rest.pop()
    if (tail == null) {
      throw new Error('Unexpected end of multiaddr')
    }
    let baseVal = interpretNext(tail, rest)
    // We are reinterpreting the base as http, so we need to remove the tcp:// if it's there
    baseVal = baseVal?.replace('tcp://', '')
    return `${protocol}${baseVal}`
  },
  'http-path': (head, rest) => {
    const tail = rest.pop()
    if (tail == null) {
      throw new Error('Unexpected end of multiaddr')
    }
    const baseVal = interpretNext(tail, rest)
    const decodedValue = decodeURIComponent(head.value ?? '')
    return `${baseVal}${decodedValue}`
  },
  tls: (head, rest) => {
    // Noop, the parent context knows that it's tls. We don't need to do
    // anything here
    const tail = rest.pop()
    if (tail == null) {
      throw new Error('Unexpected end of multiaddr')
    }
    return interpretNext(tail, rest)
  },
  sni: (head, rest) => {
    // Noop, the parent context uses the sni information, we don't need to do
    // anything here
    const tail = rest.pop()
    if (tail == null) {
      throw new Error('Unexpected end of multiaddr')
    }
    return interpretNext(tail, rest)
  },
  https: (head, rest) => {
    const tail = rest.pop()
    if (tail == null) {
      throw new Error('Unexpected end of multiaddr')
    }
    let baseVal = interpretNext(tail, rest)
    // We are reinterpreting the base as http, so we need to remove the tcp:// if it's there
    baseVal = baseVal?.replace('tcp://', '')
    return `https://${baseVal}`
  },
  ws: (head, rest) => {
    const maHasTLS = hasTLS(rest)
    const sni = extractSNI(rest)
    const port = extractPort(rest)
    if (maHasTLS && sni != null) {
      return `wss://${sni}${port}`
    }
    const protocol = maHasTLS ? 'wss://' : 'ws://'
    const tail = rest.pop()
    if (tail == null) {
      throw new Error('Unexpected end of multiaddr')
    }
    let baseVal = interpretNext(tail, rest)
    // We are reinterpreting the base, so we need to remove the tcp:// if it's there
    baseVal = baseVal?.replace('tcp://', '')
    return `${protocol}${baseVal}`
  },
  wss: (head, rest) => {
    const tail = rest.pop()
    if (tail == null) {
      throw new Error('Unexpected end of multiaddr')
    }
    let baseVal = interpretNext(tail, rest)
    // We are reinterpreting the base as http, so we need to remove the tcp:// if it's there
    baseVal = baseVal?.replace('tcp://', '')
    return `wss://${baseVal}`
  }
}

export function multiaddrToUri (input: Multiaddr | string | Uint8Array, opts?: MultiaddrToUriOpts): string {
  const ma = multiaddr(input)
  const components = ma.getComponents()
  const head = components.pop()
  if (head == null) {
    throw new Error('Unexpected end of multiaddr')
  }

  const interpreter = interpreters[head.name]

  if (interpreter == null) {
    throw new Error(`No interpreter found for ${head.name}`)
  }

  let uri = interpreter(head, components) ?? ''

  if (opts?.assumeHttp !== false && ASSUME_HTTP_CODES.includes(head.code)) {
    // strip any declared protocol
    uri = uri.replace(/^.*:\/\//, '')

    if (head.value === '443') {
      uri = `https://${uri}`
    } else {
      uri = `http://${uri}`
    }
  }

  if (uri.startsWith('http://') || uri.startsWith('https://') || uri.startsWith('ws://') || uri.startsWith('wss://')) {
    // this will strip default ports while keeping paths intact
    uri = new URL(uri).toString()

    // strip trailing slash, e.g. http://127.0.0.1/ -> http://127.0.0.1
    if (uri.endsWith('/')) {
      uri = uri.substring(0, uri.length - 1)
    }
  }

  return uri
}
