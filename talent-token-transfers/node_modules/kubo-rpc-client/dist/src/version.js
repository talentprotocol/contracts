import { objectToCamel } from './lib/object-to-camel.js';
import { toUrlSearchParams } from './lib/to-url-search-params.js';
export function createVersion(client) {
    return async function version(options = {}) {
        const res = await client.post('version', {
            signal: options.signal,
            searchParams: toUrlSearchParams(options),
            headers: options.headers
        });
        return {
            ...objectToCamel(await res.json()),
            'ipfs-http-client': '1.0.0'
        };
    };
}
//# sourceMappingURL=version.js.map