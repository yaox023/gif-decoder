export type LogicalScreenDescriptor = {
  width: number;
  height: number;
  sizeOfGlobalColorTable: number;
  backgroundColorIndex: number;
  globalColorTableFlag: boolean;
};

export type EncodedImageData = {
  lzwMinimumCodeSize: number;
  imageData: number[];
};

export type DisposalMethod = 0 | 1 | 2 | 3;

export type GraphicControlExtension = {
  disposalMethod: DisposalMethod;
  transparentColorFlag: boolean;
  delayTime: number;
  transparentColorIndex: number;
};

export type ImageDescriptor = {
  top: number;
  left: number;
  width: number;
  height: number;
  localColorTableFlag: boolean;
  interlaceFlag: boolean;
  sizeOfLocalColorTable: number;
};

export type TableBasedImageData = {
  lzwMinimumCodeSize: number;
  imageData: Uint8Array;
};

export type Frame = GraphicControlExtension &
  ImageDescriptor &
  TableBasedImageData & {
    localColorTable?: Pixel[];
  };

export type Pixel = {
  r: number;
  g: number;
  b: number;
};

export type Gif = LogicalScreenDescriptor & {
  frames: Frame[];
  globalColorTable?: Pixel[];
  loopCount?: number;
};

type DecodedFrame = Frame & {
  colorIndexes: number[];
};

export type DecodedGif = Omit<Gif, "frames"> & {
  frames: DecodedFrame[];
};
