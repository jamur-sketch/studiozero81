// Renders a project saved from the editor ("Salvar") on this machine, with the full Remotion renderer.
// Usage: npm run render -- <projeto.json> [pasta-de-midia] [saida.mp4]
import { bundle } from "@remotion/bundler";
import { renderMedia, selectComposition } from "@remotion/renderer";
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const [projectPath, mediaDir = path.join(root, "public"), outArg] = process.argv.slice(2);

if (!projectPath) {
  console.error("Uso: npm run render -- <projeto.json> [pasta-de-midia] [saida.mp4]");
  process.exit(1);
}

const project = JSON.parse(readFileSync(projectPath, "utf8"));
const publicDir = path.resolve(mediaDir);

// Saved projects keep only file names; resolve them from the media folder via staticFile().
for (const asset of project.assets) {
  if (asset.src && /^(https?:|data:)/.test(asset.src)) continue;
  asset.src = asset.name;
  const used = project.clips.some((c) => c.assetId === asset.id);
  if (used && !existsSync(path.join(publicDir, asset.name))) {
    console.error(`Arquivo não encontrado em ${publicDir}: ${asset.name}`);
    process.exit(1);
  }
}

const output = path.resolve(outArg ?? path.join(root, "out", `${project.name || "video"}.mp4`));
const inputProps = { project };
// Optional: use an existing Chrome/Chromium instead of downloading Chrome Headless Shell.
const browserExecutable = process.env.REMOTION_BROWSER_EXECUTABLE ?? null;

console.log("Empacotando…");
const serveUrl = await bundle({
  entryPoint: path.join(root, "src/remotion/index.ts"),
  publicDir,
});
const composition = await selectComposition({ serveUrl, id: "Editor", inputProps, browserExecutable });

let last = -1;
await renderMedia({
  composition,
  serveUrl,
  codec: "h264",
  outputLocation: output,
  inputProps,
  browserExecutable,
  onProgress: ({ progress }) => {
    const pct = Math.floor(progress * 100);
    if (pct !== last && pct % 5 === 0) {
      last = pct;
      console.log(`${pct}%`);
    }
  },
});
console.log(`Pronto: ${output}`);
