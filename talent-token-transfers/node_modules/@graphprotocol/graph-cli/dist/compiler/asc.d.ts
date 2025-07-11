export declare const ready: () => Promise<void>;
export interface CompileOptions {
    inputFile: string;
    global: string;
    baseDir: string;
    libs: string;
    outputFile: string;
}
export declare const compile: ({ inputFile, global, baseDir, libs, outputFile }: CompileOptions) => void;
