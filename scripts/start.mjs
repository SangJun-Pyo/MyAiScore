import { cp, access } from 'node:fs/promises';
import { spawn } from 'node:child_process';
import { resolve } from 'node:path';
const root = resolve('.next/standalone');
try { await access(resolve(root, 'server.js')); }
catch { console.error('Run npm run build before npm start.'); process.exit(1); }
await cp('.next/static', resolve(root, '.next/static'), { recursive: true });
await cp('public', resolve(root, 'public'), { recursive: true });
const args = process.argv.slice(2);
function option(name, fallback) { const i = args.indexOf(name); return i >= 0 ? args[i + 1] ?? fallback : fallback; }
const server = spawn(process.execPath, [resolve(root, 'server.js')], { stdio: 'inherit', env: { ...process.env,
  PORT: option('--port', process.env.PORT || '3000'), HOSTNAME: option('--hostname', process.env.HOSTNAME || '127.0.0.1'),
  // Standalone changes cwd; retain an explicit application data location.
  MYAISCORE_DATA_DIR: resolve(process.env.MYAISCORE_DATA_DIR || '.data'),
} });
for (const signal of ['SIGINT', 'SIGTERM']) process.on(signal, () => server.kill(signal));
server.on('error', () => { console.error('Unable to start MyAiScore.'); process.exit(1); });
server.on('exit', code => process.exit(code ?? 1));
