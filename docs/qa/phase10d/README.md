# Full Product QA Runtime

This reuses the accepted Docker/standalone architecture on the owner-hosted
Ubuntu machine. It is SHARED_STAGING, not production or 24/7 hosting.

Build only the committed candidate. The backend joins existing `getra_default`
for private `valhalla:8002` access; the frontend never joins the provider network.
No graph/PBF is copied or rebuilt. Images are revision-labeled and pinned to the
previously accepted Node base image. Dependencies come from `npm ci`.

Runtime files in `/home/getra/phase10d-qa` are not source artifacts:

- `release.env`: exact `GETRA_RELEASE_SHA`, backend/frontend loopback host ports.
- `backend.runtime.env`: existing approved backend configuration, mode 600.
- `frontend.public.env`: allowlisted public frontend build configuration, mode 600.

Validate quietly, build backend and frontend sequentially to limit VM pressure,
then start on private candidate ports 3012/3013 before handover:

```bash
docker compose --env-file /home/getra/phase10d-qa/release.env \
  -p getra-full-product-10d -f docs/qa/phase10d/compose.yml config --quiet
docker compose --env-file /home/getra/phase10d-qa/release.env \
  -p getra-full-product-10d -f docs/qa/phase10d/compose.yml build getra-backend-full
docker compose --env-file /home/getra/phase10d-qa/release.env \
  -p getra-full-product-10d -f docs/qa/phase10d/compose.yml build getra-frontend-full
docker compose --env-file /home/getra/phase10d-qa/release.env \
  -p getra-full-product-10d -f docs/qa/phase10d/compose.yml up -d --no-build --wait
```

After candidate health succeeds, stop only the prior backend/frontend containers,
set candidate host ports to 3002/3003 and recreate the two candidate containers.
The existing Funnel mappings remain 443 -> 3002 and 8443 -> 3003. Keep previous
containers/images/configuration for rollback. Do not touch Valhalla or reset
Funnel. If handover fails, stop the candidate services and start the previous two
containers on their original ports.

The frontend URL remains `https://getra-routing-api.tail0ed517.ts.net:8443/login`.
Preserve exact-origin CORS, ordinary USER authentication and the approved routing
timeout/cache settings. Keep the previous Phase 11 evidence as historical
acceptance of its own SHA; new full-product browser acceptance must be separate.

F09: `QA_DATA_POLICY_OWNER_DECISION_REQUIRED`. No list filtering or deletion is
introduced based on guessed name/title patterns. The proposed policy is explicit
record provenance or a separately approved demo dataset, with no concealment of
legitimate records. This policy decision remains external to this release.

F02: `AI_REMEDIATION=BLOCKED_BY_APPROVED_PROVIDER_CREDENTIAL` until a supported,
approved provider credential is supplied through secret management. No provider
switch or deterministic placeholder is substituted for a live AI answer.
