import { createStat } from './stat.js';
import { createWantlistForPeer } from './wantlist-for-peer.js';
import { createWantlist } from './wantlist.js';
export function createBitswap(client) {
    return {
        /**
         * TODO: https://github.com/ipfs/js-kubo-rpc-client/issues/99
         */
        wantlist: createWantlist(client),
        wantlistForPeer: createWantlistForPeer(client),
        stat: createStat(client)
    };
}
//# sourceMappingURL=index.js.map