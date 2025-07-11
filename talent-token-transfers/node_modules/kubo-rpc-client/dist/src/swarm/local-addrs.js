import { multiaddr } from '@multiformats/multiaddr';
import { toUrlSearchParams } from '../lib/to-url-search-params.js';
export function createLocalAddrs(client) {
    return async function localAddrs(options = {}) {
        const res = await client.post('swarm/addrs/local', {
            signal: options.signal,
            searchParams: toUrlSearchParams(options),
            headers: options.headers
        });
        const { Strings } = await res.json();
        return (Strings ?? []).map((a) => multiaddr(a));
    };
}
//# sourceMappingURL=local-addrs.js.map