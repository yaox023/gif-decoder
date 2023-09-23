import { DecodedGif } from "./types";

class Player {
  private loopCount: number;
  private canvas: HTMLCanvasElement;
  private isStoped = false;
  private ctx: CanvasRenderingContext2D;
  private imageData: ImageData;

  constructor(private gif: DecodedGif, private container: HTMLElement) {
    this.loopCount =
      gif.loopCount === 0
        ? Infinity
        : gif.loopCount === undefined
        ? 1
        : gif.loopCount;

    this.canvas = document.createElement("canvas");
    this.canvas.width = gif.width;
    this.canvas.height = gif.height;
    this.ctx = this.canvas.getContext("2d")!;
    this.imageData = this.ctx.getImageData(
      0,
      0,
      this.gif.width,
      this.gif.height
    );
    this.container.appendChild(this.canvas);
    console.log(gif);
  }

  play() {
    this.renderFrame(0);
  }

  renderFrame(frameIndex: number) {
    const frame = this.gif.frames[frameIndex];
    const colorTable = frame.localColorTableFlag
      ? frame.localColorTable
      : this.gif.globalColorTable;
    if (colorTable === undefined) throw new Error("no color table");

    let i = 0;
    for (let x = frame.top; x < frame.top + frame.height; x++) {
      for (let y = frame.left; y < frame.left + frame.width; y++) {
        const j = x * this.gif.width * 4 + y * 4;
        const colorIndex = frame.colorIndexes[i++];
        if (
          frame.transparentColorFlag &&
          frame.transparentColorIndex === colorIndex
        ) {
          continue;
        }

        const { r, g, b } = colorTable[colorIndex];
        this.imageData.data[j] = r;
        this.imageData.data[j + 1] = g;
        this.imageData.data[j + 2] = b;
        this.imageData.data[j + 3] = 255;
      }
    }
    this.ctx.putImageData(this.imageData, 0, 0);

    if (this.isStoped || this.loopCount <= 0) return;

    setTimeout(() => {
      const nextFrameIndex =
        frameIndex + 1 < this.gif.frames.length ? frameIndex + 1 : 0;
      if (nextFrameIndex === this.gif.frames.length - 1) {
        this.loopCount--;
      }
      this.renderFrame(nextFrameIndex);
    }, frame.delayTime * 10);
  }
}

export default Player;
