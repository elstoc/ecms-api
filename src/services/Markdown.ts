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
    public async getMdFileMeta(uiPath: string): Promise<MdFileMeta> {
        // const filePath = this.getMdFilePath(uiPath);
        // ToDo: get metadata from yaml frontmatter

        return {
            uiPath: uiPath,
        };
    }

    /* return Nav structure of md child files in a given path
       recurse until all files read */
    private async recurseDir(rootPath: string): Promise<MdNavContents[]> {
        const fullPath = path.resolve(this.contentDir, rootPath);

        if (!fs.existsSync(fullPath)) {
            throw new Error(`${fullPath} not found`);
        }

        const children: MdNavContents[] = [];

        const dir = await fs.promises.readdir(fullPath);
        for (const file of dir) {
            const uiPath = `${rootPath}/${file}`.replace('.md','');
            const stats = await fs.promises.stat(path.resolve(fullPath, file));
            if (stats.isDirectory()) {
                const childChildren = await this.recurseDir(uiPath);
                const meta = await this.getMdFileMeta(uiPath);
                children.push({
                    meta,
                    children: childChildren
                });
            } else if (file.endsWith('.md') && !file.endsWith('index.md')) {
                const meta = await this.getMdFileMeta(uiPath);
                children.push({
                    meta
                });
            }
        }

        return children;
    }

    /* return Nav structure of md files in a given path */
    public async getMdNavContents(rootPath: string): Promise<MdNavContents[]> {

        const children = await this.recurseDir(rootPath);
        const meta = await this.getMdFileMeta(rootPath);

        return [{
            meta,
            children
        }];
    }
}
