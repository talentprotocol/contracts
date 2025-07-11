import type { ImportCandidate, ImportCandidateStream } from '../../index.js';
/**
 * Transforms any of the `ipfs.addAll` input types into
 *
 * ```
 * AsyncIterable<{ path, mode, mtime, content: AsyncIterable<Uint8Array> }>
 * ```
 *
 * See https://github.com/ipfs/js-ipfs/blob/master/docs/core-api/FILES.md#ipfsadddata-options
 */
export declare function normaliseInput(input: ImportCandidateStream): AsyncGenerator<ImportCandidate, void, undefined>;
//# sourceMappingURL=normalise-input-multiple.d.ts.map