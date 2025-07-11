import { toUrlSearchParams } from './lib/to-url-search-params.js';
export function createCommands(client) {
    return async function commands(options = {}) {
        const res = await client.post('commands', {
            signal: options.signal,
            searchParams: toUrlSearchParams(options),
            headers: options.headers
        });
        return res.json();
    };
}
//# sourceMappingURL=commands.js.map