import { toUrlSearchParams } from '../../lib/to-url-search-params.js';
export function createApply(client) {
    return async function apply(profile, options = {}) {
        const res = await client.post('config/profile/apply', {
            signal: options.signal,
            searchParams: toUrlSearchParams({
                arg: profile,
                ...options
            }),
            headers: options.headers
        });
        const data = await res.json();
        return {
            original: data.OldCfg, updated: data.NewCfg
        };
    };
}
//# sourceMappingURL=apply.js.map