import { toUrlSearchParams } from '../lib/to-url-search-params.js';
export function createGet(client) {
    return async function get(cid, options = {}) {
        const res = await client.post('block/get', {
            signal: options.signal,
            searchParams: toUrlSearchParams({
                arg: cid.toString(),
                ...options
            }),
            headers: options.headers
        });
        return new Uint8Array(await res.arrayBuffer());
    };
}
//# sourceMappingURL=get.js.map