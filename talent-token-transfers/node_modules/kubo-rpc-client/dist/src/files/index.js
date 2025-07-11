import { createCp } from './cp.js';
import { createFlush } from './flush.js';
import { createLs } from './ls.js';
import { createMkdir } from './mkdir.js';
import { createMv } from './mv.js';
import { createRead } from './read.js';
import { createRm } from './rm.js';
import { createStat } from './stat.js';
import { createWrite } from './write.js';
export function createFiles(client) {
    return {
        cp: createCp(client),
        flush: createFlush(client),
        ls: createLs(client),
        mkdir: createMkdir(client),
        mv: createMv(client),
        read: createRead(client),
        rm: createRm(client),
        stat: createStat(client),
        write: createWrite(client)
    };
}
//# sourceMappingURL=index.js.map