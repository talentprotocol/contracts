import { decodeMessage, encodeMessage, enumeration, message } from 'protons-runtime';
export var KeyType;
(function (KeyType) {
    KeyType["RSA"] = "RSA";
    KeyType["Ed25519"] = "Ed25519";
    KeyType["secp256k1"] = "secp256k1";
    KeyType["ECDSA"] = "ECDSA";
})(KeyType || (KeyType = {}));
var __KeyTypeValues;
(function (__KeyTypeValues) {
    __KeyTypeValues[__KeyTypeValues["RSA"] = 0] = "RSA";
    __KeyTypeValues[__KeyTypeValues["Ed25519"] = 1] = "Ed25519";
    __KeyTypeValues[__KeyTypeValues["secp256k1"] = 2] = "secp256k1";
    __KeyTypeValues[__KeyTypeValues["ECDSA"] = 3] = "ECDSA";
})(__KeyTypeValues || (__KeyTypeValues = {}));
(function (KeyType) {
    KeyType.codec = () => {
        return enumeration(__KeyTypeValues);
    };
})(KeyType || (KeyType = {}));
export var PublicKey;
(function (PublicKey) {
    let _codec;
    PublicKey.codec = () => {
        if (_codec == null) {
            _codec = message((obj, w, opts = {}) => {
                if (opts.lengthDelimited !== false) {
                    w.fork();
                }
                if (obj.Type != null) {
                    w.uint32(8);
                    KeyType.codec().encode(obj.Type, w);
                }
                if (obj.Data != null) {
                    w.uint32(18);
                    w.bytes(obj.Data);
                }
                if (opts.lengthDelimited !== false) {
                    w.ldelim();
                }
            }, (reader, length, opts = {}) => {
                const obj = {};
                const end = length == null ? reader.len : reader.pos + length;
                while (reader.pos < end) {
                    const tag = reader.uint32();
                    switch (tag >>> 3) {
                        case 1: {
                            obj.Type = KeyType.codec().decode(reader);
                            break;
                        }
                        case 2: {
                            obj.Data = reader.bytes();
                            break;
                        }
                        default: {
                            reader.skipType(tag & 7);
                            break;
                        }
                    }
                }
                return obj;
            });
        }
        return _codec;
    };
    PublicKey.encode = (obj) => {
        return encodeMessage(obj, PublicKey.codec());
    };
    PublicKey.decode = (buf, opts) => {
        return decodeMessage(buf, PublicKey.codec(), opts);
    };
})(PublicKey || (PublicKey = {}));
export var PrivateKey;
(function (PrivateKey) {
    let _codec;
    PrivateKey.codec = () => {
        if (_codec == null) {
            _codec = message((obj, w, opts = {}) => {
                if (opts.lengthDelimited !== false) {
                    w.fork();
                }
                if (obj.Type != null) {
                    w.uint32(8);
                    KeyType.codec().encode(obj.Type, w);
                }
                if (obj.Data != null) {
                    w.uint32(18);
                    w.bytes(obj.Data);
                }
                if (opts.lengthDelimited !== false) {
                    w.ldelim();
                }
            }, (reader, length, opts = {}) => {
                const obj = {};
                const end = length == null ? reader.len : reader.pos + length;
                while (reader.pos < end) {
                    const tag = reader.uint32();
                    switch (tag >>> 3) {
                        case 1: {
                            obj.Type = KeyType.codec().decode(reader);
                            break;
                        }
                        case 2: {
                            obj.Data = reader.bytes();
                            break;
                        }
                        default: {
                            reader.skipType(tag & 7);
                            break;
                        }
                    }
                }
                return obj;
            });
        }
        return _codec;
    };
    PrivateKey.encode = (obj) => {
        return encodeMessage(obj, PrivateKey.codec());
    };
    PrivateKey.decode = (buf, opts) => {
        return decodeMessage(buf, PrivateKey.codec(), opts);
    };
})(PrivateKey || (PrivateKey = {}));
//# sourceMappingURL=keys.js.map