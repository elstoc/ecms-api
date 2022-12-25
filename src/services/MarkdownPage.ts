import fs from 'fs';
import path from 'path';
import YAML from 'yaml';

import { SitePaths } from './SitePaths';
import { MdFileMeta } from './IMarkdown';
import { splitFrontMatter } from '../utils/splitFrontMatter';

export class MarkdownPage {
    public constructor (private paths: SitePaths) {}

    public getFullPath(relPath: string): string {

        let mdFilePath = '';

        const fullPath = this.paths.getContentPath(relPath === '/' ? '' : relPath);
        
        if (fs.existsSync(fullPath)) {
            mdFilePath = path.resolve(fullPath, 'index.md');
        } else {
            mdFilePath = `${fullPath}.md`;
        }

        return mdFilePath;
    }

    public async getMetadata(relPath: string): Promise<MdFileMeta> {
        const filePath = this.getFullPath(relPath);

        let yamlTitle;

        if (fs.existsSync(filePath)) {
            const file = await fs.promises.readFile(filePath, 'utf-8');
            const [yaml] = splitFrontMatter(file);
            yamlTitle = YAML.parse(yaml)?.title;
        }

        const title = yamlTitle || path.basename(relPath);

        return {
            uiPath: relPath,
            title
        };
    }
}
