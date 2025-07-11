import { createAdd } from './add.js';
import { createLs } from './ls.js';
import { createRmAll } from './rm-all.js';
import { createRm } from './rm.js';
import { createService } from './service/index.js';
export function createRemote(client) {
    return {
        add: createAdd(client),
        ls: createLs(client),
        rm: createRm(client),
        rmAll: createRmAll(client),
        service: createService(client)
    };
}
//# sourceMappingURL=index.js.map