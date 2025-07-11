import { createAddrs } from './addrs.js';
import { createConnect } from './connect.js';
import { createDisconnect } from './disconnect.js';
import { createLocalAddrs } from './local-addrs.js';
import { createPeers } from './peers.js';
export function createSwarm(client) {
    return {
        addrs: createAddrs(client),
        connect: createConnect(client),
        disconnect: createDisconnect(client),
        localAddrs: createLocalAddrs(client),
        peers: createPeers(client)
    };
}
//# sourceMappingURL=index.js.map