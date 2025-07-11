import type { HTTPRPCOptions } from '../../index.js';
import type { HTTPRPCClient } from '../../lib/core.js';
import type { PBLink as DAGLink } from '@ipld/dag-pb';
import type { CID } from 'multiformats/cid';
export interface ObjectPatchAPI {
    addLink(cid: CID, link: DAGLink, options?: HTTPRPCOptions): Promise<CID>;
    rmLink(cid: CID, link: DAGLink | string, options?: HTTPRPCOptions): Promise<CID>;
}
export declare function createPatch(client: HTTPRPCClient): ObjectPatchAPI;
//# sourceMappingURL=index.d.ts.map