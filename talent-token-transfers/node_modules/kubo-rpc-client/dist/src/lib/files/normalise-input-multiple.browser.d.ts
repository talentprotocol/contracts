import type { ImportCandidateStream } from '../../index.js';
import type { Mtime } from 'ipfs-unixfs';
export interface BrowserImportCandidate {
    path?: string;
    content?: Blob;
    mtime?: Mtime;
    mode?: number;
}
/**
 * Transforms any of the `ipfs.addAll` input types into
 *
 * ```
 * AsyncIterable<{ path, mode, mtime, content: Blob }>
 * ```
 *
 * See https://github.com/ipfs/js-ipfs/blob/master/docs/core-api/FILES.md#ipfsadddata-options
 */
export declare function normaliseInput(input: ImportCandidateStream): AsyncGenerator<BrowserImportCandidate, void, undefined>;
//# sourceMappingURL=normalise-input-multiple.browser.d.ts.map