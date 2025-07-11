import type { MultihashHasher } from 'multiformats/hashes/interface';
export interface LoadHasherFn {
    (codeOrName: number | string): Promise<MultihashHasher>;
}
export interface MultihashesInit {
    loadHasher?: LoadHasherFn;
    hashers: MultihashHasher[];
}
export declare class Multihashes {
    private readonly _hashersByName;
    private readonly _hashersByCode;
    private readonly _loadHasher;
    constructor(options: MultihashesInit);
    /**
     * Add support for a multibase hasher
     */
    addHasher(hasher: MultihashHasher): void;
    /**
     * Remove support for a multibase hasher
     */
    removeHasher(hasher: MultihashHasher): void;
    /**
     * @param {number | string} code
     */
    getHasher(code: number | string): Promise<MultihashHasher>;
    listHashers(): MultihashHasher[];
}
//# sourceMappingURL=multihashes.d.ts.map