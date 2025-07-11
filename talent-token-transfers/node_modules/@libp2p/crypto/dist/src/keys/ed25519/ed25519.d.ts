import { CID } from 'multiformats/cid';
import type { Ed25519PublicKey as Ed25519PublicKeyInterface, Ed25519PrivateKey as Ed25519PrivateKeyInterface, AbortOptions } from '@libp2p/interface';
import type { Digest } from 'multiformats/hashes/digest';
import type { Uint8ArrayList } from 'uint8arraylist';
export declare class Ed25519PublicKey implements Ed25519PublicKeyInterface {
    readonly type = "Ed25519";
    readonly raw: Uint8Array;
    constructor(key: Uint8Array);
    toMultihash(): Digest<0x0, number>;
    toCID(): CID<unknown, 114, 0x0, 1>;
    toString(): string;
    equals(key?: any): boolean;
    verify(data: Uint8Array | Uint8ArrayList, sig: Uint8Array, options?: AbortOptions): boolean | Promise<boolean>;
}
export declare class Ed25519PrivateKey implements Ed25519PrivateKeyInterface {
    readonly type = "Ed25519";
    readonly raw: Uint8Array;
    readonly publicKey: Ed25519PublicKey;
    constructor(key: Uint8Array, publicKey: Uint8Array);
    equals(key?: any): boolean;
    sign(message: Uint8Array | Uint8ArrayList, options?: AbortOptions): Uint8Array | Promise<Uint8Array>;
}
//# sourceMappingURL=ed25519.d.ts.map