// The rows of an Interlaced images are arranged in the following order:

//       Group 1 : Every 8th. row, starting with row 0.              (Pass 1)
//       Group 2 : Every 8th. row, starting with row 4.              (Pass 2)
//       Group 3 : Every 4th. row, starting with row 2.              (Pass 3)
//       Group 4 : Every 2nd. row, starting with row 1.              (Pass 4)

// The Following example illustrates how the rows of an interlaced image are
// ordered.

//       Row Number                                        Interlace Pass

//  0    -----------------------------------------       1
//  1    -----------------------------------------                         4
//  2    -----------------------------------------                   3
//  3    -----------------------------------------                         4
//  4    -----------------------------------------             2
//  5    -----------------------------------------                         4
//  6    -----------------------------------------                   3
//  7    -----------------------------------------                         4
//  8    -----------------------------------------       1
//  9    -----------------------------------------                         4
//  10   -----------------------------------------                   3
//  11   -----------------------------------------                         4
//  12   -----------------------------------------             2
//  13   -----------------------------------------                         4
//  14   -----------------------------------------                   3
//  15   -----------------------------------------                         4
//  16   -----------------------------------------       1
//  17   -----------------------------------------                         4
//  18   -----------------------------------------                   3
//  19   -----------------------------------------                         4
export function deinterlace(
  data: number[],
  width: number,
  height: number
): number[] {
  const output: number[] = new Array(data.length);
  let dataIndex = 0;

  // Group 1: Every 8th row, starting with row 0
  for (let i = 0; i < height; i += 8) {
    for (let j = 0; j < width; j++) {
      output[i * width + j] = data[dataIndex++];
    }
  }

  // Group 2: Every 8th row, starting with row 4
  for (let i = 4; i < height; i += 8) {
    for (let j = 0; j < width; j++) {
      output[i * width + j] = data[dataIndex++];
    }
  }

  // Group 3: Every 4th row, starting with row 2
  for (let i = 2; i < height; i += 4) {
    for (let j = 0; j < width; j++) {
      output[i * width + j] = data[dataIndex++];
    }
  }

  // Group 4: Every 2nd row, starting with row 1
  for (let i = 1; i < height; i += 2) {
    for (let j = 0; j < width; j++) {
      output[i * width + j] = data[dataIndex++];
    }
  }

  return output;
}
