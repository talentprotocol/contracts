import { CID } from 'multiformats/cid';
import { toUrlSearchParams } from '../lib/to-url-search-params.js';
export function createUpdate(client) {
    return async function update(from, to, options = {}) {
        const res = await client.post('pin/update', {
            signal: options.signal,
            searchParams: toUrlSearchParams({
                ...options,
                arg: [from.toString(), to.toString()]
            }),
            headers: options.headers
        });
        const { Pins } = await res.json();
        return Pins.map((cid) => CID.parse(cid));
    };
}
//# sourceMappingURL=update.js.map