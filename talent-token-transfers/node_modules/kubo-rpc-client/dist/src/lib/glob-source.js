import fs from 'node:fs';
import fsp from 'node:fs/promises';
import os from 'node:os';
import Path from 'node:path';
import { InvalidParametersError } from '@libp2p/interface';
import glob from 'it-glob';
/**
 * Create an async iterator that yields paths that match requested glob pattern
 */
export async function* globSource(cwd, pattern, options) {
    options = options ?? {};
    if (typeof pattern !== 'string') {
        throw new InvalidParametersError('Pattern must be a string');
    }
    if (!Path.isAbsolute(cwd)) {
        cwd = Path.resolve(process.cwd(), cwd);
    }
    if (os.platform() === 'win32') {
        cwd = toPosix(cwd);
    }
    const globOptions = Object.assign({}, {
        onlyFiles: false,
        absolute: true,
        dot: Boolean(options.hidden),
        followSymbolicLinks: options.followSymlinks ?? true
    });
    for await (const p of glob(cwd, pattern, globOptions)) {
        // Workaround for https://github.com/micromatch/micromatch/issues/251
        if (Path.basename(p).startsWith('.') && options.hidden !== true) {
            continue;
        }
        const stat = await fsp.stat(p);
        let mode = options.mode;
        if (options.preserveMode === true) {
            mode = stat.mode;
        }
        let mtime = options.mtime;
        if (options.preserveMtime === true) {
            mtime = stat.mtime;
        }
        yield {
            path: p.replace(cwd, ''),
            content: stat.isFile() ? fs.createReadStream(p) : undefined,
            mode,
            mtime
        };
    }
}
const toPosix = (path) => path.replace(/\\/g, '/');
//# sourceMappingURL=glob-source.js.map