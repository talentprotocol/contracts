import { objectToCamel } from '../../lib/object-to-camel.js';
import { toUrlSearchParams } from '../../lib/to-url-search-params.js';
export function createCancel(client) {
    return async function cancel(name, options = {}) {
        const res = await client.post('name/pubsub/cancel', {
            signal: options.signal,
            searchParams: toUrlSearchParams({
                arg: name,
                ...options
            }),
            headers: options.headers
        });
        return objectToCamel(await res.json());
    };
}
//# sourceMappingURL=cancel.js.map