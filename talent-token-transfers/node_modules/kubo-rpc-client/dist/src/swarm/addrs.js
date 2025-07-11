import { peerIdFromString } from '@libp2p/peer-id';
import { multiaddr } from '@multiformats/multiaddr';
import { toUrlSearchParams } from '../lib/to-url-search-params.js';
export function createAddrs(client) {
    return async function addrs(options = {}) {
        const res = await client.post('swarm/addrs', {
            signal: options.signal,
            searchParams: toUrlSearchParams(options),
            headers: options.headers
        });
        const { Addrs } = await res.json();
        return Object.keys(Addrs).map(id => ({
            id: peerIdFromString(id),
            addrs: (Addrs[id] ?? []).map((a) => multiaddr(a))
        }));
    };
}
//# sourceMappingURL=addrs.js.map