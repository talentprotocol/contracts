import { mapEvent } from '../dht/map-event.js';
import { toUrlSearchParams } from '../lib/to-url-search-params.js';
export function createProvide(client) {
    return async function* provide(cids, options = { recursive: false }) {
        const cidArr = Array.isArray(cids) ? cids : [cids];
        const res = await client.post('routing/provide', {
            signal: options.signal,
            searchParams: toUrlSearchParams({
                arg: cidArr.map(cid => cid.toString()),
                ...options
            }),
            headers: options.headers
        });
        for await (const event of res.ndjson()) {
            yield mapEvent(event);
        }
    };
}
//# sourceMappingURL=provide.js.map