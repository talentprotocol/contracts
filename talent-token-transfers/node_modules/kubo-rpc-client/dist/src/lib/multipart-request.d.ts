import type { ImportCandidateStream } from '../index.js';
export interface MultipartRequest {
    total: number;
    parts: Array<{
        name?: string;
        start: number;
        end: number;
    }>;
    headers: Headers | Record<string, string>;
    body: BodyInit;
}
export declare function multipartRequest(source: ImportCandidateStream, abortController: AbortController, headers?: Headers | Record<string, string>, boundary?: string): Promise<MultipartRequest>;
//# sourceMappingURL=multipart-request.d.ts.map