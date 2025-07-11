import type { BrowserImportCandidate } from './normalise-input-multiple.browser.js';
import type { ImportCandidate } from '../../index.js';
/**
 * Transforms any of the `ipfs.add` input types into
 *
 * ```
 * AsyncIterable<{ path, mode, mtime, content: Blob }>
 * ```
 *
 * See https://github.com/ipfs/js-ipfs/blob/master/docs/core-api/FILES.md#ipfsadddata-options
 */
export declare function normaliseInput(input: ImportCandidate): BrowserImportCandidate;
//# sourceMappingURL=normalise-input-single.browser.d.ts.map