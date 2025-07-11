import * as Digest from './digest.js';
declare const code = 0;
declare function digest(input: Uint8Array): Digest.Digest<typeof code, number>;
export declare const identity: {
    code: number;
    name: string;
    encode: (input: Uint8Array) => Uint8Array;
    digest: typeof digest;
};
export {};
//# sourceMappingURL=identity.d.ts.map