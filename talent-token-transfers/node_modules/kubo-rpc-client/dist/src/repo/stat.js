import { toUrlSearchParams } from '../lib/to-url-search-params.js';
export function createStat(client) {
    return async function stat(options = {}) {
        const res = await client.post('repo/stat', {
            signal: options.signal,
            searchParams: toUrlSearchParams(options),
            headers: options.headers
        });
        const data = await res.json();
        return {
            numObjects: BigInt(data.NumObjects),
            repoSize: BigInt(data.RepoSize),
            repoPath: data.RepoPath,
            version: data.Version,
            storageMax: BigInt(data.StorageMax)
        };
    };
}
//# sourceMappingURL=stat.js.map