'use strict';
// Penjaga: jalankan Next.js lokal dan biarkan proses hidup mandiri.
const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');

const root = path.join(__dirname, '..');
const port = process.env.PORT || '3055';
const nextBin = path.join(root, 'node_modules', 'next', 'dist', 'bin', 'next');
const outLog = path.join(root, `.next-dev-${port}.log`);
const errLog = path.join(root, `.next-dev-${port}.err.log`);

const out = fs.openSync(outLog, 'a');
const err = fs.openSync(errLog, 'a');

const child = spawn(
  process.execPath,
  [nextBin, 'dev', '-p', String(port), '-H', '127.0.0.1'],
  {
    cwd: root,
    detached: true,
    stdio: ['ignore', out, err],
    env: { ...process.env, FORCE_COLOR: '0' },
  },
);

child.unref();
fs.writeFileSync(path.join(root, `.next-dev-${port}.pid`), String(child.pid));
console.log(`STARTED pid=${child.pid} url=http://127.0.0.1:${port}/admin`);
