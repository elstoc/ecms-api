/* eslint-disable  @typescript-eslint/no-explicit-any */
import fs from 'fs';
import { Site, SiteComponent } from '../../../src/services';

jest.mock('fs');
jest.mock('../../../src/services/site/SiteComponent');

const config = {
    dataDir: '/path/to/data',
} as any;

describe('Site', () => {

    describe('constructor', () => {
        it('generates objects and component cache', () => {
            (fs.readdirSync as jest.Mock).mockReturnValue([
                'component01.yaml',
                'component02.yaml',
                'component03.yaml',
                'notcomponent.txt',
                'notcomponent.jpg'
            ]);
            new Site(config);
            expect(SiteComponent).toBeCalledTimes(3);
        });
    });

    describe('listComponents', () => {
        let site: Site;
        
        it('only creates new SiteComponent instances for files it has not seen before', () => {
            (SiteComponent as jest.Mock).mockImplementation((_, inputFilePath) => ({
                getMetadata: () => ({ uiPath: inputFilePath })
            }));
            (fs.readdirSync as jest.Mock).mockReturnValue([
                'component01.yaml',
                'component02.yaml',
                'component03.yaml',
                'notcomponent.txt',
                'notcomponent.jpg'
            ]);
            site = new Site(config);

            expect(SiteComponent).toBeCalledTimes(3);
            (fs.readdirSync as jest.Mock).mockReturnValue([
                'component01.yaml',
                'component02.yaml',
                'component03.yaml',
                'component04.yaml',
            ]);
            site.listComponents();
            expect(SiteComponent).toBeCalledTimes(4);
        });
    
        it('returns correct data for only the yaml files in the source directory', () => {
            (SiteComponent as jest.Mock).mockImplementation((_, inputFilePath) => ({
                getMetadata: () => ({ uiPath: inputFilePath })
            }));
            (fs.readdirSync as jest.Mock).mockReturnValue([
                'component01.yaml',
                'component02.yaml',
                'component03.yaml',
                'notcomponent.txt',
                'notcomponent.jpg'
            ]);
            site = new Site(config);

            const expectedNavData = [
                { uiPath: 'component01' },
                { uiPath: 'component02' },
                { uiPath: 'component03' }
            ];
    
            const actualNavData = site.listComponents();
    
            expect(actualNavData).toStrictEqual(expectedNavData);
        });

        it('sorts weighted components first, ascending numerically by weight, then unweighted components ascending alphabetically by title', () => {
            (SiteComponent as jest.Mock).mockImplementation((_, inputFilePath) => ({
                getMetadata: () => {
                    const returnData = { uiPath: inputFilePath, title: inputFilePath } as any;
                    if (inputFilePath.endsWith('componentE')) returnData.weight = 10;
                    if (inputFilePath.endsWith('componentG')) returnData.weight = 20;
                    if (inputFilePath.endsWith('componentB')) returnData.weight = 30;
                    return returnData;
                }
            }));
            (fs.readdirSync as jest.Mock).mockReturnValue([
                'componentA.yaml',
                'componentB.yaml',
                'componentC.yaml',
                'componentD.yaml',
                'componentE.yaml',
                'componentF.yaml',
                'componentG.yaml',
            ]);
            site = new Site(config);

            const expectedNavData = [
                { uiPath: 'componentE', title: 'componentE', weight: 10 },
                { uiPath: 'componentG', title: 'componentG', weight: 20 },
                { uiPath: 'componentB', title: 'componentB', weight: 30 },
                { uiPath: 'componentA', title: 'componentA' },
                { uiPath: 'componentC', title: 'componentC' },
                { uiPath: 'componentD', title: 'componentD' },
                { uiPath: 'componentF', title: 'componentF' },
            ];

            const actualNavData = site.listComponents();
    
            expect(actualNavData).toStrictEqual(expectedNavData);
        });
    });

    describe('getGalleryImages', () => {
        it('runs getImages on the appropriate gallery object', async () => {
            (SiteComponent as jest.Mock).mockImplementation((_, inputFilePath) => ({
                getGallery: () => ({ getImages: (limit: number) => `${inputFilePath}-${limit}-metadata` })
            }));
            (fs.readdirSync as jest.Mock).mockReturnValue([
                'component01.yaml',
                'component02.yaml',
                'component03.yaml',
            ]);
            const site = new Site(config);
            const expectedGallerydata = 'component01-30-metadata';
            const actualGallerydata = await site.getGalleryImages('component01', 30);
            expect(actualGallerydata).toBe(expectedGallerydata);
        });
    });

    describe('sendGalleryImage', () => {
        it('calls sendImageFile on the appropriate gallery object', async () => {
            const response = {
                sendFile: jest.fn(),
            } as any;

            const sendImageFile = jest.fn();

            (SiteComponent as jest.Mock).mockImplementation(() => ({
                getGallery: () => ({ sendImageFile })
            }));
            (fs.readdirSync as jest.Mock).mockReturnValue([
                'component01.yaml',
                'component02.yaml',
                'component03.yaml',
            ]);
            const site = new Site(config);
            await site.sendGalleryImage('component01/image1.jpg', 'thumb', response);
            expect(sendImageFile).toBeCalled();
            expect(sendImageFile).toBeCalledWith('component01/image1.jpg', 'thumb', response);
        });
    });

    describe('getMarkdownStructure', () => {
        it('runs getMarkdownStructure on the appropriate markdown object', async () => {
            (SiteComponent as jest.Mock).mockImplementation((_, inputFilePath) => ({
                getMarkdown: () => ({ getStructure: () => `${inputFilePath}-struct` })
            }));
            (fs.readdirSync as jest.Mock).mockReturnValue([
                'component01.yaml',
                'component02.yaml',
                'component03.yaml',
            ]);
            const site = new Site(config);
            const expectedMarkdownStructure = 'component02-struct';
            const actualMarkdownStructure = await site.getMarkdownStructure('component02');
            expect(actualMarkdownStructure).toBe(expectedMarkdownStructure);
        });
    });

    describe('sendMarkdownFile', () => {
        it('runs sendFile on the appropriate markdown object', () => {
            (SiteComponent as jest.Mock).mockImplementation((_, inputFilePath) => ({
                getMarkdown: () => ({ sendFile: (apiPath: string) => `${inputFilePath}-${apiPath}-markdown` })
            }));
            (fs.readdirSync as jest.Mock).mockReturnValue([
                'component01.yaml',
                'component02.yaml',
                'component03.yaml',
            ]);
            const site = new Site(config);
            const expectedPath = 'component02-component02/path/to/file-markdown';
            const actualPath = site.sendMarkdownFile('component02/path/to/file', 'nothing' as any);
            expect(actualPath).toBe(expectedPath);
        });
    });
});
