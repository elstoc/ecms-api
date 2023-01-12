export interface IMarkdownPage {
    getContentPath(): string,
    getMetadata(): Promise<undefined | { [key: string]: string | undefined}>
}
