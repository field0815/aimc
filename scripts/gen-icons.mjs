// 임시 아이콘 생성: public/icon.svg → icon-192.png, icon-512.png, apple-touch-icon.png
// 교체 시: public/icon.svg 를 새 디자인으로 바꾸고 `node scripts/gen-icons.mjs` 재실행.
import sharp from "sharp";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const svg = readFileSync(path.join(root, "public", "icon.svg"));

const targets = [
  { file: "icon-192.png", size: 192 },
  { file: "icon-512.png", size: 512 },
  { file: "apple-touch-icon.png", size: 180 },
];

for (const { file, size } of targets) {
  await sharp(svg, { density: 384 })
    .resize(size, size)
    .png()
    .toFile(path.join(root, "public", file));
  console.log(`✓ public/${file} (${size}x${size})`);
}
