import type { HTTPRPCOptions } from '../index.js';
import type { HTTPRPCClient } from '../lib/core.js';
export interface LogAPI {
    level(subsystem: string, level: string, options?: HTTPRPCOptions): Promise<any>;
    ls(options?: HTTPRPCOptions): Promise<any>;
    tail(options?: HTTPRPCOptions): AsyncIterable<any>;
}
export declare function createLog(client: HTTPRPCClient): LogAPI;
//# sourceMappingURL=index.d.ts.map