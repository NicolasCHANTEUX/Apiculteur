// Génère les icônes du site à partir de src/lib/logo.ts (npm run icons) :
// - src/app/icon.svg et src/app/favicon.ico (16, 32, 48) : version réduite
//   à trois alvéoles, lisible dans un onglet ;
// - src/app/apple-icon.png (180) : logo complet sur fond crème, iOS
//   n'acceptant pas la transparence ;
// - public/icons/ : icônes du manifest (src/app/manifest.ts), dont une
//   version « maskable » avec la marge que demande Android.
import { mkdir, writeFile } from "node:fs/promises";
import sharp from "sharp";
import { faviconMark, logoColors, logoMark, logoSvg } from "../src/lib/logo.ts";

const root = new URL("../", import.meta.url);

function png(svg, size) {
  // Densité élevée : le SVG est rastérisé net, puis réduit.
  return sharp(Buffer.from(svg), { density: 72 * (size / 64) * 4 })
    .resize(size, size)
    .png({ compressionLevel: 9 })
    .toBuffer();
}

// Fichier ICO contenant des images PNG (accepté par tous les navigateurs).
function ico(images) {
  const header = Buffer.alloc(6 + 16 * images.length);
  header.writeUInt16LE(0, 0);
  header.writeUInt16LE(1, 2);
  header.writeUInt16LE(images.length, 4);
  let offset = header.length;
  images.forEach(({ size, data }, i) => {
    const entry = 6 + 16 * i;
    header.writeUInt8(size >= 256 ? 0 : size, entry);
    header.writeUInt8(size >= 256 ? 0 : size, entry + 1);
    header.writeUInt8(0, entry + 2);
    header.writeUInt8(0, entry + 3);
    header.writeUInt16LE(1, entry + 4);
    header.writeUInt16LE(32, entry + 6);
    header.writeUInt32LE(data.length, entry + 8);
    header.writeUInt32LE(offset, entry + 12);
    offset += data.length;
  });
  return Buffer.concat([header, ...images.map(({ data }) => data)]);
}

const favicon = logoSvg(faviconMark);
const onCream = (padding) => logoSvg(logoMark, { background: logoColors.cream, padding });

const outputs = {
  "src/app/icon.svg": favicon,
  "src/app/favicon.ico": ico(
    await Promise.all([16, 32, 48].map(async (size) => ({ size, data: await png(favicon, size) }))),
  ),
  "src/app/apple-icon.png": await png(onCream(12), 180),
  "public/icons/icon-192.png": await png(logoSvg(logoMark, { padding: 4 }), 192),
  "public/icons/icon-512.png": await png(logoSvg(logoMark, { padding: 4 }), 512),
  "public/icons/icon-maskable-512.png": await png(onCream(16), 512),
};

await mkdir(new URL("public/icons/", root), { recursive: true });
for (const [path, content] of Object.entries(outputs)) {
  await writeFile(new URL(path, root), content);
  console.log(path);
}
