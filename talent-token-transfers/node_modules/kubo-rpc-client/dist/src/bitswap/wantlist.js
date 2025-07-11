import { CID } from 'multiformats/cid';
import { toUrlSearchParams } from '../lib/to-url-search-params.js';
export function createWantlist(client) {
    return async function wantlist(options = {}) {
        const res = await (await client.post('bitswap/wantlist', {
            signal: options.signal,
            searchParams: toUrlSearchParams(options),
            headers: options.headers
        })).json();
        return (res.Keys ?? []).map((k) => CID.parse(k['/']));
    };
}
//# sourceMappingURL=wantlist.js.map