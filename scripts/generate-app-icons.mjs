/**
 * Generates Android mipmap + iOS AppIcon assets from src/assets/logo.png.
 * Run: node scripts/generate-app-icons.mjs
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import sharp from 'sharp';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, '..');
const LOGO = path.join(ROOT, 'src', 'assets', 'logo.png');
const BRAND_BLUE = { r: 0, g: 87, b: 184, alpha: 1 };

const ANDROID_RES = path.join(ROOT, 'android', 'app', 'src', 'main', 'res');
const IOS_ICON_DIR = path.join(ROOT, 'ios', 'TrafficEye', 'Images.xcassets', 'AppIcon.appiconset');

const ADAPTIVE_PX = {
  'mipmap-mdpi': 108,
  'mipmap-hdpi': 162,
  'mipmap-xhdpi': 216,
  'mipmap-xxhdpi': 324,
  'mipmap-xxxhdpi': 432,
};

const LEGACY_PX = {
  'mipmap-mdpi': 48,
  'mipmap-hdpi': 72,
  'mipmap-xhdpi': 96,
  'mipmap-xxhdpi': 144,
  'mipmap-xxxhdpi': 192,
};

const IOS_ICONS = [
  { name: 'Icon-20@2x.png', size: 40 },
  { name: 'Icon-20@3x.png', size: 60 },
  { name: 'Icon-29@2x.png', size: 58 },
  { name: 'Icon-29@3x.png', size: 87 },
  { name: 'Icon-40@2x.png', size: 80 },
  { name: 'Icon-40@3x.png', size: 120 },
  { name: 'Icon-60@2x.png', size: 120 },
  { name: 'Icon-60@3x.png', size: 180 },
  { name: 'Icon-1024.png', size: 1024 },
];

async function logoPng(size) {
  return sharp(LOGO)
    .resize(size, size, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .png()
    .toBuffer();
}

async function writeForeground(canvasPx, outFile) {
  const logoPx = Math.round(canvasPx * 0.72);
  const logo = await logoPng(logoPx);
  await sharp({
    create: {
      width: canvasPx,
      height: canvasPx,
      channels: 4,
      background: { r: 0, g: 0, b: 0, alpha: 0 },
    },
  })
    .composite([{ input: logo, gravity: 'center' }])
    .png()
    .toFile(outFile);
}

async function writeBackground(canvasPx, outFile) {
  await sharp({
    create: { width: canvasPx, height: canvasPx, channels: 3, background: BRAND_BLUE },
  })
    .png()
    .toFile(outFile);
}

async function writeLegacy(canvasPx, outFile) {
  const logoPx = Math.round(canvasPx * 0.88);
  const logo = await logoPng(logoPx);
  await sharp({
    create: { width: canvasPx, height: canvasPx, channels: 3, background: BRAND_BLUE },
  })
    .composite([{ input: logo, gravity: 'center' }])
    .png()
    .toFile(outFile);
}

async function writeMonochrome(canvasPx, outFile) {
  const logoPx = Math.round(canvasPx * 0.72);
  await sharp(LOGO)
    .resize(logoPx, logoPx, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .greyscale()
    .png()
    .toFile(outFile);
}

async function writeIosIcon(size, outFile) {
  const logoPx = Math.round(size * 0.92);
  const logo = await logoPng(logoPx);
  await sharp({
    create: { width: size, height: size, channels: 3, background: BRAND_BLUE },
  })
    .composite([{ input: logo, gravity: 'center' }])
    .png()
    .toFile(outFile);
}

async function main() {
  if (!fs.existsSync(LOGO)) {
    console.error('Missing logo:', LOGO);
    process.exit(1);
  }

  for (const [folder, px] of Object.entries(ADAPTIVE_PX)) {
    const dir = path.join(ANDROID_RES, folder);
    fs.mkdirSync(dir, { recursive: true });
    await writeForeground(px, path.join(dir, 'ic_launcher_foreground.png'));
    await writeBackground(px, path.join(dir, 'ic_launcher_background.png'));
    await writeMonochrome(px, path.join(dir, 'ic_launcher_monochrome.png'));
  }

  for (const [folder, px] of Object.entries(LEGACY_PX)) {
    const dir = path.join(ANDROID_RES, folder);
    fs.mkdirSync(dir, { recursive: true });
    await writeLegacy(px, path.join(dir, 'ic_launcher.png'));
  }

  fs.mkdirSync(IOS_ICON_DIR, { recursive: true });
  for (const { name, size } of IOS_ICONS) {
    await writeIosIcon(size, path.join(IOS_ICON_DIR, name));
  }

  const contents = {
    images: [
      { size: '20x20', idiom: 'iphone', filename: 'Icon-20@2x.png', scale: '2x' },
      { size: '20x20', idiom: 'iphone', filename: 'Icon-20@3x.png', scale: '3x' },
      { size: '29x29', idiom: 'iphone', filename: 'Icon-29@2x.png', scale: '2x' },
      { size: '29x29', idiom: 'iphone', filename: 'Icon-29@3x.png', scale: '3x' },
      { size: '40x40', idiom: 'iphone', filename: 'Icon-40@2x.png', scale: '2x' },
      { size: '40x40', idiom: 'iphone', filename: 'Icon-40@3x.png', scale: '3x' },
      { size: '60x60', idiom: 'iphone', filename: 'Icon-60@2x.png', scale: '2x' },
      { size: '60x60', idiom: 'iphone', filename: 'Icon-60@3x.png', scale: '3x' },
      { size: '1024x1024', idiom: 'ios-marketing', filename: 'Icon-1024.png', scale: '1x' },
    ],
    info: { version: 1, author: 'xcode' },
  };
  fs.writeFileSync(path.join(IOS_ICON_DIR, 'Contents.json'), `${JSON.stringify(contents, null, 2)}\n`);

  console.log('App icons generated from src/assets/logo.png');
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
