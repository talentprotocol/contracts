import { mapEvent } from '../dht/map-event.js';
import { toUrlSearchParams } from '../lib/to-url-search-params.js';
export function createFindProvs(client) {
    return async function* findProvs(cid, options = {}) {
        const res = await client.post('routing/findprovs', {
            signal: options.signal,
            searchParams: toUrlSearchParams({
                arg: cid.toString(),
                ...options
            }),
            headers: options.headers
        });
        for await (const event of res.ndjson()) {
            yield mapEvent(event);
        }
    };
}
//# sourceMappingURL=find-provs.js.map