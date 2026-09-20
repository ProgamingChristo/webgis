import { readFileSync, existsSync } from 'node:fs';
import { parseEnv } from 'node:util';
import { spawn } from 'node:child_process';
import path from 'node:path';
const root = path.resolve(import.meta.dirname, '..');
const app = process.argv[2];
if (!['frontend', 'backend'].includes(app)) throw new Error('Choose frontend or backend');
const env = { ...process.env };
for (const file of ['.env.local', `${app}/.env.local`]) if (existsSync(path.join(root, file))) Object.assign(env, parseEnv(readFileSync(path.join(root, file), 'utf8')));
Object.assign(env, { NODE_OPTIONS: '--no-experimental-strip-types', APP_ENV: 'development', GETRA_BACKEND_INTERNAL_URL: 'http://127.0.0.1:8180', FRONTEND_ALLOWED_ORIGINS: 'http://localhost:3100,http://127.0.0.1:3100', NEXT_TELEMETRY_DISABLED: '1' });
if (app === 'backend') env.ROUTING_BASE_URL = 'http://127.0.0.1:18002';
// Load testing only in this isolated development launcher, never production compose.
if (process.env.GETRA_QA_AI_BENCHMARK === '1') env.RATE_LIMIT_AI_MAX_REQUESTS = '500';
const port = app === 'frontend' ? '3100' : '8180';
const child = spawn(process.execPath, [path.join(root, 'node_modules/next/dist/bin/next'), 'dev', '--webpack', '-p', port], { cwd: path.join(root, app), env, stdio: 'inherit', windowsHide: true });
child.on('exit', code => { process.exitCode = code ?? 1; });
for (const signal of ['SIGINT', 'SIGTERM']) process.on(signal, () => child.kill(signal));
