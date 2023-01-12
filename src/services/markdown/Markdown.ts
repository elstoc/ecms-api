import fs from 'fs';

import { MarkdownPage } from './MarkdownPage';
import { IMarkdown, MdNavContents } from './IMarkdown';
import { SitePaths } from '../site/SitePaths';

export class Markdown implements IMarkdown {
    private pageCache: { [key: string]: MarkdownPage } = {};

    public constructor(
        private paths: SitePaths
    ) { }

    public getSourcePath(relPath: string): string {
        const page = this.getPage(relPath);
        return page.getContentPath();
    }

    private getPage(relPath: string): MarkdownPage {
        let page = this.pageCache[relPath];
        if (!page) {
            page = new MarkdownPage(this.paths, relPath);
            this.pageCache[relPath] = page;
        }
        return page;
    }

    public async getNavData(relPath: string): Promise<MdNavContents | undefined> {
        const contentPath = this.paths.getContentPath(relPath);
        if (fs.existsSync(contentPath) && fs.statSync(contentPath).isDirectory()) {
            return {
                meta: await this.getPageMetadata(relPath),
                children: await this.getNavChildren(relPath)
            };
        } else if (!contentPath.endsWith('/index') && fs.existsSync(`${contentPath}.md`)) {
            return {
                meta: await this.getPageMetadata(relPath)
            };
        }
    }

    private async getNavChildren(relPath: string): Promise<MdNavContents[]> {
        const children: MdNavContents[] = [];
        const fullPath = this.paths.getContentPathIfExists(relPath);
        const files = await fs.promises.readdir(fullPath);

        for (const file of files) {
            const childRelPath = `${relPath}/${file}`.replace('.md','');
            const navData = await this.getNavData(childRelPath);
            navData && children.push(navData);
        }

        return children;
    }

    private async getPageMetadata(relPath: string): Promise<undefined | { [key: string]: string | undefined}> {
        const page = this.getPage(relPath);
        return await page.getMetadata();
    }
}
