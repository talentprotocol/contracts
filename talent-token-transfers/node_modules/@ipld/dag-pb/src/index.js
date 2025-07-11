import { CID } from 'multiformats/cid'
import { decodeNode } from './pb-decode.js'
import { encodeNode } from './pb-encode.js'
import { prepare, validate, createNode, createLink, toByteView } from './util.js'

/**
 * @template T
 * @typedef {import('multiformats/codecs/interface').ByteView<T>} ByteView
 */

/**
 * @template T
 * @typedef {import('multiformats/codecs/interface').ArrayBufferView<T>} ArrayBufferView
 */

/**
 * @typedef {import('./interface.js').PBLink} PBLink
 * @typedef {import('./interface.js').PBNode} PBNode
 */

export const name = 'dag-pb'
export const code = 0x70

/**
 * @param {PBNode} node
 * @returns {ByteView<PBNode>}
 */
export function encode (node) {
  validate(node)

  const pbn = {}
  if (node.Links) {
    pbn.Links = node.Links.map((l) => {
      const link = {}
      if (l.Hash) {
        link.Hash = l.Hash.bytes // cid -> bytes
      }
      if (l.Name !== undefined) {
        link.Name = l.Name
      }
      if (l.Tsize !== undefined) {
        link.Tsize = l.Tsize
      }
      return link
    })
  }
  if (node.Data) {
    pbn.Data = node.Data
  }

  return encodeNode(pbn)
}

/**
 * @param {ByteView<PBNode> | ArrayBufferView<PBNode>} bytes
 * @returns {PBNode}
 */
export function decode (bytes) {
  const buf = toByteView(bytes)
  const pbn = decodeNode(buf)

  const node = {}

  if (pbn.Data) {
    node.Data = pbn.Data
  }

  if (pbn.Links) {
    node.Links = pbn.Links.map((l) => {
      const link = {}
      try {
        link.Hash = CID.decode(l.Hash)
      } catch {
        // ignore parse fail
      }
      if (!link.Hash) {
        throw new Error('Invalid Hash field found in link, expected CID')
      }
      if (l.Name !== undefined) {
        link.Name = l.Name
      }
      if (l.Tsize !== undefined) {
        link.Tsize = l.Tsize
      }
      return link
    })
  }

  return node
}

export { prepare, validate, createNode, createLink }
