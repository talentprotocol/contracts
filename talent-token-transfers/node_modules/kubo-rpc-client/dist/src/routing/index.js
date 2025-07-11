import { createFindPeer } from './find-peer.js';
import { createFindProvs } from './find-provs.js';
import { createGet } from './get.js';
import { createProvide } from './provide.js';
import { createPut } from './put.js';
export function createRouting(client) {
    return {
        findPeer: createFindPeer(client),
        findProvs: createFindProvs(client),
        get: createGet(client),
        provide: createProvide(client),
        put: createPut(client)
    };
}
//# sourceMappingURL=index.js.map