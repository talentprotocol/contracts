import type { MtimeLike } from 'ipfs-unixfs';
export interface GlobSourceOptions {
    /**
     * Include .dot files in matched paths
     */
    hidden?: boolean;
    /**
     * follow symlinks
     */
    followSymlinks?: boolean;
    /**
     * Preserve mode
     */
    preserveMode?: boolean;
    /**
     * Preserve mtime
     */
    preserveMtime?: boolean;
    /**
     * mode to use - if preserveMode is true this will be ignored
     */
    mode?: number;
    /**
     * mtime to use - if preserveMtime is true this will be ignored
     */
    mtime?: MtimeLike;
}
export interface GlobSourceResult {
    path: string;
    content: AsyncIterable<Uint8Array> | undefined;
    mode: number | undefined;
    mtime: MtimeLike | undefined;
}
/**
 * Create an async iterator that yields paths that match requested glob pattern
 */
export declare function globSource(cwd: string, pattern: string, options?: GlobSourceOptions): AsyncGenerator<GlobSourceResult>;
//# sourceMappingURL=glob-source.d.ts.map