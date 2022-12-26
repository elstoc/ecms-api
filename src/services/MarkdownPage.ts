import fs from 'fs';
import path from 'path';
import YAML from 'yaml';

import { SitePaths } from './SitePaths';
import { MdFileMeta } from './IMarkdown';
import { splitFrontMatter } from '../utils/splitFrontMatter';

export class MarkdownPage {
    public constructor (private paths: SitePaths) {}

    public getFullPath(relPath: string): string {
        const fullPath = this.paths.getContentPath(relPath === '/' ? '' : relPath);
        return fs.existsSync(fullPath)
            ? path.resolve(fullPath, 'index.md')
            : `${fullPath}.md`;
    }

    public async getMetadata(relPath: string): Promise<MdFileMeta> {
        const yaml = await this.parseFrontMatter(relPath);
        return {
            uiPath: relPath,
            title: yaml?.title || path.basename(relPath)
        };
    }
    
    private async parseFrontMatter(relPath: string): Promise<{ [key: string]: string }> {
        const fullPath = this.getFullPath(relPath);

        if (!fs.existsSync(fullPath)) {
            return {};
        }

        const file = await fs.promises.readFile(fullPath, 'utf-8');
        const [yaml] = splitFrontMatter(file);
        return YAML.parse(yaml);
    }
}
