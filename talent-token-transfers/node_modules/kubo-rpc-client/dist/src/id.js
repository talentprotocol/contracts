import { peerIdFromString } from '@libp2p/peer-id';
import { multiaddr } from '@multiformats/multiaddr';
import { objectToCamel } from './lib/object-to-camel.js';
import { toUrlSearchParams } from './lib/to-url-search-params.js';
export function createId(client) {
    return async function id(options = {}) {
        const res = await client.post('id', {
            signal: options.signal,
            searchParams: toUrlSearchParams({
                arg: options.peerId != null ? options.peerId.toString() : undefined,
                ...options
            }),
            headers: options.headers
        });
        const data = await res.json();
        const output = {
            ...objectToCamel(data)
        };
        output.id = peerIdFromString(output.id);
        if (output.addresses != null) {
            output.addresses = output.addresses.map((ma) => multiaddr(ma));
        }
        return output;
    };
}
//# sourceMappingURL=id.js.map