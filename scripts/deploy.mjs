import { cp, mkdir, readdir, rm } from 'node:fs/promises';
import { basename, dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = dirname(dirname(fileURLToPath(import.meta.url)));
const target = join(root, 'deploy');

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

console.log(`Upload-Paket erstellt: ${target}`);
