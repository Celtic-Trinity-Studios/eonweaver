# Working on D&D Sundays / Eon Weaver (Cursor handoff)

This repo holds **Eon Weaver**, a Vite SPA plus PHP/MySQL backend. Use this file so work continues cleanly without Antigravity chat context.

## Hosts

- **Production:** **https://eonscribe.com** — live player-facing site. OpenRouter chat requests use **`APP_PUBLIC_URL` / `APP_PUBLIC_TITLE`** from `config.php` (see `config.example.php`) so attribution stays correct everywhere (including when you test from worldscribe).
- **Staging / planning:** **https://worldscribe.online/** — FTP via `deploy_worldscribe.ps1`, `base: '/'` in the live build.

1. **FTP env files** (all gitignored, disk only — never paste passwords into commits or chat):  
   - **`deploy.env.worldscribe`** — staging (`worldscribe.online`). Used by `deploy_worldscribe.ps1` and `node deploy.cjs worldscribe`.  
   - **`deploy.env.eonweaver`** — production (`eonweaver.com`). Used by `node deploy.cjs eonweaver` and `deploy_live.ps1`.  
   - **`deploy.env`** — optional legacy default for `node deploy.cjs` with no args.  
   See `town-directory/deploy.env.example` for the full matrix.
2. From `town-directory/`: `npm run build` then `.\deploy_worldscribe.ps1` (worldscribe) or `node deploy.cjs eonweaver` (production), using the matching env file above.  
3. Optional **Discord deploy ping** runs **locally** after FTP (`node discord_deploy_notify.mjs` using `town-directory/.env.discord` — see `.env.discord.example`; no PHP on the server is involved).

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

**Agents:** Always ask the maintainer **which target to deploy** (worldscribe staging vs eonweaver production, or another named env) before running deploy scripts or suggesting a specific `deploy.env.*`—unless they already said it in the same conversation (e.g. “FTP to worldscribe” or “ship to production”).

**Deploy + git:** A website deploy should be paired with **committing and pushing** the same source changes to the repo so what went live matches `main` (or the branch you use)—still excluding secrets and anything gitignored below. When helping with deploy, do not treat FTP as “done” without that step unless the maintainer explicitly skips it.

1. Create **`deploy.env.worldscribe`** and **`deploy.env.eonweaver`** from `town-directory/deploy.env.example` (each with the correct `EW_FTP_*` for that host).
2. Run `npm run build` from `town-directory/` (creates `live/` and copies root `.htaccess` into `live/.htaccess` via `postbuild`).
3. Deploy with the command that matches the target: `.\deploy_worldscribe.ps1` or `node deploy.cjs worldscribe` for worldscribe; `node deploy.cjs eonweaver` or `.\deploy_live.ps1` for eonweaver production.

Do not commit `deploy.env`, `deploy.env.worldscribe`, `deploy.env.eonweaver`, `config.php`, or `cookies.txt`-style artifacts.

## What Antigravity did not preserve

Anything only said in old IDE chat (one-off URLs, production DB names, beta keys, OpenRouter keys) must be re-entered into local `config.php` or the appropriate `deploy.env.*` file. The folder + this file are the source of truth for process; secrets stay local and gitignored.
