import type { HTTPRPCOptions, IPFSPath } from '../index.js';
import type { HTTPRPCClient } from '../lib/core.js';
export interface RefsAPI {
    /**
     * Get links (references) from an object
     */
    (ipfsPath: IPFSPath | IPFSPath[], options?: RefsOptions): AsyncIterable<RefsResult>;
    /**
     * List blocks stored in the local block store
     */
    local(options?: HTTPRPCOptions): AsyncIterable<RefsResult>;
}
export interface RefsOptions extends HTTPRPCOptions {
    recursive?: boolean;
    unique?: boolean;
    format?: string;
    edges?: boolean;
    maxDepth?: number;
}
export interface RefsResult {
    ref: string;
    err?: Error;
}
export declare function createRefs(client: HTTPRPCClient): RefsAPI;
//# sourceMappingURL=index.d.ts.map