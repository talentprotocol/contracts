import { CID } from 'multiformats/cid';
import { toUrlSearchParams } from '../lib/to-url-search-params.js';
export function createResolve(client) {
    return async function resolve(ipfsPath, options = {}) {
        const res = await client.post('dag/resolve', {
            signal: options.signal,
            searchParams: toUrlSearchParams({
                arg: `${ipfsPath}${options.path != null ? `/${options.path}`.replace(/\/[/]+/g, '/') : ''}`,
                ...options
            }),
            headers: options.headers
        });
        const data = await res.json();
        return { cid: CID.parse(data.Cid['/']), remainderPath: data.RemPath };
    };
}
//# sourceMappingURL=resolve.js.map