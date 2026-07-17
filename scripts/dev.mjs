import { spawn } from 'node:child_process';
import { rmSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, '..');

rmSync(path.join(rootDir, '.next'), { recursive: true, force: true });

const env = {
  ...process.env,
  NEXT_DISABLE_TURBOPACK: '1',
};

const nextBin = path.join(rootDir, 'node_modules', 'next', 'dist', 'bin', 'next');
const args = ['dev', '-p', '3000'];

const child = spawn(process.execPath, [nextBin, ...args], {
  cwd: rootDir,
  env,
  stdio: 'inherit',
  shell: false,
});

child.on('exit', (code, signal) => {
  if (signal) {
    process.kill(process.pid, signal);
  } else {
    process.exit(code ?? 0);
  }
});
