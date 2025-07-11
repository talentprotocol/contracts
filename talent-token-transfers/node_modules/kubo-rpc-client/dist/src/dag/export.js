import { toUrlSearchParams } from '../lib/to-url-search-params.js';
export function createExport(client) {
    return async function* dagExport(root, options = {}) {
        const res = await client.post('dag/export', {
            signal: options.signal,
            searchParams: toUrlSearchParams({
                arg: root.toString()
            }),
            headers: options.headers
        });
        yield* res.iterator();
    };
}
//# sourceMappingURL=export.js.map