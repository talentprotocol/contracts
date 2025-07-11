import { CID } from 'multiformats/cid';
import { toUrlSearchParams } from '../lib/to-url-search-params.js';
export function createCp(client) {
    return async function cp(sources, destination, options = {}) {
        /** @type {import('../types').IPFSPath[]} */
        const sourceArr = Array.isArray(sources) ? sources : [sources];
        const res = await client.post('files/cp', {
            signal: options.signal,
            searchParams: toUrlSearchParams({
                arg: sourceArr.concat(destination).map(src => (CID.asCID(src) != null) ? `/ipfs/${src}` : src),
                ...options
            }),
            headers: options.headers
        });
        await res.text();
    };
}
//# sourceMappingURL=cp.js.map