import { toUrlSearchParams } from '../lib/to-url-search-params.js';
export function createMkdir(client) {
    return async function mkdir(path, options = {}) {
        const res = await client.post('files/mkdir', {
            signal: options.signal,
            searchParams: toUrlSearchParams({
                arg: path,
                ...options
            }),
            headers: options.headers
        });
        await res.text();
    };
}
//# sourceMappingURL=mkdir.js.map