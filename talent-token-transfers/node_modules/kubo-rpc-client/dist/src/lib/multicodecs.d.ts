import type { BlockCodec } from 'multiformats/codecs/interface';
export interface LoadCodecFn {
    (codeOrName: number | string): Promise<BlockCodec<any, any>>;
}
export interface MultihashesInit {
    loadCodec?: LoadCodecFn;
    codecs: Array<BlockCodec<any, any>>;
}
export declare class Multicodecs {
    private readonly _codecsByName;
    private readonly _codecsByCode;
    private readonly _loadCodec;
    constructor(options: MultihashesInit);
    /**
     * Add support for a block codec
     */
    addCodec(codec: BlockCodec<any, any>): void;
    /**
     * Remove support for a block codec
     */
    removeCodec(codec: BlockCodec<any, any>): void;
    getCodec(code: number | string): Promise<BlockCodec<any, any>>;
    listCodecs(): Array<BlockCodec<any, any>>;
}
//# sourceMappingURL=multicodecs.d.ts.map