import type { Codec } from 'protons-runtime';
import type { Uint8ArrayList } from 'uint8arraylist';
export interface Data {
    Type?: Data.DataType;
    Data?: Uint8Array;
    filesize?: bigint;
    blocksizes: bigint[];
    hashType?: bigint;
    fanout?: bigint;
    mode?: number;
    mtime?: UnixTime;
}
export declare namespace Data {
    enum DataType {
        Raw = "Raw",
        Directory = "Directory",
        File = "File",
        Metadata = "Metadata",
        Symlink = "Symlink",
        HAMTShard = "HAMTShard"
    }
    namespace DataType {
        const codec: () => Codec<DataType>;
    }
    const codec: () => Codec<Data>;
    const encode: (obj: Partial<Data>) => Uint8Array;
    const decode: (buf: Uint8Array | Uint8ArrayList) => Data;
}
export interface UnixTime {
    Seconds?: bigint;
    FractionalNanoseconds?: number;
}
export declare namespace UnixTime {
    const codec: () => Codec<UnixTime>;
    const encode: (obj: Partial<UnixTime>) => Uint8Array;
    const decode: (buf: Uint8Array | Uint8ArrayList) => UnixTime;
}
export interface Metadata {
    MimeType?: string;
}
export declare namespace Metadata {
    const codec: () => Codec<Metadata>;
    const encode: (obj: Partial<Metadata>) => Uint8Array;
    const decode: (buf: Uint8Array | Uint8ArrayList) => Metadata;
}
//# sourceMappingURL=unixfs.d.ts.map