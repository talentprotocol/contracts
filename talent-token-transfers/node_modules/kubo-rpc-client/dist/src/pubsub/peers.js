import { textToUrlSafeRpc } from '../lib/http-rpc-wire-format.js';
import { toUrlSearchParams } from '../lib/to-url-search-params.js';
export function createPeers(client) {
    return async function peers(topic, options = {}) {
        const res = await client.post('pubsub/peers', {
            signal: options.signal,
            searchParams: toUrlSearchParams({
                arg: textToUrlSafeRpc(topic),
                ...options
            }),
            headers: options.headers
        });
        const { Strings } = await res.json();
        return Strings ?? [];
    };
}
//# sourceMappingURL=peers.js.map