import { DisposalMethod, Frame, GraphicControlExtension, Pixel } from "./types";

class Parser {
  private dataArray: Uint8Array;
  private dataView: DataView;
  private byteOffset = 0;

  constructor(arrayBuffer: ArrayBuffer) {
    this.dataArray = new Uint8Array(arrayBuffer);
    this.dataView = new DataView(arrayBuffer);
  }

  private readByte() {
    return this.dataArray[this.byteOffset++];
  }

  private readBytes(n: number) {
    const bytes = this.dataArray.slice(this.byteOffset, this.byteOffset + n);
    this.byteOffset += n;
    return bytes;
  }

  private readChar() {
    return String.fromCodePoint(this.readByte());
  }

  private readString(n: number) {
    return String.fromCodePoint(...this.readBytes(n));
  }

  private readUint16LE() {
    const v = this.dataView.getUint16(this.byteOffset, true);
    this.byteOffset += 2;
    return v;
  }

  private peek(offset: number = 0) {
    return this.dataArray[this.byteOffset + offset];
  }

  private readHeader() {
    const signature = this.readChar() + this.readChar() + this.readChar();
    if (signature !== "GIF") {
      throw new Error(`invalid signature, got: ${signature}`);
    }
    const version = this.readChar() + this.readChar() + this.readChar();
    if (version !== "89a") {
      throw new Error(`invalid version, got: ${version}`);
    }
  }

  private readTrailer() {
    this.readByte();
  }

  private readLogicalScreenDescriptor() {
    const logicalScreenWidth = this.readUint16LE();
    const logicalScreenHeight = this.readUint16LE();

    const packedFields = this.readByte();
    const globalColorTableFlag = (packedFields >> 7) & 1;
    // const colorResolution = (packedFields >> 4) & 0b0111;
    // const sortFlag = (packedFields >> 4) & 1;
    const sizeOfGlobalColorTable = packedFields & 0b00000111;
    const backgroundColorIndex = this.readByte();
    this.readByte(); // pixelAspectRatio
    return {
      width: logicalScreenWidth,
      height: logicalScreenHeight,
      sizeOfGlobalColorTable,
      backgroundColorIndex,
      globalColorTableFlag: !!globalColorTableFlag,
    };
  }

  private readColorTable(size: number) {
    const colorTable: Pixel[] = [];
    const numOfPixels = Math.pow(2, size + 1);
    let count = numOfPixels;
    while (count-- > 0) {
      colorTable.push({
        r: this.readByte(),
        g: this.readByte(),
        b: this.readByte(),
      });
    }
    return colorTable;
  }

  private readPlainTextExtension() {
    if (this.peek() !== 0x21 || this.peek(1) !== 0x01 || this.peek(2) !== 12)
      return;

    this.readByte(); // extension introducer
    this.readByte(); // extension label
    this.readByte(); // block size

    this.readBytes(12);
    const plainTextData = this.readDataSubblocks();
    return {
      plainTextData,
    };
  }

  private readApplicationExtension() {
    if (this.peek() !== 0x21 || this.peek(1) !== 0xff || this.peek(2) !== 11)
      return;
    this.readByte(); // extension introducer
    this.readByte(); // extension label
    this.readByte(); // block size

    const applitionIdentifier = this.readString(8);
    const applicationCode = this.readBytes(3);
    const applicationData = this.readDataSubblocks();
    if (
      applitionIdentifier === "NETSCAPE" &&
      applicationData.length > 0 &&
      applicationData[0].byteLength === 3 &&
      applicationData[0][0] === 0x01
    ) {
      const loopCount = applicationData[0][2] << 8 || applicationData[0][1];
      return {
        key: "NetscapeLoopingApplicationExtension",
        applitionIdentifier,
        applicationCode,
        loopCount,
      } as const;
    }
    return {
      key: "UnkowwnApplicationExtension",
      applitionIdentifier,
      applicationCode,
    } as const;
  }

  private readDataSubblocks() {
    const subBlocks: Uint8Array[] = [];
    let subBlockSize = this.readByte();
    while (subBlockSize !== 0) {
      subBlocks.push(this.readBytes(subBlockSize));
      subBlockSize = this.readByte();
    }
    return subBlocks;
  }

  private readCommentExtension() {
    if (this.peek() !== 0x21 || this.peek(1) !== 0xfe) return;
    this.readByte(); // extension introducer
    this.readByte(); // extension label

    const commentData = this.readDataSubblocks();
    return { commentData };
  }

  private readGraphicControlExtension() {
    if (this.peek() !== 0x21 || this.peek(1) !== 0xf9 || this.peek(2) !== 4)
      return;

    this.readByte(); // extension introducer
    this.readByte(); // extension label
    this.readByte(); // block size

    const packedFields = this.readByte();
    const disposalMethod = (packedFields >> 2) & 0b00000111;
    // const userInputFlag = (packedFields >> 1) & 1;
    const transparentColorFlag = packedFields & 1;

    const delayTime = this.readUint16LE();
    const transparentColorIndex = this.readByte();

    // block terminator
    this.readByte();

    return {
      // 3 bits, can be sure with this assertion
      disposalMethod: disposalMethod as DisposalMethod,
      transparentColorFlag: !!transparentColorFlag,
      delayTime,
      transparentColorIndex,
    };
  }

  private readImageDescriptor() {
    if (this.peek() !== 0x2c) return;

    this.readByte(); // image separator
    const imageLeftPosition = this.readUint16LE();
    const imageTopPosition = this.readUint16LE();
    const imageWidth = this.readUint16LE();
    const imageHeight = this.readUint16LE();

    const packedFields = this.readByte();
    const localColorTableFlag = (packedFields >> 7) & 1;
    const interlaceFlag = (packedFields >> 6) & 1;
    // const sortFlag = (packedFields >> 5) & 1;
    const sizeOfLocalColorTable = packedFields & 0b00000111;
    if (localColorTableFlag === 0 && sizeOfLocalColorTable !== 0) {
      throw new Error(
        `size of local color table should be 0, got ${sizeOfLocalColorTable}`
      );
    }

    return {
      top: imageTopPosition,
      left: imageLeftPosition,
      width: imageWidth,
      height: imageHeight,
      localColorTableFlag: !!localColorTableFlag,
      interlaceFlag: !!interlaceFlag,
      sizeOfLocalColorTable,
    };
  }

  private readImageData() {
    const lzwMinimumCodeSize = this.readByte();
    const imageData: Uint8Array[] = [];
    let subBlockSize = this.readByte();
    while (subBlockSize != 0) {
      imageData.push(this.readBytes(subBlockSize));
      subBlockSize = this.readByte();
    }
    return {
      lzwMinimumCodeSize,
      imageData: new Uint8Array(imageData.map((v) => [...v]).flat()),
    };
  }

  parse() {
    const { logicalScreen, blocks } = this.readGifDataStream();

    const frames: Frame[] = [];
    let loopCount;
    let prevGraphicExtension: GraphicControlExtension | undefined;

    for (const block of blocks) {
      if (block.key === "SpecialPurposeBlock") {
        const specialPurposeBlock = block.value;
        if (specialPurposeBlock.key === "ApplicationExtension") {
          const applicationExtension = specialPurposeBlock.value;
          if (
            applicationExtension.key === "NetscapeLoopingApplicationExtension"
          ) {
            loopCount = applicationExtension.loopCount;
          }
        }
        continue;
      }

      if (block.key === "GraphicBlock") {
        const specialPurposeBlock = block.value;
        const graphicControlExtension =
          specialPurposeBlock.graphicControlExtension;
        const graphicRenderingBlock = specialPurposeBlock.graphicRenderingBlock;
        if (graphicRenderingBlock?.key === "PlainTextExtension") continue;
        if (graphicControlExtension && graphicRenderingBlock) {
          const tableBasedImage = graphicRenderingBlock.value;
          frames.push({
            ...graphicControlExtension,
            ...tableBasedImage.imageDescriptor,
            ...tableBasedImage.imageData,
            localColorTable: tableBasedImage.localColorTable,
          });
          prevGraphicExtension = undefined;
          continue;
        }
        if (graphicControlExtension) {
          prevGraphicExtension = graphicControlExtension;
          continue;
        }
        if (graphicRenderingBlock) {
          if (!prevGraphicExtension)
            throw new Error("no graphicControlExtension");
          const tableBasedImage = graphicRenderingBlock.value;
          frames.push({
            ...prevGraphicExtension,
            ...tableBasedImage.imageDescriptor,
            ...tableBasedImage.imageData,
            localColorTable: tableBasedImage.localColorTable,
          });
          prevGraphicExtension = undefined;
          continue;
        }
      }
    }

    return {
      ...logicalScreen,
      frames,
      loopCount,
    };
  }

  // <GIF Data Stream> ::= Header <Logical Screen> <Data>* Trailer
  private readGifDataStream() {
    this.readHeader();
    const logicalScreen = this.readLogicalScreen();

    const blocks = [];
    while (this.peek() !== 0) {
      const data = this.readData();
      if (!data) break;
      blocks.push(data);
    }
    this.readTrailer();

    return {
      logicalScreen,
      blocks,
    };
  }

  // <Logical Screen> ::= Logical Screen Descriptor [Global Color Table]
  private readLogicalScreen() {
    const logicalScreenDescriptor = this.readLogicalScreenDescriptor();
    let globalColorTable: Pixel[] | undefined = undefined;
    if (logicalScreenDescriptor.globalColorTableFlag) {
      globalColorTable = this.readColorTable(
        logicalScreenDescriptor.sizeOfGlobalColorTable
      );
    }
    return {
      ...logicalScreenDescriptor,
      globalColorTable,
    };
  }

  // <Data> ::= <Graphic Block> | <Special-Purpose Block>
  private readData() {
    const graphicBlock = this.readGraphicBlock();
    if (graphicBlock)
      return { key: "GraphicBlock", value: graphicBlock } as const;

    const specialPurposeBlock = this.readSpecialPurposeBlock();
    if (specialPurposeBlock)
      return {
        key: "SpecialPurposeBlock",
        value: specialPurposeBlock,
      } as const;
  }

  // <Graphic Block> ::= [Graphic Control Extension] <Graphic-Rendering Block>
  private readGraphicBlock() {
    const graphicControlExtension = this.readGraphicControlExtension();
    const graphicRenderingBlock = this.readGraphicRenderingBlock();
    if (graphicControlExtension || graphicRenderingBlock) {
      return {
        graphicControlExtension,
        graphicRenderingBlock,
      };
    }
  }

  // <Graphic-Rendering Block> ::= <Table-Based Image> | Plain Text Extension
  private readGraphicRenderingBlock() {
    const tableBasedImage = this.readTableBasedImage();
    if (tableBasedImage)
      return { key: "TableBasedImage", value: tableBasedImage } as const;

    const plainTextExtension = this.readPlainTextExtension();
    if (plainTextExtension)
      return { key: "PlainTextExtension", value: plainTextExtension } as const;
  }

  // <Table-Based Image> ::= Image Descriptor [Local Color Table] Image Data
  private readTableBasedImage() {
    const imageDescriptor = this.readImageDescriptor();
    if (!imageDescriptor) return;

    let localColorTable: Pixel[] | undefined = undefined;
    if (imageDescriptor.localColorTableFlag) {
      localColorTable = this.readColorTable(
        imageDescriptor.sizeOfLocalColorTable
      );
    }
    const imageData = this.readImageData();
    return {
      imageDescriptor,
      localColorTable,
      imageData,
    };
  }

  // <Special-Purpose Block> ::= Application Extension | Comment Extension
  private readSpecialPurposeBlock() {
    const applicationExtension = this.readApplicationExtension();
    if (applicationExtension)
      return {
        key: "ApplicationExtension",
        value: applicationExtension,
      } as const;

    const commentExtension = this.readCommentExtension();
    if (commentExtension)
      return { key: "CommentExtension", value: commentExtension } as const;
  }
}

export default Parser;
