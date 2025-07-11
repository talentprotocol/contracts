import { CID } from 'multiformats/cid';
import { createStat } from './files/stat.js';
import { toUrlSearchParams } from './lib/to-url-search-params.js';
export function createLs(client) {
    return async function* ls(path, options = {}) {
        const pathStr = `${path instanceof Uint8Array ? CID.decode(path) : path}`;
        async function mapLink(link) {
            let hash = link.Hash;
            if (hash.includes('/') === true) {
                // the hash is a path, but we need the CID
                const ipfsPath = hash.startsWith('/ipfs/') === true ? hash : `/ipfs/${hash}`;
                const stats = await createStat(client)(ipfsPath);
                hash = stats.cid;
            }
            else {
                hash = CID.parse(hash);
            }
            const entry = {
                name: link.Name,
                path: pathStr + (link.Name != null ? `/${link.Name}` : ''),
                size: link.Size,
                cid: hash,
                type: typeOf(link)
            };
            return entry;
        }
        const res = await client.post('ls', {
            signal: options.signal,
            searchParams: toUrlSearchParams({
                arg: pathStr,
                ...options
            }),
            headers: options.headers
        });
        for await (let result of res.ndjson()) {
            result = result.Objects;
            if (result == null) {
                throw new Error('expected .Objects in results');
            }
            result = result[0];
            if (result == null) {
                throw new Error('expected one array in results.Objects');
            }
            const links = result.Links;
            if (!Array.isArray(links)) {
                throw new Error('expected one array in results.Objects[0].Links');
            }
            if (links.length === 0) {
                // no links, this is a file, yield a single result
                yield mapLink(result);
                return;
            }
            yield* links.map(mapLink);
        }
    };
}
function typeOf(link) {
    switch (link.Type) {
        case 1:
        case 5:
            return 'dir';
        case 2:
            return 'file';
        default:
            return 'file';
    }
}
//# sourceMappingURL=ls.js.map