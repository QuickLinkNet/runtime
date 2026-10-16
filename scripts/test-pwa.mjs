import { access, readFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = dirname(dirname(fileURLToPath(import.meta.url)));
const dist = join(root, 'dist');

function assert(condition, message) {
  if (!condition) throw new Error(`PWA-Prüfung fehlgeschlagen: ${message}`);
}

function pngSize(buffer) {
  assert(buffer.toString('ascii', 1, 4) === 'PNG', 'Icon ist keine PNG-Datei.');
  return { width: buffer.readUInt32BE(16), height: buffer.readUInt32BE(20) };
}

const html = await readFile(join(dist, 'index.html'), 'utf8');
const manifest = JSON.parse(await readFile(join(dist, 'manifest.webmanifest'), 'utf8'));
const worker = await readFile(join(dist, 'sw.js'), 'utf8');

assert(html.includes('rel="manifest"'), 'Manifest-Link fehlt im HTML.');
assert(html.includes('apple-touch-icon'), 'Apple-Touch-Icon fehlt im HTML.');
assert(html.includes('property="og:image"'), 'OpenGraph-Vorschaubild fehlt im HTML.');
assert(html.includes('name="twitter:card" content="summary_large_image"'), 'Twitter/X-Kartentyp fehlt im HTML.');
assert(manifest.start_url === './' && manifest.scope === './', 'Start-URL oder Scope ist nicht deploymentneutral.');
assert(manifest.display === 'standalone', 'Standalone-Modus fehlt.');
assert(manifest.icons.some((icon) => icon.purpose === 'maskable'), 'Maskable Icon fehlt.');
assert(worker.includes("url.pathname.includes('/api/')"), 'API-Ausschluss fehlt im Service Worker.');
assert(worker.includes('SKIP_WAITING'), 'Kontrollierter Update-Pfad fehlt.');

for (const [name, expected] of [['runtime-icon-192.png', 192], ['runtime-icon-512.png', 512], ['runtime-icon-maskable-512.png', 512], ['apple-touch-icon.png', 180]]) {
  const icon = await readFile(join(dist, name));
  const size = pngSize(icon);
  assert(size.width === expected && size.height === expected, `${name} hat ${size.width}x${size.height} statt ${expected}x${expected}.`);
}

const socialPreview = await readFile(join(dist, 'social-preview.png'));
const socialPreviewSize = pngSize(socialPreview);
assert(socialPreviewSize.width === 1280 && socialPreviewSize.height === 640, `social-preview.png hat ${socialPreviewSize.width}x${socialPreviewSize.height} statt 1280x640.`);
assert(socialPreview.byteLength < 1024 * 1024, 'social-preview.png überschreitet GitHubs 1-MB-Grenze.');

await access(join(dist, 'offline.html'));
await access(join(dist, '.htaccess'));
console.log('PWA-Prüfung bestanden: Manifest, Metadaten, Icons, Offline-Shell und Service Worker sind vollständig.');
