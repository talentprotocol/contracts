import { objectToCamel } from '../../lib/object-to-camel.js';
import { toUrlSearchParams } from '../../lib/to-url-search-params.js';
export function createState(client) {
    return async function state(options = {}) {
        const res = await client.post('name/pubsub/state', {
            signal: options.signal,
            searchParams: toUrlSearchParams(options),
            headers: options.headers
        });
        return objectToCamel(await res.json());
    };
}
//# sourceMappingURL=state.js.map