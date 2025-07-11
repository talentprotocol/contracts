import { base58btc } from 'multiformats/bases/base58';
import { CID } from 'multiformats/cid';
import { identity } from 'multiformats/hashes/identity';
import { equals as uint8ArrayEquals } from 'uint8arrays/equals';
import { publicKeyToProtobuf } from '../index.js';
import { privateKeyToPKIMessage, publicKeyToPKIMessage } from './utils.js';
import { hashAndVerify, hashAndSign } from './index.js';
export class ECDSAPublicKey {
    type = 'ECDSA';
    jwk;
    _raw;
    constructor(jwk) {
        this.jwk = jwk;
    }
    get raw() {
        if (this._raw == null) {
            this._raw = publicKeyToPKIMessage(this.jwk);
        }
        return this._raw;
    }
    toMultihash() {
        return identity.digest(publicKeyToProtobuf(this));
    }
    toCID() {
        return CID.createV1(114, this.toMultihash());
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
    async verify(data, sig, options) {
        return hashAndVerify(this.jwk, sig, data, options);
    }
}
export class ECDSAPrivateKey {
    type = 'ECDSA';
    jwk;
    publicKey;
    _raw;
    constructor(jwk) {
        this.jwk = jwk;
        this.publicKey = new ECDSAPublicKey({
            crv: jwk.crv,
            ext: jwk.ext,
            key_ops: ['verify'],
            kty: 'EC',
            x: jwk.x,
            y: jwk.y
        });
    }
    get raw() {
        if (this._raw == null) {
            this._raw = privateKeyToPKIMessage(this.jwk);
        }
        return this._raw;
    }
    equals(key) {
        if (key == null || !(key.raw instanceof Uint8Array)) {
            return false;
        }
        return uint8ArrayEquals(this.raw, key.raw);
    }
    async sign(message, options) {
        return hashAndSign(this.jwk, message, options);
    }
}
//# sourceMappingURL=ecdsa.js.map