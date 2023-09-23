import BitReader from "./BitReader";

export const decode = (
  minCodeSize: number,
  data: Uint8Array,
  pixelCount: number
): number[] => {
  const MAX_CODE = Math.pow(2, 12),
    INIT_DICTIONARY_SIZE = Math.pow(2, minCodeSize),
    CLEAR_CODE = INIT_DICTIONARY_SIZE,
    END_CODE = CLEAR_CODE + 1,
    NULL_CODE = -1;

  const output: number[] = [],
    bitReader = new BitReader(data, minCodeSize),
    prefix: number[] = Array(INIT_DICTIONARY_SIZE).fill(0),
    suffix: number[] = Array(INIT_DICTIONARY_SIZE)
      .fill(0)
      .map((_, index) => index);

  let prevCode = NULL_CODE,
    nextKey = CLEAR_CODE + 2,
    lastCode = 0,
    i = 0;

  while (i < pixelCount) {
    const curCode = bitReader.read();

    if (curCode > nextKey) throw new Error("code bigger than nextKey");

    if (curCode === END_CODE) break;

    if (curCode === CLEAR_CODE) {
      bitReader.resetCodeSize();
      nextKey = CLEAR_CODE + 2;
      prevCode = NULL_CODE;
      continue;
    }

    if (prevCode === NULL_CODE) {
      output.push(curCode);
      prevCode = curCode;
      lastCode = curCode;
      i++;
      continue;
    }

    let code = curCode;
    const stack: number[] = [];

    if (code === nextKey) {
      stack.push(lastCode);
      code = prevCode;
    }

    while (code > CLEAR_CODE) {
      stack.push(suffix[code]);
      code = prefix[code];
    }
    lastCode = suffix[code];
    stack.push(lastCode);

    if (nextKey < MAX_CODE) {
      prefix[nextKey] = prevCode;
      suffix[nextKey] = lastCode;
      nextKey++;

      if (
        nextKey > bitReader.getMaxNumberByCurrentCodeSize() &&
        nextKey < MAX_CODE
      ) {
        bitReader.increaseCodeSize();
      }
    }

    prevCode = curCode;
    output.push(...stack.reverse());
    i++;
  }

  output.push(...Array(pixelCount - output.length).fill(0));

  return output;
};
