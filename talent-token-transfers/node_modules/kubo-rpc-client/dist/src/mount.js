import { objectToCamel } from './lib/object-to-camel.js';
import { toUrlSearchParams } from './lib/to-url-search-params.js';
export function createMount(client) {
    return async function mount(options = {}) {
        const res = await client.post('dns', {
            signal: options.signal,
            searchParams: toUrlSearchParams(options),
            headers: options.headers
        });
        return objectToCamel(await res.json());
    };
}
//# sourceMappingURL=mount.js.map