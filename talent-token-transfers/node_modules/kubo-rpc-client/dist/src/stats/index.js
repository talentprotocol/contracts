import { createStat as createBitswap } from '../bitswap/stat.js';
import { createStat as createRepo } from '../repo/stat.js';
import { createBw } from './bw.js';
export function createStats(client) {
    return {
        bitswap: createBitswap(client),
        repo: createRepo(client),
        bw: createBw(client)
    };
}
//# sourceMappingURL=index.js.map