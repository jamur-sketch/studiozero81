// Uso: node render.mjs video <id>            → out/<id>.mp4
//      node render.mjs stills <id> 2 9 15.5  → out/<id>-<segundo>.png (conferir quadros)
import { bundle } from "@remotion/bundler";
import { renderMedia, renderStill, selectComposition } from "@remotion/renderer";
import path from "node:path";

const root = path.dirname(new URL(import.meta.url).pathname);
const [mode, id = "toqan", ...times] = process.argv.slice(2);
// Optional: use an existing Chrome instead of downloading Chrome Headless Shell.
const browserExecutable = process.env.REMOTION_BROWSER_EXECUTABLE ?? null;

const serveUrl = await bundle({ entryPoint: path.join(root, "src/index.ts"), publicDir: path.join(root, "public") });
const composition = await selectComposition({ serveUrl, id, browserExecutable });

if (mode === "stills") {
  for (const s of times) {
    const output = path.join(root, `out/${id}-${s}.png`);
    await renderStill({ composition, serveUrl, browserExecutable, frame: Math.round(Number(s) * 30), output });
    console.log(output);
  }
} else {
  let last = -1;
  await renderMedia({
    composition,
    serveUrl,
    browserExecutable,
    codec: "h264",
    crf: 18,
    audioBitrate: "192k",
    outputLocation: path.join(root, `out/${id}.mp4`),
    onProgress: ({ progress }) => {
      const p = Math.floor(progress * 10);
      if (p !== last) {
        last = p;
        console.log(`${p * 10}%`);
      }
    },
  });
  console.log(path.join(root, `out/${id}.mp4`));
}
