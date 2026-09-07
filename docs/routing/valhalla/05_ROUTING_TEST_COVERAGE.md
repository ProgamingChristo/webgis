# Routing Test Coverage

## Test Files Found

| File | Coverage type | Notes |
| --- | --- | --- |
| `backend/tests/unit/routing/valhalla-routing.provider.test.ts` | UNIT, mocked provider HTTP | Mode mapping, Valhalla request shape, normalization, no-route, outside graph, malformed JSON, timeout |
| `backend/tests/unit/routing/routing-provider-health.test.ts` | UNIT, mocked provider HTTP | Health READY/UNAVAILABLE, invalid config, no URL exposure |
| `backend/tests/integration/commuter-spatial-routes.test.ts` | INTEGRATION, mocked route dependency | API auth, safe response contract, no fabricated geometry, timeout response, provider-health response |
| `backend/tests/unit/docker-config.test.ts` | UNIT/static config | Dockerfile, Compose, port binds, pinned Valhalla image, no credential literals |
| `backend/tests/pedestrian-network/routing.service.test.ts` | UNIT/legacy pedestrian-network | Older pgRouting-style module coverage, not live Valhalla |
| `backend/tests/pedestrian-network/topology.service.test.ts` | UNIT/legacy pedestrian-network | Topology logic, not live Valhalla |

## Phase 0 Safe Local Commands Executed

| Command | Result |
| --- | --- |
| `npm run routing:validate` | PASS |
| `npm run docker:prod:config` | PASS |
| `npm run typecheck -w backend` | PASS |
| `npm run lint -w backend` | PASS |
| `npm run test -w backend -- tests/unit/routing tests/integration/commuter-spatial-routes.test.ts tests/unit/docker-config.test.ts` | PASS, 4 files / 24 tests |

## What These Tests Prove

- Request schema rejects invalid coordinates and unsupported modes.
- `walking`, `motorcycle`, and `car` map to distinct Valhalla costings.
- Provider failures do not produce fake route geometry.
- Timeout is classified as `ROUTING_TIMEOUT`.
- Provider-health response does not expose the provider URL.
- Compose config includes loopback host binds and `http://valhalla:8002`.

## What These Tests Do Not Prove

- Live Valhalla graph quality.
- Real pedestrian route success.
- Real motorcycle route success.
- Real auto route success.
- Cross-region routing coverage.
- VPS firewall exposure.
- HTTPS reverse proxy behavior.

Live Valhalla testing is explicitly not part of Phase 0.
