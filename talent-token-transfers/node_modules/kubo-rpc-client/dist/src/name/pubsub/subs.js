import { toUrlSearchParams } from '../../lib/to-url-search-params.js';
export function createSubs(client) {
    return async function subs(options = {}) {
        const res = await client.post('name/pubsub/subs', {
            signal: options.signal,
            searchParams: toUrlSearchParams(options),
            headers: options.headers
        });
        const data = await res.json();
        return data.Strings ?? [];
    };
}
//# sourceMappingURL=subs.js.map