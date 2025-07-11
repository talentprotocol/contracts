import { CID } from 'multiformats/cid';
import { toUrlSearchParams } from '../lib/to-url-search-params.js';
export function createFlush(client) {
    return async function flush(path, options = {}) {
        if (typeof path !== 'string') {
            throw new Error('ipfs.files.flush requires a path');
        }
        const res = await client.post('files/flush', {
            signal: options.signal,
            searchParams: toUrlSearchParams({
                arg: path,
                ...options
            }),
            headers: options.headers
        });
        const data = await res.json();
        return CID.parse(data.Cid);
    };
}
//# sourceMappingURL=flush.js.map