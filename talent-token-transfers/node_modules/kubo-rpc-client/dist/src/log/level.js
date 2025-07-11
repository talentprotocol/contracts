import { objectToCamel } from '../lib/object-to-camel.js';
import { toUrlSearchParams } from '../lib/to-url-search-params.js';
export function createLevel(client) {
    return async function level(subsystem, level, options = {}) {
        const res = await client.post('log/level', {
            signal: options.signal,
            searchParams: toUrlSearchParams({
                arg: [
                    subsystem,
                    level
                ],
                ...options
            }),
            headers: options.headers
        });
        return objectToCamel(await res.json());
    };
}
//# sourceMappingURL=level.js.map