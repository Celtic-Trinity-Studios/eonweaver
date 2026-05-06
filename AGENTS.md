# Working on D&D Sundays / Eon Weaver (Cursor handoff)

This repo holds **Eon Weaver**, a Vite SPA plus PHP/MySQL backend. Use this file so work continues cleanly without Antigravity chat context.

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
