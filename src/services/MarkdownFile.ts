import fs from 'fs';
import path from 'path';
import YAML from 'yaml';

import { SitePaths } from './SitePaths';
import { MdFileMeta } from './IMarkdown';
import { splitFrontMatter } from '../utils/splitFrontMatter';

export class MarkdownFile {
    public constructor (private paths: SitePaths) {}

    public getMdFilePath(uiPath: string): string {

        let mdFilePath = '';

        const fullUiPath = this.paths.getContentPath(uiPath === '/' ? '' : uiPath);
        
        if (fs.existsSync(fullUiPath)) {
            mdFilePath = path.resolve(fullUiPath, 'index.md');
        } else {
            mdFilePath = `${fullUiPath}.md`;
        }

        return mdFilePath;
    }

    public async getMdFileMeta(uiPath: string): Promise<MdFileMeta> {
        const filePath = this.getMdFilePath(uiPath);

        let yamlTitle;

        if (fs.existsSync(filePath)) {
            const file = fs.readFileSync(filePath, 'utf-8');
            const [yaml] = splitFrontMatter(file);
            yamlTitle = YAML.parse(yaml)?.title;
        }

        const title = yamlTitle || path.basename(uiPath);

        return {
            uiPath: uiPath,
            title
        };
    }
}
