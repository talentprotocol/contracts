import { CID } from 'multiformats/cid';
import { toUrlSearchParams } from '../lib/to-url-search-params.js';
export function createStat(client) {
    return async function stat(cid, options = {}) {
        const res = await client.post('block/stat', {
            signal: options.signal,
            searchParams: toUrlSearchParams({
                arg: cid.toString(),
                ...options
            }),
            headers: options.headers
        });
        const data = await res.json();
        return { cid: CID.parse(data.Key), size: data.Size };
    };
}
//# sourceMappingURL=stat.js.map