import sharp from 'sharp';
import { readFile, writeFile, readdir } from 'node:fs/promises';
import path from 'node:path';
const svg = await readFile('public/icon.svg', 'utf8');
for (const [density, scale] of [['mdpi', 1], ['hdpi', 1.5], ['xhdpi', 2], ['xxhdpi', 3], ['xxxhdpi', 4]]) {
  const root = `android/app/src/main/res/mipmap-${density}`;
  for (const name of ['ic_launcher.png', 'ic_launcher_round.png']) await sharp(Buffer.from(svg)).resize(48 * scale, 48 * scale).png().toFile(path.join(root, name));
  const foreground = svg.replace('viewBox="0 0 128 128"', 'viewBox="-40 -40 208 208"').replace(/<rect[^>]+\/>/, '');
  await sharp(Buffer.from(foreground)).resize(108 * scale, 108 * scale).png().toFile(path.join(root, 'ic_launcher_foreground.png'));
}
await writeFile('android/app/src/main/res/values/ic_launcher_background.xml', '<?xml version="1.0" encoding="utf-8"?>\n<resources><color name="ic_launcher_background">#183c36</color></resources>\n');
await sharp(Buffer.from(svg.replace('rx="32"', 'rx="0"'))).resize(1024, 1024).png().toFile('ios/App/App/Assets.xcassets/AppIcon.appiconset/AppIcon-512@2x.png');
async function walk(dir) { const items = await readdir(dir, { withFileTypes: true }); return (await Promise.all(items.map(x => x.isDirectory() ? walk(path.join(dir,x.name)) : [path.join(dir,x.name)]))).flat(); }
const splashFiles = [...await walk('android/app/src/main/res'), ...await walk('ios/App/App/Assets.xcassets/Splash.imageset')].filter(p => /splash.*\.png$/.test(p));
for (const file of splashFiles) {
  const { width, height } = await sharp(file).metadata(); const size = Math.round(Math.min(width, height) * .16);
  const icon = await sharp(Buffer.from(svg)).resize(size,size).png().toBuffer();
  await sharp({ create: { width, height, channels: 4, background: '#f7f8fa' } }).composite([{ input: icon, gravity: 'centre' }]).png().toBuffer().then(buffer => writeFile(file,buffer));
}
console.log('Sajag native launcher icons and splash assets generated.');
