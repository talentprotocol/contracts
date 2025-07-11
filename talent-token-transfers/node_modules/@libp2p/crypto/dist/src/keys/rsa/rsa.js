import { base58btc } from 'multiformats/bases/base58';
import { CID } from 'multiformats/cid';
import { equals as uint8ArrayEquals } from 'uint8arrays/equals';
import { hashAndSign, utils, hashAndVerify } from './index.js';
export class RSAPublicKey {
    type = 'RSA';
    jwk;
    _raw;
    _multihash;
    constructor(jwk, digest) {
        this.jwk = jwk;
        this._multihash = digest;
    }
    get raw() {
        if (this._raw == null) {
            this._raw = utils.jwkToPkix(this.jwk);
        }
        return this._raw;
    }
    toMultihash() {
        return this._multihash;
    }
    toCID() {
        return CID.createV1(114, this._multihash);
    }
    toString() {
        return base58btc.encode(this.toMultihash().bytes).substring(1);
    }
    equals(key) {
        if (key == null || !(key.raw instanceof Uint8Array)) {
            return false;
        }
        return uint8ArrayEquals(this.raw, key.raw);
    }
    verify(data, sig, options) {
        return hashAndVerify(this.jwk, sig, data, options);
    }
}
export class RSAPrivateKey {
    type = 'RSA';
    jwk;
    _raw;
    publicKey;
    constructor(jwk, publicKey) {
        this.jwk = jwk;
        this.publicKey = publicKey;
    }
    get raw() {
        if (this._raw == null) {
            this._raw = utils.jwkToPkcs1(this.jwk);
        }
        return this._raw;
    }
    equals(key) {
        if (key == null || !(key.raw instanceof Uint8Array)) {
            return false;
        }
        return uint8ArrayEquals(this.raw, key.raw);
    }
    sign(message, options) {
        return hashAndSign(this.jwk, message, options);
    }
}
//# sourceMappingURL=rsa.js.map