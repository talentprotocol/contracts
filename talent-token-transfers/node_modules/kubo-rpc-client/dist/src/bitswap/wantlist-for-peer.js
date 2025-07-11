import { CID } from 'multiformats/cid';
import { toUrlSearchParams } from '../lib/to-url-search-params.js';
export function createWantlistForPeer(client) {
    return async function wantlistForPeer(peerId, options = {}) {
        const res = await (await client.post('bitswap/wantlist', {
            signal: options.signal,
            searchParams: toUrlSearchParams({
                ...options,
                peer: peerId.toString()
            }),
            headers: options.headers
        })).json();
        return (res.Keys ?? []).map((k) => CID.parse(k['/']));
    };
}
//# sourceMappingURL=wantlist-for-peer.js.map