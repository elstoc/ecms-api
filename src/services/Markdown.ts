import fs from 'fs';

import { MarkdownPage } from './MarkdownPage';
import { MdNavContents } from './IMarkdown';
import { SitePaths } from './SitePaths';

export class Markdown {
    private markdownPage: MarkdownPage;

    public constructor(private paths: SitePaths) {
        this.markdownPage = new MarkdownPage(paths);
    }

    private async recurseDir(relPath: string): Promise<MdNavContents[]> {
        const fullPath = this.paths.getContentPathIfExists(relPath);

        const children: MdNavContents[] = [];

        const dir = await fs.promises.readdir(fullPath);

        for (const file of dir) {
            const uiPath = `${relPath}/${file}`.replace('.md','');
            const stats = await fs.promises.stat(this.paths.getContentPath(relPath, file));
            if (stats.isDirectory()) {
                const dirChildren = await this.recurseDir(uiPath);
                const meta = await this.markdownPage.getMetadata(uiPath);
                children.push({
                    meta,
                    children: dirChildren
                });
            } else if (file.endsWith('.md') && !file.endsWith('index.md')) {
                const meta = await this.markdownPage.getMetadata(uiPath);
                children.push({
                    meta
                });
            }
        }

        return children;
    }

    public getMdFilePath(mdPath: string) {
        return this.markdownPage.getFullPath(mdPath);
    }

    public async getNavContents(rootPath: string): Promise<MdNavContents> {

        const children = await this.recurseDir(rootPath);
        const meta = await this.markdownPage.getMetadata(rootPath);

        return {
            meta,
            children
        };
    }
}
