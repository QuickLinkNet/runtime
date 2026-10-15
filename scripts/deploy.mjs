import { cp, mkdir, readFile, readdir, rm, writeFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { basename, dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { Client } from 'basic-ftp';

const root = dirname(dirname(fileURLToPath(import.meta.url)));
const target = join(root, 'deploy');
const localDeployEnv = join(root, '.env.deploy');
const apiEnv = join(root, 'api', '.env');

function fail(message) {
  throw new Error(`Deployment abgebrochen: ${message}`);
}

function parseEnv(content) {
  const values = {};
  for (const sourceLine of content.split(/\r?\n/)) {
    const line = sourceLine.trim();
    if (!line || line.startsWith('#') || !line.includes('=')) continue;
    const separator = line.indexOf('=');
    const key = line.slice(0, separator).trim();
    let value = line.slice(separator + 1).trim();
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1);
    }
    values[key] = value;
  }
  return values;
}

async function readEnv(path) {
  return parseEnv(await readFile(path, 'utf8'));
}

async function preparePackage() {
  if (!existsSync(join(root, 'dist', 'index.html'))) fail('dist/index.html fehlt.');
  if (!existsSync(apiEnv)) fail('api/.env mit den RUNTIME-Datenbankzugängen fehlt.');

  const databaseEnv = await readEnv(apiEnv);
  for (const key of ['DB_HOST', 'DB_NAME', 'DB_USER', 'DB_PASSWORD']) {
    if (!databaseEnv[key]) fail(`${key} fehlt in api/.env.`);
  }

  await rm(target, { recursive: true, force: true });
  await mkdir(target, { recursive: true });
  for (const entry of await readdir(join(root, 'dist'))) {
    await cp(join(root, 'dist', entry), join(target, entry), { recursive: true });
  }
  await cp(join(root, 'api'), join(target, 'api'), {
    recursive: true,
    filter: (source) => !['config.php', '.env'].includes(basename(source)),
  });
  await cp(join(root, 'shared'), join(target, 'shared'), { recursive: true });

  const productionEnv = (await readFile(apiEnv, 'utf8'))
    .replace(/^APP_ENV=.*$/m, 'APP_ENV=production');
  await writeFile(join(target, 'api', '.env'), productionEnv, { encoding: 'utf8', mode: 0o600 });
}

async function deploymentConfig() {
  if (!existsSync(localDeployEnv)) {
    fail('.env.deploy fehlt. Kopiere .env.deploy.example und trage die RUNTIME-Zielumgebung lokal ein.');
  }
  return { ...(await readEnv(localDeployEnv)), source: '.env.deploy' };
}

await preparePackage();
const config = await deploymentConfig();
for (const key of ['FTP_HOST', 'FTP_USER', 'FTP_PASSWORD', 'REMOTE_BASE_DIR', 'PUBLIC_APP_URL']) {
  if (!config[key]) fail(`${key} fehlt in .env.deploy.`);
}
const remoteBase = config.REMOTE_BASE_DIR;
const publicUrl = config.PUBLIC_APP_URL;
const expectedCatalogSize = JSON.parse(await readFile(join(root, 'shared', 'cards.json'), 'utf8')).length;

if (!remoteBase.endsWith('/runtime')) fail(`Unsicherer Zielpfad: ${remoteBase}`);
if (['', '/', '/html', '/html/apps'].includes(remoteBase)) fail(`Unsicherer Zielpfad: ${remoteBase}`);
const healthUrl = new URL(publicUrl);
if (healthUrl.protocol !== 'https:') fail('PUBLIC_APP_URL muss HTTPS verwenden.');

const secureSetting = config.FTP_SECURE ?? 'true';
if (!['true', 'false', 'implicit'].includes(secureSetting)) {
  fail('FTP_SECURE muss true, false oder implicit sein.');
}
const secure = secureSetting === 'implicit' ? 'implicit' : secureSetting === 'true';

const client = new Client();
client.ftp.verbose = process.env.DEPLOY_VERBOSE === 'true';

try {
  console.log(`Deployment-Konfiguration: ${config.source}`);
  console.log(`Ziel: ${remoteBase}`);
  await client.access({
    host: config.FTP_HOST,
    user: config.FTP_USER,
    password: config.FTP_PASSWORD,
    port: Number(config.FTP_PORT || 21),
    secure,
  });
  await client.ensureDir(remoteBase);

  // Nur generierte, gehashte Frontend-Assets werden entfernt. Daten und
  // andere Apps außerhalb des exakt geprüften Zielordners bleiben unberührt.
  try { await client.removeDir('assets'); } catch { /* first deployment */ }

  console.log('Lade Frontend, API und Kartenkatalog hoch …');
  await client.uploadFromDir(target);
  client.close();

  const healthResponse = await fetch(new URL('api/index.php?action=health', publicUrl), { cache: 'no-store' });
  const health = await healthResponse.json().catch(() => null);
  if (!healthResponse.ok || health?.success !== true) {
    fail(`API-Healthcheck fehlgeschlagen (${healthResponse.status}): ${JSON.stringify(health)}`);
  }
  const catalogResponse = await fetch(new URL('api/index.php?action=catalog', publicUrl), { cache: 'no-store' });
  const catalog = await catalogResponse.json().catch(() => null);
  const deployedCatalogSize = catalog?.data?.cards?.length;
  if (!catalogResponse.ok || catalog?.success !== true || deployedCatalogSize !== expectedCatalogSize) {
    fail(`Kartenkatalog-Check fehlgeschlagen (${catalogResponse.status}): erwartet ${expectedCatalogSize}, erhalten ${deployedCatalogSize ?? 'keine Daten'}.`);
  }
  const pageResponse = await fetch(publicUrl, { cache: 'no-store' });
  const page = await pageResponse.text();
  if (!pageResponse.ok || !page.includes('<title>RUNTIME</title>')) {
    fail(`Frontend-Check fehlgeschlagen (${pageResponse.status}).`);
  }
  const manifestResponse = await fetch(new URL('manifest.webmanifest', publicUrl), { cache: 'no-store' });
  const manifest = await manifestResponse.json().catch(() => null);
  if (!manifestResponse.ok || manifest?.name !== 'RUNTIME – Multiplayer Tech Card Game' || manifest?.icons?.length < 3) {
    fail(`PWA-Manifest-Check fehlgeschlagen (${manifestResponse.status}).`);
  }
  const workerResponse = await fetch(new URL('sw.js', publicUrl), { cache: 'no-store' });
  const worker = await workerResponse.text();
  if (!workerResponse.ok || !worker.includes('runtime-shell-') || !worker.includes("'/api/'")) {
    fail(`Service-Worker-Check fehlgeschlagen (${workerResponse.status}).`);
  }
  const iconResponse = await fetch(new URL('runtime-icon-192.png', publicUrl), { cache: 'no-store' });
  if (!iconResponse.ok || Number(iconResponse.headers.get('content-length') ?? 0) < 1000) {
    fail(`PWA-Icon-Check fehlgeschlagen (${iconResponse.status}).`);
  }

  console.log(`Deployment erfolgreich: ${publicUrl}`);
  console.log('API, automatische Datenbankmigration und PWA-Dateien sind erreichbar.');
} finally {
  client.close();
}
