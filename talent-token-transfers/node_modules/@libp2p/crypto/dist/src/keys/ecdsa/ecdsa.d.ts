import { CID } from 'multiformats/cid';
import type { ECDSAPublicKey as ECDSAPublicKeyInterface, ECDSAPrivateKey as ECDSAPrivateKeyInterface, AbortOptions } from '@libp2p/interface';
import type { Digest } from 'multiformats/hashes/digest';
import type { Uint8ArrayList } from 'uint8arraylist';
export declare class ECDSAPublicKey implements ECDSAPublicKeyInterface {
    readonly type = "ECDSA";
    readonly jwk: JsonWebKey;
    private _raw?;
    constructor(jwk: JsonWebKey);
    get raw(): Uint8Array;
    toMultihash(): Digest<0x0, number>;
    toCID(): CID<unknown, 114, 0x0, 1>;
    toString(): string;
    equals(key?: any): boolean;
    verify(data: Uint8Array | Uint8ArrayList, sig: Uint8Array, options?: AbortOptions): Promise<boolean>;
}
export declare class ECDSAPrivateKey implements ECDSAPrivateKeyInterface {
    readonly type = "ECDSA";
    readonly jwk: JsonWebKey;
    readonly publicKey: ECDSAPublicKey;
    private _raw?;
    constructor(jwk: JsonWebKey);
    get raw(): Uint8Array;
    equals(key?: any): boolean;
    sign(message: Uint8Array | Uint8ArrayList, options?: AbortOptions): Promise<Uint8Array>;
}
//# sourceMappingURL=ecdsa.d.ts.map