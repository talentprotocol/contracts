/**
 * BLS != BLS.
 * The file implements BLS (Boneh-Lynn-Shacham) signatures.
 * Used in both BLS (Barreto-Lynn-Scott) and BN (Barreto-Naehrig)
 * families of pairing-friendly curves.
 * Consists of two curves: G1 and G2:
 * - G1 is a subgroup of (x, y) E(Fq) over y² = x³ + 4.
 * - G2 is a subgroup of ((x₁, x₂+i), (y₁, y₂+i)) E(Fq²) over y² = x³ + 4(1 + i) where i is √-1
 * - Gt, created by bilinear (ate) pairing e(G1, G2), consists of p-th roots of unity in
 *   Fq^k where k is embedding degree. Only degree 12 is currently supported, 24 is not.
 * Pairing is used to aggregate and verify signatures.
 * There are two modes of operation:
 * - Long signatures:  X-byte keys + 2X-byte sigs (G1 keys + G2 sigs).
 * - Short signatures: 2X-byte keys + X-byte sigs (G2 keys + G1 sigs).
 * @module
 **/
/*! noble-curves - MIT License (c) 2022 Paul Miller (paulmillr.com) */
import { type CHash, type Hex, type PrivKey } from '../utils.ts';
import { type H2CHasher, type H2CHashOpts, type H2COpts, type htfBasicOpts, type MapToCurve } from './hash-to-curve.ts';
import { type IField } from './modular.ts';
import type { Fp12, Fp12Bls, Fp2, Fp2Bls, Fp6Bls } from './tower.ts';
import { type CurvePointsRes, type CurvePointsType, type ProjConstructor, type ProjPointType } from './weierstrass.ts';
type Fp = bigint;
export type TwistType = 'multiplicative' | 'divisive';
export type ShortSignatureCoder<Fp> = {
    fromBytes(bytes: Uint8Array): ProjPointType<Fp>;
    fromHex(hex: Hex): ProjPointType<Fp>;
    toBytes(point: ProjPointType<Fp>): Uint8Array;
    /** @deprecated use `toBytes` */
    toRawBytes(point: ProjPointType<Fp>): Uint8Array;
    toHex(point: ProjPointType<Fp>): string;
};
export type SignatureCoder<Fp> = {
    fromBytes(bytes: Uint8Array): ProjPointType<Fp>;
    fromHex(hex: Hex): ProjPointType<Fp>;
    toBytes(point: ProjPointType<Fp>): Uint8Array;
    /** @deprecated use `toBytes` */
    toRawBytes(point: ProjPointType<Fp>): Uint8Array;
    toHex(point: ProjPointType<Fp>): string;
};
export type PostPrecomputePointAddFn = (Rx: Fp2, Ry: Fp2, Rz: Fp2, Qx: Fp2, Qy: Fp2) => {
    Rx: Fp2;
    Ry: Fp2;
    Rz: Fp2;
};
export type PostPrecomputeFn = (Rx: Fp2, Ry: Fp2, Rz: Fp2, Qx: Fp2, Qy: Fp2, pointAdd: PostPrecomputePointAddFn) => void;
export type CurveType = {
    G1: CurvePointsType<Fp> & {
        ShortSignature: SignatureCoder<Fp>;
        mapToCurve: MapToCurve<Fp>;
        htfDefaults: H2COpts;
    };
    G2: CurvePointsType<Fp2> & {
        Signature: SignatureCoder<Fp2>;
        mapToCurve: MapToCurve<Fp2>;
        htfDefaults: H2COpts;
    };
    fields: {
        Fp: IField<Fp>;
        Fr: IField<bigint>;
        Fp2: Fp2Bls;
        Fp6: Fp6Bls;
        Fp12: Fp12Bls;
    };
    params: {
        ateLoopSize: bigint;
        xNegative: boolean;
        r: bigint;
        twistType: TwistType;
    };
    htfDefaults: H2COpts;
    hash: CHash;
    randomBytes?: (bytesLength?: number) => Uint8Array;
    postPrecompute?: PostPrecomputeFn;
};
type PrecomputeSingle = [Fp2, Fp2, Fp2][];
type Precompute = PrecomputeSingle[];
export type CurveFn = {
    longSignatures: BLSSigs<bigint, Fp2>;
    shortSignatures: BLSSigs<Fp2, bigint>;
    millerLoopBatch: (pairs: [Precompute, Fp, Fp][]) => Fp12;
    pairing: (P: ProjPointType<Fp>, Q: ProjPointType<Fp2>, withFinalExponent?: boolean) => Fp12;
    pairingBatch: (pairs: {
        g1: ProjPointType<Fp>;
        g2: ProjPointType<Fp2>;
    }[], withFinalExponent?: boolean) => Fp12;
    /** @deprecated use `longSignatures.getPublicKey` */
    getPublicKey: (privateKey: PrivKey) => Uint8Array;
    /** @deprecated use `shortSignatures.getPublicKey` */
    getPublicKeyForShortSignatures: (privateKey: PrivKey) => Uint8Array;
    /** @deprecated use `longSignatures.sign` */
    sign: {
        (message: Hex, privateKey: PrivKey, htfOpts?: htfBasicOpts): Uint8Array;
        (message: ProjPointType<Fp2>, privateKey: PrivKey, htfOpts?: htfBasicOpts): ProjPointType<Fp2>;
    };
    /** @deprecated use `shortSignatures.sign` */
    signShortSignature: {
        (message: Hex, privateKey: PrivKey, htfOpts?: htfBasicOpts): Uint8Array;
        (message: ProjPointType<Fp>, privateKey: PrivKey, htfOpts?: htfBasicOpts): ProjPointType<Fp>;
    };
    /** @deprecated use `longSignatures.verify` */
    verify: (signature: Hex | ProjPointType<Fp2>, message: Hex | ProjPointType<Fp2>, publicKey: Hex | ProjPointType<Fp>, htfOpts?: htfBasicOpts) => boolean;
    /** @deprecated use `shortSignatures.verify` */
    verifyShortSignature: (signature: Hex | ProjPointType<Fp>, message: Hex | ProjPointType<Fp>, publicKey: Hex | ProjPointType<Fp2>, htfOpts?: htfBasicOpts) => boolean;
    verifyBatch: (signature: Hex | ProjPointType<Fp2>, messages: (Hex | ProjPointType<Fp2>)[], publicKeys: (Hex | ProjPointType<Fp>)[], htfOpts?: htfBasicOpts) => boolean;
    /** @deprecated use `longSignatures.aggregatePublicKeys` */
    aggregatePublicKeys: {
        (publicKeys: Hex[]): Uint8Array;
        (publicKeys: ProjPointType<Fp>[]): ProjPointType<Fp>;
    };
    /** @deprecated use `longSignatures.aggregateSignatures` */
    aggregateSignatures: {
        (signatures: Hex[]): Uint8Array;
        (signatures: ProjPointType<Fp2>[]): ProjPointType<Fp2>;
    };
    /** @deprecated use `shortSignatures.aggregateSignatures` */
    aggregateShortSignatures: {
        (signatures: Hex[]): Uint8Array;
        (signatures: ProjPointType<Fp>[]): ProjPointType<Fp>;
    };
    /** @deprecated use `curves.G1` and `curves.G2` */
    G1: CurvePointsRes<Fp> & H2CHasher<Fp>;
    G2: CurvePointsRes<Fp2> & H2CHasher<Fp2>;
    /** @deprecated use `longSignatures.Signature` */
    Signature: SignatureCoder<Fp2>;
    /** @deprecated use `shortSignatures.Signature` */
    ShortSignature: ShortSignatureCoder<Fp>;
    params: {
        ateLoopSize: bigint;
        r: bigint;
        twistType: TwistType;
        /** @deprecated */
        G1b: bigint;
        /** @deprecated */
        G2b: Fp2;
    };
    curves: {
        G1: ProjConstructor<bigint>;
        G2: ProjConstructor<Fp2>;
    };
    fields: {
        Fp: IField<Fp>;
        Fp2: Fp2Bls;
        Fp6: Fp6Bls;
        Fp12: Fp12Bls;
        Fr: IField<bigint>;
    };
    utils: {
        randomPrivateKey: () => Uint8Array;
        calcPairingPrecomputes: (p: ProjPointType<Fp2>) => Precompute;
    };
};
type BLSInput = Hex | Uint8Array;
export interface BLSSigs<P, S> {
    getPublicKey(privateKey: PrivKey): ProjPointType<P>;
    sign(hashedMessage: ProjPointType<S>, privateKey: PrivKey): ProjPointType<S>;
    verify(signature: ProjPointType<S> | BLSInput, message: ProjPointType<S>, publicKey: ProjPointType<P> | BLSInput): boolean;
    aggregatePublicKeys(publicKeys: (ProjPointType<P> | BLSInput)[]): ProjPointType<P>;
    aggregateSignatures(signatures: (ProjPointType<S> | BLSInput)[]): ProjPointType<S>;
    hash(message: Uint8Array, DST?: string | Uint8Array, hashOpts?: H2CHashOpts): ProjPointType<S>;
    Signature: SignatureCoder<S>;
}
export declare function bls(CURVE: CurveType): CurveFn;
export {};
//# sourceMappingURL=bls.d.ts.map