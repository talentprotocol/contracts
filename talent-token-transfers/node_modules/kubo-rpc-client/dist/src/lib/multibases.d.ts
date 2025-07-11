import type { MultibaseCodec } from 'multiformats/bases/interface';
export interface LoadBaseFn {
    (codeOrName: string): Promise<MultibaseCodec<any>>;
}
export interface MultibasesInit {
    loadBase?: LoadBaseFn;
    bases: Array<MultibaseCodec<any>>;
}
export declare class Multibases {
    private readonly _basesByName;
    private readonly _basesByPrefix;
    private readonly _loadBase;
    constructor(options: MultibasesInit);
    /**
     * Add support for a multibase codec
     */
    addBase(base: MultibaseCodec<any>): void;
    /**
     * Remove support for a multibase codec
     */
    removeBase(base: MultibaseCodec<any>): void;
    getBase(nameOrPrefix: string): Promise<MultibaseCodec<any>>;
    listBases(): Array<MultibaseCodec<any>>;
}
//# sourceMappingURL=multibases.d.ts.map