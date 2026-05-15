#!/usr/bin/env node
/**
 * Run all Phase A infra checks (INF-01 … INF-04).
 * Usage: node scripts/infra/phase-a.mjs [--skip-build] [--deep]
 */
import { spawnSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { loadEnvFile } from './load-env-smoke.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, '../..');
const skipBuild = process.argv.includes('--skip-build');
const deep = process.argv.includes('--deep');

loadEnvFile(path.join(root, '.env.smoke'));

function run(label, script, extraArgs = []) {
  console.log(`\n${'═'.repeat(60)}\n${label}\n${'═'.repeat(60)}\n`);
  const r = spawnSync(process.execPath, [path.join(__dirname, script), ...extraArgs], {
    cwd: root,
    stdio: 'inherit',
    env: process.env,
  });
  if (r.status !== 0) {
    console.error(`\nFailed: ${script}`);
    process.exit(r.status || 1);
  }
}

if (!skipBuild) {
  console.log('Building live bundle (npm run build)…\n');
  const b = spawnSync('npm', ['run', 'build'], { cwd: root, stdio: 'inherit', shell: true });
  if (b.status !== 0) process.exit(b.status || 1);
}

run('INF-01', 'verify-dev-stack.mjs');
run('INF-02', 'verify-live-build.mjs');
run('INF-03', 'verify-db-remote.mjs');
run('INF-04', 'smoke-deploy.mjs', deep ? ['--deep'] : []);

console.log('\n✅ Phase A infra scripts passed.\n');
