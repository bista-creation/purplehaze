import fs from "node:fs";
import sharp from "sharp";

const svg = fs.readFileSync("public/icons/icon.svg");
const maskableSvg = Buffer.from(
  svg.toString().replace('rx="112"', 'rx="0"'),
);
const appleSvg = Buffer.from(
  svg.toString().replace('rx="112"', 'rx="0"'),
);

await sharp(svg).resize(192, 192).png().toFile("public/icons/icon-192.png");
await sharp(svg).resize(512, 512).png().toFile("public/icons/icon-512.png");
await sharp(maskableSvg)
  .resize(512, 512)
  .png()
  .toFile("public/icons/maskable-512.png");
await sharp(appleSvg).resize(180, 180).png().toFile("src/app/apple-icon.png");
await sharp(svg).resize(64, 64).png().toFile("src/app/icon.png");
console.log("Icons generated.");
