import type { HTTPRPCOptions } from '../index.js';
import type { HTTPRPCClient } from '../lib/core.js';
export interface DiagCmdsResult {
    active: boolean;
    args: string[];
    endTime: Date;
    id: string;
    options: Record<string, any>;
    startTime: Date;
}
export interface DiagAPI {
    cmds(options?: HTTPRPCOptions): Promise<DiagCmdsResult[]>;
    net(options?: HTTPRPCOptions): Promise<any>;
    sys(options?: HTTPRPCOptions): Promise<any>;
}
export declare function createDiag(client: HTTPRPCClient): DiagAPI;
//# sourceMappingURL=index.d.ts.map