import fs from 'fs';

import { MarkdownPage } from './MarkdownPage';
import { IMarkdown, MdNavContents } from './IMarkdown';
import { SitePaths } from '../site';

export class Markdown implements IMarkdown {
    private pageCache: { [key: string]: MarkdownPage } = {};

    public constructor(
        private paths: SitePaths
    ) { }

    public getSourcePath(uiPath: string): string {
        const page = this.getPage(uiPath);
        return page.getContentPath();
    }

    private getPage(uiPath: string): MarkdownPage {
        let page = this.pageCache[uiPath];
        if (!page) {
            page = new MarkdownPage(this.paths, uiPath);
            this.pageCache[uiPath] = page;
        }
        return page;
    }

    public async getNavData(uiPath: string): Promise<MdNavContents | undefined> {
        const contentPath = this.paths.getContentPath(uiPath);
        if (fs.existsSync(contentPath) && fs.statSync(contentPath).isDirectory()) {
            return {
                meta: await this.getPageMetadata(uiPath),
                children: await this.getNavChildren(uiPath)
            };
        } else if (!contentPath.endsWith('/index') && fs.existsSync(`${contentPath}.md`)) {
            return {
                meta: await this.getPageMetadata(uiPath)
            };
        }
    }

    private async getNavChildren(uiPath: string): Promise<MdNavContents[]> {
        const children: MdNavContents[] = [];
        const fullPath = this.paths.getContentPathIfExists(uiPath);
        const files = await fs.promises.readdir(fullPath);

        for (const file of files) {
            const childRelPath = `${uiPath}/${file}`.replace('.md','');
            const navData = await this.getNavData(childRelPath);
            navData && children.push(navData);
        }

        return children;
    }

    private async getPageMetadata(uiPath: string): Promise<undefined | { [key: string]: string | undefined}> {
        const page = this.getPage(uiPath);
        return await page.getMetadata();
    }
}
