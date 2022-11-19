import path from 'path';
import fs from 'fs';

import { IMarkdown, MdFileMeta, MdNavContents } from './IMarkdown';
import { Config } from '../utils/config';

export class Markdown implements IMarkdown {
    private contentDir: string;
    private cacheDir: string;

    public constructor (config: Config) {
        this.contentDir = config.contentDir;
        this.cacheDir = config.cacheDir;
    }

    /* return metadata for the given file
       currently just the paths */
    public getMdFileMeta(mdPath: string):MdFileMeta {
        let filePath = mdPath === '/' ? path.resolve(this.contentDir, 'index.md')
                                      : path.resolve(this.contentDir, `${mdPath}.md`);
        if (!fs.existsSync(filePath)) {
            filePath = path.resolve(this.contentDir, mdPath, 'index.md');
        }

        if (!fs.existsSync(filePath)) {
            throw new Error(`${filePath} not found`);
        }

        return {
            uiPath: mdPath,
            filePath
        };
    }

    /* return Nav structure of md files in a given path
       currently returns dummy content */
    public getMdNavContents(rootPath: string): MdNavContents {

        const fullPath = path.resolve(this.contentDir, rootPath);

        if (!fs.existsSync(fullPath)) {
            throw new Error(`${fullPath} not found`);
        }

        return {
            meta: this.getMdFileMeta(rootPath)
        };
    }
}
