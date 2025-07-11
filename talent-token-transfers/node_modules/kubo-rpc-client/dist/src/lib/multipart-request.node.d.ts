import type { MultipartRequest } from './multipart-request.js';
import type { ImportCandidateStream } from '../index.js';
/**
 * @typedef {import('ipfs-core-types/src/utils').ImportCandidateStream} ImportCandidateStream
 */
/**
 * @param {ImportCandidateStream} source
 * @param {AbortController} abortController
 * @param {Headers|Record<string, string>} [headers]
 * @param {string} [boundary]
 */
export declare function multipartRequest(source: ImportCandidateStream, abortController: AbortController, headers?: Headers | Record<string, string>, boundary?: string): Promise<MultipartRequest>;
//# sourceMappingURL=multipart-request.node.d.ts.map