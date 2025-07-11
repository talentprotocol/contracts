import { enumeration, encodeMessage, decodeMessage, message } from 'protons-runtime';
export var Data;
(function (Data) {
    let DataType;
    (function (DataType) {
        DataType["Raw"] = "Raw";
        DataType["Directory"] = "Directory";
        DataType["File"] = "File";
        DataType["Metadata"] = "Metadata";
        DataType["Symlink"] = "Symlink";
        DataType["HAMTShard"] = "HAMTShard";
    })(DataType = Data.DataType || (Data.DataType = {}));
    let __DataTypeValues;
    (function (__DataTypeValues) {
        __DataTypeValues[__DataTypeValues["Raw"] = 0] = "Raw";
        __DataTypeValues[__DataTypeValues["Directory"] = 1] = "Directory";
        __DataTypeValues[__DataTypeValues["File"] = 2] = "File";
        __DataTypeValues[__DataTypeValues["Metadata"] = 3] = "Metadata";
        __DataTypeValues[__DataTypeValues["Symlink"] = 4] = "Symlink";
        __DataTypeValues[__DataTypeValues["HAMTShard"] = 5] = "HAMTShard";
    })(__DataTypeValues || (__DataTypeValues = {}));
    (function (DataType) {
        DataType.codec = () => {
            return enumeration(__DataTypeValues);
        };
    })(DataType = Data.DataType || (Data.DataType = {}));
    let _codec;
    Data.codec = () => {
        if (_codec == null) {
            _codec = message((obj, w, opts = {}) => {
                if (opts.lengthDelimited !== false) {
                    w.fork();
                }
                if (obj.Type != null) {
                    w.uint32(8);
                    Data.DataType.codec().encode(obj.Type, w);
                }
                if (obj.Data != null) {
                    w.uint32(18);
                    w.bytes(obj.Data);
                }
                if (obj.filesize != null) {
                    w.uint32(24);
                    w.uint64(obj.filesize);
                }
                if (obj.blocksizes != null) {
                    for (const value of obj.blocksizes) {
                        w.uint32(32);
                        w.uint64(value);
                    }
                }
                if (obj.hashType != null) {
                    w.uint32(40);
                    w.uint64(obj.hashType);
                }
                if (obj.fanout != null) {
                    w.uint32(48);
                    w.uint64(obj.fanout);
                }
                if (obj.mode != null) {
                    w.uint32(56);
                    w.uint32(obj.mode);
                }
                if (obj.mtime != null) {
                    w.uint32(66);
                    UnixTime.codec().encode(obj.mtime, w);
                }
                if (opts.lengthDelimited !== false) {
                    w.ldelim();
                }
            }, (reader, length) => {
                const obj = {
                    blocksizes: []
                };
                const end = length == null ? reader.len : reader.pos + length;
                while (reader.pos < end) {
                    const tag = reader.uint32();
                    switch (tag >>> 3) {
                        case 1:
                            obj.Type = Data.DataType.codec().decode(reader);
                            break;
                        case 2:
                            obj.Data = reader.bytes();
                            break;
                        case 3:
                            obj.filesize = reader.uint64();
                            break;
                        case 4:
                            obj.blocksizes.push(reader.uint64());
                            break;
                        case 5:
                            obj.hashType = reader.uint64();
                            break;
                        case 6:
                            obj.fanout = reader.uint64();
                            break;
                        case 7:
                            obj.mode = reader.uint32();
                            break;
                        case 8:
                            obj.mtime = UnixTime.codec().decode(reader, reader.uint32());
                            break;
                        default:
                            reader.skipType(tag & 7);
                            break;
                    }
                }
                return obj;
            });
        }
        return _codec;
    };
    Data.encode = (obj) => {
        return encodeMessage(obj, Data.codec());
    };
    Data.decode = (buf) => {
        return decodeMessage(buf, Data.codec());
    };
})(Data || (Data = {}));
export var UnixTime;
(function (UnixTime) {
    let _codec;
    UnixTime.codec = () => {
        if (_codec == null) {
            _codec = message((obj, w, opts = {}) => {
                if (opts.lengthDelimited !== false) {
                    w.fork();
                }
                if (obj.Seconds != null) {
                    w.uint32(8);
                    w.int64(obj.Seconds);
                }
                if (obj.FractionalNanoseconds != null) {
                    w.uint32(21);
                    w.fixed32(obj.FractionalNanoseconds);
                }
                if (opts.lengthDelimited !== false) {
                    w.ldelim();
                }
            }, (reader, length) => {
                const obj = {};
                const end = length == null ? reader.len : reader.pos + length;
                while (reader.pos < end) {
                    const tag = reader.uint32();
                    switch (tag >>> 3) {
                        case 1:
                            obj.Seconds = reader.int64();
                            break;
                        case 2:
                            obj.FractionalNanoseconds = reader.fixed32();
                            break;
                        default:
                            reader.skipType(tag & 7);
                            break;
                    }
                }
                return obj;
            });
        }
        return _codec;
    };
    UnixTime.encode = (obj) => {
        return encodeMessage(obj, UnixTime.codec());
    };
    UnixTime.decode = (buf) => {
        return decodeMessage(buf, UnixTime.codec());
    };
})(UnixTime || (UnixTime = {}));
export var Metadata;
(function (Metadata) {
    let _codec;
    Metadata.codec = () => {
        if (_codec == null) {
            _codec = message((obj, w, opts = {}) => {
                if (opts.lengthDelimited !== false) {
                    w.fork();
                }
                if (obj.MimeType != null) {
                    w.uint32(10);
                    w.string(obj.MimeType);
                }
                if (opts.lengthDelimited !== false) {
                    w.ldelim();
                }
            }, (reader, length) => {
                const obj = {};
                const end = length == null ? reader.len : reader.pos + length;
                while (reader.pos < end) {
                    const tag = reader.uint32();
                    switch (tag >>> 3) {
                        case 1:
                            obj.MimeType = reader.string();
                            break;
                        default:
                            reader.skipType(tag & 7);
                            break;
                    }
                }
                return obj;
            });
        }
        return _codec;
    };
    Metadata.encode = (obj) => {
        return encodeMessage(obj, Metadata.codec());
    };
    Metadata.decode = (buf) => {
        return decodeMessage(buf, Metadata.codec());
    };
})(Metadata || (Metadata = {}));
//# sourceMappingURL=unixfs.js.map