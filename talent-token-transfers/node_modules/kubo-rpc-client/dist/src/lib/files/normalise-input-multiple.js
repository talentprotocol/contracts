import { normaliseCandidateMultiple } from './normalise-candidate-multiple.js';
import { normaliseContent } from './normalise-content.js';
/**
 * Transforms any of the `ipfs.addAll` input types into
 *
 * ```
 * AsyncIterable<{ path, mode, mtime, content: AsyncIterable<Uint8Array> }>
 * ```
 *
 * See https://github.com/ipfs/js-ipfs/blob/master/docs/core-api/FILES.md#ipfsadddata-options
 */
export function normaliseInput(input) {
    return normaliseCandidateMultiple(input, normaliseContent);
}
//# sourceMappingURL=normalise-input-multiple.js.map