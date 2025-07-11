import { normaliseCandidateMultiple } from './normalise-candidate-multiple.js';
import { normaliseContent } from './normalise-content.browser.js';
/**
 * Transforms any of the `ipfs.addAll` input types into
 *
 * ```
 * AsyncIterable<{ path, mode, mtime, content: Blob }>
 * ```
 *
 * See https://github.com/ipfs/js-ipfs/blob/master/docs/core-api/FILES.md#ipfsadddata-options
 */
export function normaliseInput(input) {
    // @ts-expect-error browser normaliseContent returns a Blob not an AsyncIterable<Uint8Array>
    return normaliseCandidateMultiple(input, normaliseContent, true);
}
//# sourceMappingURL=normalise-input-multiple.browser.js.map