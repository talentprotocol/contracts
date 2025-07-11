import { normaliseCandidateSingle } from './normalise-candidate-single.js';
import { normaliseContent } from './normalise-content.browser.js';
/**
 * Transforms any of the `ipfs.add` input types into
 *
 * ```
 * AsyncIterable<{ path, mode, mtime, content: Blob }>
 * ```
 *
 * See https://github.com/ipfs/js-ipfs/blob/master/docs/core-api/FILES.md#ipfsadddata-options
 */
export function normaliseInput(input) {
    // @ts-expect-error browser normaliseContent returns a Blob not an AsyncIterable<Uint8Array>
    return normaliseCandidateSingle(input, normaliseContent);
}
//# sourceMappingURL=normalise-input-single.browser.js.map