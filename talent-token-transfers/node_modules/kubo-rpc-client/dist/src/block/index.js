import { createGet } from './get.js';
import { createPut } from './put.js';
import { createRm } from './rm.js';
import { createStat } from './stat.js';
export function createBlock(client) {
    return {
        get: createGet(client),
        put: createPut(client),
        rm: createRm(client),
        stat: createStat(client)
    };
}
//# sourceMappingURL=index.js.map