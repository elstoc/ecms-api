export type Dimensions = {
    width: number | undefined;
    height: number | undefined;
};

export type ImageData = {
    fileName: string;
    sourceModificationTime: number;
    exif: { [key: string]: string | undefined };
    thumbDimensions: Dimensions;
}

export type GalleryData = {
    imageCount: number;
    imageList: ImageData[];
}
