import { toUrlSearchParams } from '../lib/to-url-search-params.js';
export function createCmds(client) {
    return async function cmds(options = {}) {
        const res = await client.post('diag/cmds', {
            signal: options.signal,
            searchParams: toUrlSearchParams(options),
            headers: options.headers
        });
        return res.json();
    };
}
//# sourceMappingURL=cmds.js.map