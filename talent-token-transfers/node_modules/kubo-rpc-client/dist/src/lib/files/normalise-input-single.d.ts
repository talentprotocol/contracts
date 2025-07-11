import type { ImportCandidate } from '../../index.js';
/**
 * Transforms any of the `ipfs.add` input types into
 *
 * ```
 * AsyncIterable<{ path, mode, mtime, content: AsyncIterable<Uint8Array> }>
 * ```
 *
 * See https://github.com/ipfs/js-ipfs/blob/master/docs/core-api/FILES.md#ipfsadddata-options
 */
export declare function normaliseInput(input: ImportCandidate): AsyncGenerator<ImportCandidate>;
//# sourceMappingURL=normalise-input-single.d.ts.map