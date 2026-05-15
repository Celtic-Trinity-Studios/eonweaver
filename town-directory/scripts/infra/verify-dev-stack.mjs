#!/usr/bin/env node
/**
 * INF-01 — Verify local dev stack configuration (no servers required).
 */
import { fileExists, pass, fail, info, readText, exitCode, ROOT } from './lib.mjs';

console.log('INF-01 — Local dev stack\n');

let ok = true;

if (!fileExists('package.json')) {
  fail('package.json missing');
  ok = false;
} else {
  const pkg = JSON.parse(readText('package.json'));
  for (const script of ['dev', 'build', 'build:dev']) {
    if (pkg.scripts?.[script]) pass(`npm script: ${script}`);
    else {
      fail(`npm script missing: ${script}`);
      ok = false;
    }
  }
}

if (!fileExists('vite.config.js')) {
  fail('vite.config.js missing');
  ok = false;
} else {
  const vite = readText('vite.config.js');
  if (vite.includes("base: '/dev/'")) pass("vite dev base is '/dev/'");
  else {
    fail("vite.config.js should set base: '/dev/'");
    ok = false;
  }
  for (const ep of ['api.php', 'simulate.php', 'auth.php']) {
    if (vite.includes(`'/${ep}'`) || vite.includes(`"/${ep}"`)) pass(`Vite proxy: ${ep}`);
    else {
      fail(`Vite proxy missing: ${ep}`);
      ok = false;
    }
  }
}

if (!fileExists('vite.config.live.js')) {
  fail('vite.config.live.js missing');
  ok = false;
} else if (readText('vite.config.live.js').includes("base: '/'")) {
  pass("live vite base is '/'");
} else {
  fail("vite.config.live.js should set base: '/'");
  ok = false;
}

if (fileExists('../AGENTS.md')) {
  pass('AGENTS.md documents npm run dev + php -S localhost:8080');
} else {
  info('AGENTS.md not found at repo root (optional)');
}

info(`Run locally: cd ${ROOT} && npm run dev  (and php -S localhost:8080 in another terminal)`);
exitCode(ok);
