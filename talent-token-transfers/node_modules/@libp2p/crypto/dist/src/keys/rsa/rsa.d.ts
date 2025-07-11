import { CID } from 'multiformats/cid';
import type { RSAPublicKey as RSAPublicKeyInterface, RSAPrivateKey as RSAPrivateKeyInterface, AbortOptions } from '@libp2p/interface';
import type { Digest } from 'multiformats/hashes/digest';
import type { Uint8ArrayList } from 'uint8arraylist';
export declare class RSAPublicKey implements RSAPublicKeyInterface {
    readonly type = "RSA";
    readonly jwk: JsonWebKey;
    private _raw?;
    private readonly _multihash;
    constructor(jwk: JsonWebKey, digest: Digest<18, number>);
    get raw(): Uint8Array;
    toMultihash(): Digest<18, number>;
    toCID(): CID<unknown, 114, 18, 1>;
    toString(): string;
    equals(key?: any): boolean;
    verify(data: Uint8Array | Uint8ArrayList, sig: Uint8Array, options?: AbortOptions): boolean | Promise<boolean>;
}
export declare class RSAPrivateKey implements RSAPrivateKeyInterface {
    readonly type = "RSA";
    readonly jwk: JsonWebKey;
    private _raw?;
    readonly publicKey: RSAPublicKey;
    constructor(jwk: JsonWebKey, publicKey: RSAPublicKey);
    get raw(): Uint8Array;
    equals(key: any): boolean;
    sign(message: Uint8Array | Uint8ArrayList, options?: AbortOptions): Uint8Array | Promise<Uint8Array>;
}
//# sourceMappingURL=rsa.d.ts.map