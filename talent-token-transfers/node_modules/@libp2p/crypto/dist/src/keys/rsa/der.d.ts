import { Uint8ArrayList } from 'uint8arraylist';
interface Context {
    offset: number;
}
export declare function decodeDer(buf: Uint8Array, context?: Context): any;
export declare function encodeInteger(value: Uint8Array | Uint8ArrayList): Uint8ArrayList;
export declare function encodeBitString(value: Uint8Array | Uint8ArrayList): Uint8ArrayList;
export declare function encodeOctetString(value: Uint8Array | Uint8ArrayList): Uint8ArrayList;
export declare function encodeSequence(values: Array<Uint8Array | Uint8ArrayList>, tag?: number): Uint8ArrayList;
export {};
//# sourceMappingURL=der.d.ts.map