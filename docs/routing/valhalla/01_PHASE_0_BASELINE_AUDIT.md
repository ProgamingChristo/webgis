# GETRA Phase 0 Routing System Baseline Audit

Date: 2026-09-02
Status target: AUDIT ONLY

## Repository Identity

- Current branch: `finalmerge`
- Current commit SHA: `2cf252e8bfcedbff42a40de07d6227e34ca63499`
- Recent HEAD: `2cf252e update`
- Worktree: DIRTY

Relevant dirty paths at audit start:

- `.dockerignore`
- `.gitignore`
- `backend/src/modules/ai/ai.schema.ts`
- `backend/src/modules/ai/ai.service.ts`
- `backend/tests/unit/ai/ai.service.test.ts`
- `frontend/app/settings/profile/page.tsx`
- `frontend/components/getra-map.tsx`
- `frontend/src/components/providers/StakeholderProvider.tsx`
- `frontend/src/components/stakeholder/stakeholder-mode-switcher.tsx`
- `docs/routing/` untracked

## Package Scripts

Root `package.json` contains:

| Script | Status | Actual command |
| --- | --- | --- |
| `routing:validate` | EXISTS | `node scripts/validate-routing-data.mjs` |
| `routing:prepare` | EXISTS | `powershell -NoProfile -ExecutionPolicy Bypass -File scripts/prepare-jabodetabek-routing.ps1` |
| `docker:prod:config` | EXISTS | `npm run routing:validate && docker compose --env-file .env.local -f docker-compose.yml -f docker-compose.routing.yml -f docker-compose.prod.yml config --quiet` |
| `docker:prod:start` | EXISTS | `npm run routing:validate && docker compose --env-file .env.local -f docker-compose.yml -f docker-compose.routing.yml -f docker-compose.prod.yml up -d --build --wait --wait-timeout 2400` |
| `docker:prod:status` | EXISTS | `docker compose --env-file .env.local -f docker-compose.yml -f docker-compose.routing.yml -f docker-compose.prod.yml ps` |
| `docker:prod:stop` | EXISTS | `docker compose --env-file .env.local -f docker-compose.yml -f docker-compose.routing.yml -f docker-compose.prod.yml down` |
| backend `typecheck` | EXISTS | `tsc --noEmit` |
| backend `lint` | EXISTS | `eslint . --max-warnings=0` |
| backend `test` | EXISTS | `vitest run` |
| backend `build` | EXISTS | `next build` |

## Current Routing Data State

Observed without downloading or rebuilding during Phase 0:

| Path | State | Size |
| --- | --- | --- |
| `routing-data/` | EXISTS | directory |
| `routing-data/jabodetabek.osm.pbf` | EXISTS | 178,468,668 bytes |
| `routing-data/jabodetabek_tiles/` | EXISTS | directory |
| `routing-data/jabodetabek_tiles.tar` | EXISTS | 249,180,160 bytes |
| `routing-data/valhalla.json` | EXISTS | 9,590 bytes |
| `routing-data/admins.sqlite` | EXISTS | 7,946,240 bytes |
| `routing-data/timezones.sqlite` | EXISTS | 121,565,184 bytes |
| `routing-data/java-latest.osm.pbf` | MISSING | n/a |

`routing:validate` was executed because it is a safe local validation and does
not download or build graph data. Result: PASS.

## Current Container State

Observed only; no container was started by Phase 0:

| Service | State | Ports |
| --- | --- | --- |
| `getra-backend` | Up, healthy | `127.0.0.1:3002->3000/tcp` |
| `valhalla` | Up, healthy | `127.0.0.1:8002->8002/tcp` |

This is local state from prior work. Live Valhalla route acceptance is not part
of Phase 0.

## Phase 0 Result

Phase 0 repository baseline is VERIFIED for code/config audit. Deployment and
live route acceptance remain outside this phase.
