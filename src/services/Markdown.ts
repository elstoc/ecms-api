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

    /* return the actual file path of a markdown file
       given the Route path in the ui */
    public getMdFilePath(uiPath: string): string {
        let filePath = uiPath === '/' ? path.resolve(this.contentDir, 'index.md')
                                      : path.resolve(this.contentDir, `${uiPath}.md`);

        if (!fs.existsSync(filePath)) {
            filePath = path.resolve(this.contentDir, uiPath, 'index.md');
        }

        if (!fs.existsSync(filePath)) {
            throw new Error(`${filePath} not found`);
        }

        return filePath;
    }

    /* return metadata for the given file
       currently just the paths */
    public getMdFileMeta(uiPath: string):MdFileMeta {
        const filePath = this.getMdFilePath(uiPath);

        return {
            uiPath: uiPath,
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
