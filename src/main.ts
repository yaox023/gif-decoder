import { deinterlace } from "./interlacing";
import { decode } from "./lzw";
import Parser from "./Parser";
import Player from "./Player";

async function play(path: string) {
  const file = await fetch(path);
  const arrayBuffer = await file.arrayBuffer();

  const parser = new Parser(arrayBuffer);
  const gif = parser.parse();

  const decodedGif = {
    ...gif,
    frames: gif.frames.map((frame) => {
      let colorIndexes = decode(
        frame.lzwMinimumCodeSize,
        frame.imageData,
        frame.width * frame.height
      );
      if (frame.interlaceFlag) {
        colorIndexes = deinterlace(colorIndexes, frame.width, frame.height);
      }
      return {
        ...frame,
        colorIndexes,
      };
    }),
  };

  console.log({ path, gif, decodedGif });

  const app = document.querySelector<HTMLDivElement>("#app")!;
  const container = document.createElement("div");
  const h1 = document.createElement("h1");
  h1.innerText = path;
  container.append(h1);
  app.appendChild(container);

  const img = document.createElement("img");
  img.src = path;
  container.appendChild(img);

  const player = new Player(decodedGif, container);
  player.play();
}

async function main() {
  await play("/demo-1.gif");
  await play("/demo-2.gif");
  await play("/demo-3.gif");
  await play("/demo-4.gif");
  await play("/demo-5.gif");
}

main();
