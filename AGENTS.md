# Working on D&D Sundays / Eon Weaver (Cursor handoff)

This repo holds **Eon Weaver**, a Vite SPA plus PHP/MySQL backend. Use this file so work continues cleanly without Antigravity chat context.

## Hosts

- **Production:** **https://eonscribe.com** — live player-facing site. OpenRouter chat requests use **`APP_PUBLIC_URL` / `APP_PUBLIC_TITLE`** from `config.php` (see `config.example.php`) so attribution stays correct everywhere (including when you test from worldscribe).
- **Staging / planning:** **https://worldscribe.online/** — FTP via `deploy_worldscribe.ps1`, `base: '/'` in the live build.

1. `town-directory/deploy.env` — FTP credentials for whichever host you deploy to (`EW_FTP_*`). Swap or duplicate this file for worldscribe vs production FTP. This file stays **on disk only** (gitignored): when helping with deploys, **read credentials from there** — do **not** put passwords in commits, AGENTS.md, or chat replies. Running `deploy_worldscribe.ps1`/`deploy.cjs` loads `deploy.env` automatically.
2. From `town-directory/`: `npm run build` then `.\deploy_worldscribe.ps1`  
3. Optional Discord ping is included at the end of that script (non-critical if it fails).

One-time / rare DB setup: `setup_mysql.php?key=…` on the host you are initializing (staging vs production URLs differ — use your real domain).

**Phases** (intake vs Scribe vs DB vs UI): see `town-directory/PROJECT_PHASES.md`.

## Where the app lives

- **Frontend + tooling:** `town-directory/`
- **PHP API:** same folder (`api.php`, `simulate.php`, `auth.php`, etc.)
- **Server secrets:** copy `town-directory/config.example.php` → `config.php` (gitignored — never commit)

## Local development (does not touch production)

From `town-directory/`:

```bash
npm install
npm run dev
```

In another terminal, from `town-directory/`:

```bash
php -S localhost:8080
```

Vite dev server proxies API calls to port 8080 (`vite.config.js`, `base: '/dev/'`).

## Builds — critical (avoid breaking production)

| Command | Config | Output | `BASE_URL` | Use |
|--------|--------|--------|------------|-----|
| `npm run build` | `vite.config.live.js` | `town-directory/live/` | `/` | **FTP / production uploads** |
| `npm run build:dev` | `vite.config.js` | `town-directory/dev/` | `/dev/` | Subpath staging only |

FTP scripts expect **`live/index.html`** and **`live/assets/`** after **`npm run build`**.

Wrong build (dev) + production upload = broken asset URLs and routing.

## Deploy (FTP)

1. Ensure `deploy.env` exists — copy `town-directory/deploy.env.example` and fill in host/user/password (`deploy.env` is gitignored).
2. Run `npm run build` from `town-directory/` (creates `live/` and copies root `.htaccess` into `live/.htaccess` via `postbuild`).
3. Run `node deploy.cjs` (Eon Weaver FTP) or `.\deploy_worldscribe.ps1` (worldscribe FTP), from `town-directory/`. **Use the `EW_FTP_*` set for that host** — the two scripts share one `deploy.env` file, so swap credentials or keep two local copies and copy the right one to `deploy.env` before deploying.

Do not commit `deploy.env`, `config.php`, or `cookies.txt`-style artifacts.

## What Antigravity did not preserve

Anything only said in old IDE chat (one-off URLs, production DB names, beta keys, OpenRouter keys) must be re-entered into local `config.php` or `deploy.env`. The folder + this file are the source of truth for process; secrets stay local and gitignored.
