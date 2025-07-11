/**
 * @param {any} node
 * @returns {PBNode}
 */
export function prepare(node: any): PBNode;
/**
 * @param {PBNode} node
 */
export function validate(node: PBNode): void;
/**
 * @param {Uint8Array} data
 * @param {PBLink[]} [links]
 * @returns {PBNode}
 */
export function createNode(data: Uint8Array, links?: PBLink[]): PBNode;
/**
 * @param {string} name
 * @param {number} size
 * @param {CID} cid
 * @returns {PBLink}
 */
export function createLink(name: string, size: number, cid: CID): PBLink;
/**
 * @template T
 * @param {ByteView<T> | ArrayBufferView<T>} buf
 * @returns {ByteView<T>}
 */
export function toByteView<T>(buf: ByteView<T> | ArrayBufferView<T>): ByteView<T>;
export type PBLink = import("./interface.js").PBLink;
export type PBNode = import("./interface.js").PBNode;
export type ByteView<T> = import("multiformats/codecs/interface").ByteView<T>;
export type ArrayBufferView<T> = import("multiformats/codecs/interface").ArrayBufferView<T>;
import { CID } from 'multiformats/cid';
//# sourceMappingURL=util.d.ts.map