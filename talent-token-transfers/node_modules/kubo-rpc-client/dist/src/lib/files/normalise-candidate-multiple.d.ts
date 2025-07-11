import type { ImportCandidate, ImportCandidateStream, ToContent } from '../../index.js';
/**
 * @typedef {import('ipfs-core-types/src/utils').ImportCandidate} ImportCandidate
 * @typedef {import('ipfs-core-types/src/utils').ToContent} ToContent
 * @typedef {import('ipfs-unixfs-importer').ImportCandidate} ImporterImportCandidate
 * @typedef {import('ipfs-core-types/src/utils').ImportCandidateStream} ImportCandidateStream
 */
/**
 * @param {ImportCandidateStream} input
 * @param {(content:ToContent) => Promise<AsyncIterable<Uint8Array>>} normaliseContent
 */
export declare function normaliseCandidateMultiple(input: ImportCandidateStream, normaliseContent: (content: ToContent) => Promise<AsyncIterable<Uint8Array>>): AsyncGenerator<ImportCandidate, void, undefined>;
//# sourceMappingURL=normalise-candidate-multiple.d.ts.map