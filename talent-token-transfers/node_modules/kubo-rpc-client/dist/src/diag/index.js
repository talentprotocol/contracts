import { createCmds } from './cmds.js';
import { createNet } from './net.js';
import { createSys } from './sys.js';
export function createDiag(client) {
    return {
        cmds: createCmds(client),
        net: createNet(client),
        sys: createSys(client)
    };
}
//# sourceMappingURL=index.js.map