import * as Digest from './digest.js';
import type { MultihashHasher } from './interface.js';
type Await<T> = Promise<T> | T;
export declare function from<Name extends string, Code extends number>({ name, code, encode }: {
    name: Name;
    code: Code;
    encode(input: Uint8Array): Await<Uint8Array>;
}): Hasher<Name, Code>;
/**
 * Hasher represents a hashing algorithm implementation that produces as
 * `MultihashDigest`.
 */
export declare class Hasher<Name extends string, Code extends number> implements MultihashHasher<Code> {
    readonly name: Name;
    readonly code: Code;
    readonly encode: (input: Uint8Array) => Await<Uint8Array>;
    constructor(name: Name, code: Code, encode: (input: Uint8Array) => Await<Uint8Array>);
    digest(input: Uint8Array): Await<Digest.Digest<Code, number>>;
}
export {};
//# sourceMappingURL=hasher.d.ts.map