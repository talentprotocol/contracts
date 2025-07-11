declare const _default: {
    name: string;
    predicate: ({ sourceDir, manifestFile }: {
        sourceDir: string;
        manifestFile: string;
    }) => Promise<any>;
    apply: ({ manifestFile }: {
        manifestFile: string;
    }) => Promise<void>;
};
export default _default;
