import { expect, it } from 'vitest';
import { spawn } from 'node:child_process';
import { mkdtemp, rm } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import os from 'node:os';

it('built entrypoint serves compiled browser modules and a working synthetic API', async () => {
  const storeDir = await mkdtemp(path.join(os.tmpdir(), 'lilith-built-entrypoint-'));
  const appRoot = fileURLToPath(new URL('../../', import.meta.url));
  const child = spawn(process.execPath, [path.join(appRoot, 'dist/server/main.js')], {
    cwd: appRoot,
    env: { ...process.env, PROTOTYPE_PORT: '0', PROTOTYPE_STORE_DIR: storeDir },
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  const exited = new Promise<void>((resolve) => { child.once('exit', () => resolve()); });
  let output = '';
  try {
    const origin = await new Promise<string>((resolve, reject) => {
      const timeout = setTimeout(() => { reject(new Error('BUILT_SERVER_START_TIMEOUT')); }, 5000);
      child.once('error', (error) => { clearTimeout(timeout); reject(error); });
      child.once('exit', (code) => { clearTimeout(timeout); reject(new Error(`BUILT_SERVER_EXIT_${code}`)); });
      child.stdout.on('data', (chunk: Buffer) => {
        output += chunk.toString();
        const match = output.match(/http:\/\/127\.0\.0\.1:\d+/);
        if (match) { clearTimeout(timeout); resolve(match[0]); }
      });
      child.stderr.on('data', (chunk: Buffer) => { output += chunk.toString(); });
    });
    const page = await fetch(`${origin}/welcome`); expect(page.status).toBe(200); expect(await page.text()).toContain('/client/main.js');
    const module = await fetch(`${origin}/client/main.js`); expect(module.status).toBe(200); expect(module.headers.get('content-type')).toContain('text/javascript'); expect(await module.text()).not.toContain('<!doctype html>');
    const shared = await fetch(`${origin}/shared/contracts.js`); expect(shared.status).toBe(200);
    const privateFile = await fetch(`${origin}/server/auth.js`); expect(privateFile.status).toBe(404);
    const bootstrap = await fetch(`${origin}/api/prototype/bootstrap`); const value = await bootstrap.json() as { data: { csrf_token: string; request_ids: string[] }; mock_data: boolean; prototype_only: boolean };
    expect(value.mock_data).toBe(true); expect(value.prototype_only).toBe(true); expect(value.data.csrf_token).toBeTruthy(); expect(value.data.request_ids).toEqual([]);
    expect(output).not.toContain(value.data.csrf_token);
  } finally {
    child.kill('SIGTERM'); await exited; await rm(storeDir, { recursive: true, force: true });
  }
}, 10000);
