// Ledly · recursos de Android: icono de la app (normal, redondo y adaptativo), icono de las
// notificaciones (pequeño en silueta y grande a color) y pantalla de arranque.
// Se ejecuta en CI después de `npx cap add android`, que crea android/ desde cero en cada compilación.
// Uso: node tools/android-res.mjs   (necesita sharp, que está en devDependencies)
import sharp from 'sharp';
import fs from 'fs';
import path from 'path';
import * as ICON from '../resources/icon.mjs';

const RES = 'android/app/src/main/res';
if (!fs.existsSync(RES)) { console.error('No existe ' + RES + ': ejecuta antes `npx cap add android`.'); process.exit(1); }
const DENS = { mdpi: 1, hdpi: 1.5, xhdpi: 2, xxhdpi: 3, xxxhdpi: 4 };
const mkdir = d => fs.mkdirSync(d, { recursive: true });
// Rasteriza un SVG a un PNG de w×h (recortando al centro si las proporciones no coinciden)
async function png(svg, w, h, out, mask) {
  const dens = Math.max(72, Math.ceil(72 * Math.max(w, h) / 1000) + 10);
  let img = sharp(Buffer.from(svg), { density: dens }).resize(w, h, { fit: 'cover' });
  if (mask) {
    const m = mask === 'round' ? `<circle cx="${w / 2}" cy="${h / 2}" r="${w / 2}"/>` : `<rect width="${w}" height="${h}" rx="${w * 0.22}"/>`;
    img = sharp(await img.png().toBuffer()).composite([{ input: Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}">${m}</svg>`), blend: 'dest-in' }]);
  }
  mkdir(path.dirname(out)); await img.png().toFile(out);
}

// 1. Icono de la app
for (const [d, f] of Object.entries(DENS)) {
  const dir = `${RES}/mipmap-${d}`;
  await png(ICON.full, Math.round(48 * f), Math.round(48 * f), `${dir}/ic_launcher.png`, 'square');
  await png(ICON.full, Math.round(48 * f), Math.round(48 * f), `${dir}/ic_launcher_round.png`, 'round');
  await png(ICON.foreground, Math.round(108 * f), Math.round(108 * f), `${dir}/ic_launcher_foreground.png`);
  await png(ICON.background, Math.round(108 * f), Math.round(108 * f), `${dir}/ic_launcher_background.png`);
}
const adaptive = `<?xml version="1.0" encoding="utf-8"?>
<adaptive-icon xmlns:android="http://schemas.android.com/apk/res/android">
    <background android:drawable="@mipmap/ic_launcher_background"/>
    <foreground android:drawable="@mipmap/ic_launcher_foreground"/>
</adaptive-icon>
`;
mkdir(`${RES}/mipmap-anydpi-v26`);
fs.writeFileSync(`${RES}/mipmap-anydpi-v26/ic_launcher.xml`, adaptive);
fs.writeFileSync(`${RES}/mipmap-anydpi-v26/ic_launcher_round.xml`, adaptive);
// Si la plantilla traía otro primer plano vectorial con el mismo nombre, se quita para que no choque
for (const f of ['drawable/ic_launcher_foreground.xml', 'drawable-v24/ic_launcher_foreground.xml', 'drawable/ic_launcher_background.xml']) { try { fs.unlinkSync(`${RES}/${f}`); } catch (e) { } }

// 2. Notificaciones: pequeño (vector en silueta) y grande (Chispa a color)
mkdir(`${RES}/drawable`);
fs.copyFileSync('resources/android/drawable/ic_stat_voltio.xml', `${RES}/drawable/ic_stat_voltio.xml`);
await png(ICON.notifLarge, 256, 256, `${RES}/drawable-nodpi/ic_notif_large.png`);

// 3. Pantalla de arranque: se sustituyen todas las splash.png de la plantilla, con su tamaño
const walk = d => fs.readdirSync(d, { withFileTypes: true }).flatMap(e => e.isDirectory() ? walk(path.join(d, e.name)) : [path.join(d, e.name)]);
for (const f of walk(RES).filter(f => path.basename(f) === 'splash.png')) {
  const { width, height } = await sharp(f).metadata();
  await png(ICON.splash, width, height, f + '.tmp.png'); fs.renameSync(f + '.tmp.png', f);
}

// 4. Permisos de notificaciones en el manifiesto (Android 13+ pide POST_NOTIFICATIONS)
const MAN = 'android/app/src/main/AndroidManifest.xml';
let man = fs.readFileSync(MAN, 'utf8');
for (const p of ['android.permission.POST_NOTIFICATIONS', 'android.permission.RECEIVE_BOOT_COMPLETED']) {
  if (!man.includes(p)) man = man.replace('</manifest>', `    <uses-permission android:name="${p}" />\n</manifest>`);
}
fs.writeFileSync(MAN, man);
console.log('Recursos de Android listos.');
