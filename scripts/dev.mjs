import { spawn } from 'node:child_process';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = dirname(dirname(fileURLToPath(import.meta.url)));
const vite = join(root, 'node_modules', 'vite', 'bin', 'vite.js');
const apiRouter = join(root, 'scripts', 'api-router.php');
const children = [
  spawn('php', ['-S', '127.0.0.1:8080', '-t', join(root, 'api'), apiRouter], { cwd: root, stdio: 'inherit' }),
  spawn(process.execPath, [vite], { cwd: root, stdio: 'inherit' }),
];

let stopping = false;

function stop(exitCode = 0) {
  if (stopping) return;
  stopping = true;
  for (const child of children) {
    if (!child.killed) child.kill();
  }
  process.exitCode = exitCode;
}

for (const child of children) {
  child.on('error', (error) => {
    console.error(`Lokaler Server konnte nicht gestartet werden: ${error.message}`);
    stop(1);
  });
  child.on('exit', (code) => {
    if (!stopping && code !== 0) {
      console.error('Ein Entwicklungsserver wurde beendet. Prüfe, ob Port 5173 oder 8080 bereits belegt ist.');
      stop(code ?? 1);
    }
  });
}

process.on('SIGINT', () => stop());
process.on('SIGTERM', () => stop());
