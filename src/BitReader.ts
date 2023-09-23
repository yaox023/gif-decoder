class BitReader {
  private data: Uint8Array;
  private minCodeSize: number;

  private codeSize!: number;
  private codeBitMask!: number;

  private currentByteIndex = 0;
  private cache = 0;
  private cacheCodeSize = 0;

  constructor(data: Uint8Array, minCodeSize: number) {
    this.data = data;
    this.minCodeSize = minCodeSize;
    this.resetCodeSize();
  }

  resetCodeSize() {
    this.codeSize = this.minCodeSize + 1;
    this.calculateCodeBitMask();
  }

  increaseCodeSize() {
    this.codeSize++;
    this.calculateCodeBitMask();
  }

  getMaxNumberByCurrentCodeSize() {
    return Math.pow(2, this.codeSize) - 1;
  }

  private calculateCodeBitMask() {
    this.codeBitMask = 2 ** this.codeSize - 1;
  }

  // bit layout(5-bit)
  //    +---------------+
  // 0  |               |    bbbaaaaa
  //    +---------------+
  // 1  |               |    dcccccbb
  //    +---------------+
  // 2  |               |    eeeedddd
  //    +---------------+
  // 3  |               |    ggfffffe
  //    +---------------+
  // 4  |               |    hhhhhggg
  //    +---------------+
  //          . . .
  //    +---------------+
  // N  |               |
  //    +---------------+
  // first value: aaaaa
  // second value: bbbbb
  // third value: ccccc
  // ...
  read(): number {
    while (this.cacheCodeSize < this.codeSize) {
      if (this.currentByteIndex >= this.data.byteLength)
        throw new Error("no enough data");
      this.cache |= this.data[this.currentByteIndex++] << this.cacheCodeSize;
      this.cacheCodeSize += 8;
    }
    const v = this.cache & this.codeBitMask;
    this.cache >>= this.codeSize;
    this.cacheCodeSize -= this.codeSize;
    return v;
  }
}

export default BitReader;
