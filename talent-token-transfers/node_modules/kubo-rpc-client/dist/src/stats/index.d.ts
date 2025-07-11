import type { BitswapAPI } from '../bitswap/index.js';
import type { HTTPRPCOptions } from '../index.js';
import type { HTTPRPCClient } from '../lib/core.js';
import type { RepoAPI } from '../repo/index.js';
import type { PeerId } from '@libp2p/interface';
export interface StatsAPI {
    bitswap: BitswapAPI['stat'];
    repo: RepoAPI['stat'];
    /**
     * Return bandwith usage stats
     */
    bw(options?: StatsBWOptions): AsyncIterable<StatsBWResult>;
}
export interface StatsBWOptions extends HTTPRPCOptions {
    /**
     * Specifies a peer to print bandwidth for
     */
    peer?: PeerId;
    /**
     * Specifies a protocol to print bandwidth for
     */
    proto?: string;
    /**
     * Is used to yield bandwidth info at an interval
     */
    poll?: boolean;
    /**
     * The time interval to wait between updating output, if `poll` is `true`.
     */
    interval?: number | string;
}
export interface StatsBWResult {
    totalIn: bigint;
    totalOut: bigint;
    rateIn: number;
    rateOut: number;
}
export declare function createStats(client: HTTPRPCClient): StatsAPI;
//# sourceMappingURL=index.d.ts.map