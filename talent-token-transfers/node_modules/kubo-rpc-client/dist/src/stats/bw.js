import { toUrlSearchParams } from '../lib/to-url-search-params.js';
export function createBw(client) {
    return async function* bw(options = {}) {
        const res = await client.post('stats/bw', {
            signal: options.signal,
            searchParams: toUrlSearchParams(options),
            headers: options.headers,
            transform: (stats) => ({
                totalIn: BigInt(stats.TotalIn),
                totalOut: BigInt(stats.TotalOut),
                rateIn: parseFloat(stats.RateIn),
                rateOut: parseFloat(stats.RateOut)
            })
        });
        yield* res.ndjson();
    };
}
//# sourceMappingURL=bw.js.map