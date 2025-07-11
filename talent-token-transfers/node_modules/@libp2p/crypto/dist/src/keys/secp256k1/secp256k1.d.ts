import { CID } from 'multiformats/cid';
import type { Secp256k1PublicKey as Secp256k1PublicKeyInterface, Secp256k1PrivateKey as Secp256k1PrivateKeyInterface, AbortOptions } from '@libp2p/interface';
import type { Digest } from 'multiformats/hashes/digest';
import type { Uint8ArrayList } from 'uint8arraylist';
export declare class Secp256k1PublicKey implements Secp256k1PublicKeyInterface {
    readonly type = "secp256k1";
    readonly raw: Uint8Array;
    readonly _key: Uint8Array;
    constructor(key: Uint8Array);
    toMultihash(): Digest<0x0, number>;
    toCID(): CID<unknown, 114, 0x0, 1>;
    toString(): string;
    equals(key: any): boolean;
    verify(data: Uint8Array | Uint8ArrayList, sig: Uint8Array, options?: AbortOptions): boolean;
}
export declare class Secp256k1PrivateKey implements Secp256k1PrivateKeyInterface {
    readonly type = "secp256k1";
    readonly raw: Uint8Array;
    readonly publicKey: Secp256k1PublicKey;
    constructor(key: Uint8Array, publicKey?: Uint8Array);
    equals(key?: any): boolean;
    sign(message: Uint8Array | Uint8ArrayList, options?: AbortOptions): Uint8Array | Promise<Uint8Array>;
}
//# sourceMappingURL=secp256k1.d.ts.map