import { CID } from 'multiformats/cid';
import type { BlockAPI } from '../block/index.js';
import type { Codecs } from '../index.js';
import type { AbortOptions } from '@libp2p/interface';
export interface ResolveResult {
    value: any;
    remainderPath?: string;
}
/**
 * Retrieves IPLD Nodes along the `path` that is rooted at `cid`
 */
export declare function resolve(cid: CID, path: string, codecs: Codecs, getBlock: BlockAPI['get'], options?: AbortOptions): AsyncGenerator<ResolveResult>;
//# sourceMappingURL=resolve.d.ts.map