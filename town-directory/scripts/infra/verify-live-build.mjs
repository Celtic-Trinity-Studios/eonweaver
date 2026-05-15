#!/usr/bin/env node
/**
 * INF-02 — Verify production build output in live/ (run after npm run build).
 */
import fs from 'node:fs';
import path from 'node:path';
import { ROOT, pass, fail, info, exitCode } from './lib.mjs';

console.log('INF-02 — Production build (live/)\n');

const liveDir = path.join(ROOT, 'live');
let ok = true;

if (!fs.existsSync(liveDir)) {
  fail('live/ folder missing — run: npm run build');
  exitCode(false);
}

const indexPath = path.join(liveDir, 'index.html');
if (!fs.existsSync(indexPath)) {
  fail('live/index.html missing');
  ok = false;
} else {
  const html = fs.readFileSync(indexPath, 'utf8');
  if (html.includes('/dev/assets')) {
    fail('index.html references /dev/assets — wrong build (use npm run build, not build:dev)');
    ok = false;
  } else {
    pass('index.html has no /dev/assets paths');
  }
  if (/\/assets\/index-[^"']+\.js/.test(html)) {
    pass('index.html references hashed /assets/*.js bundle');
  } else {
    fail('index.html missing /assets/index-*.js script');
    ok = false;
  }
  if (/\/assets\/index-[^"']+\.css/.test(html)) {
    pass('index.html references hashed /assets/*.css');
  } else {
    fail('index.html missing /assets/index-*.css');
    ok = false;
  }
}

const htaccess = path.join(liveDir, '.htaccess');
if (fs.existsSync(htaccess)) pass('live/.htaccess present (postbuild copy)');
else {
  fail('live/.htaccess missing — run npm run build (postbuild copies .htaccess)');
  ok = false;
}

const assetsDir = path.join(liveDir, 'assets');
if (fs.existsSync(assetsDir)) {
  const files = fs.readdirSync(assetsDir);
  const js = files.filter((f) => /^index-.*\.js$/.test(f));
  const css = files.filter((f) => /^index-.*\.css$/.test(f));
  if (js.length) pass(`assets bundle: ${js[0]}`);
  else {
    fail('no index-*.js in live/assets');
    ok = false;
  }
  if (css.length) pass(`assets stylesheet: ${css[0]}`);
  else {
    fail('no index-*.css in live/assets');
    ok = false;
  }
} else {
  fail('live/assets/ missing');
  ok = false;
}

const devIndex = path.join(ROOT, 'dev', 'index.html');
if (fs.existsSync(devIndex)) {
  info('dev/index.html exists (staging subpath build) — do not FTP dev/ to worldscribe root');
}

exitCode(ok);
