import { createGc } from './gc.js';
import { createStat } from './stat.js';
import { createVersion } from './version.js';
export function createRepo(client) {
    return {
        gc: createGc(client),
        stat: createStat(client),
        version: createVersion(client)
    };
}
//# sourceMappingURL=index.js.map