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
            const childRelPath = `${relPath}/${file}`.replace('.md','');
            const stats = await fs.promises.stat(this.paths.getContentPath(relPath, file));
            if (stats.isDirectory()) {
                const grandChildren = await this.recurseDir(childRelPath);
                const meta = await this.markdownPage.getMetadata(childRelPath);
                children.push({
                    meta,
                    children: grandChildren
                });
            } else if (file.endsWith('.md') && !file.endsWith('index.md')) {
                const meta = await this.markdownPage.getMetadata(childRelPath);
                children.push({
                    meta
                });
            }
        }

        return children;
    }

    public getMdFilePath(relPath: string) {
        return this.markdownPage.getFullPath(relPath);
    }

    public async getNavContents(relPath: string): Promise<MdNavContents> {

        const children = await this.recurseDir(relPath);
        const meta = await this.markdownPage.getMetadata(relPath);

        return {
            meta,
            children
        };
    }
}
