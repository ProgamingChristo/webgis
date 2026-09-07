# GETRA Valhalla Routing - GETRA API Evidence

Date: 2026-09-02 Asia/Jakarta

## Authenticated Test

- Login endpoint: `POST http://127.0.0.1:3002/api/auth/login`
- Fixture role: `USER`
- Access token: obtained in-process and not printed.

## Provider Health

- Endpoint: `GET /api/internal/routing/provider-health`
- HTTP status: `200`
- Provider: `valhalla`
- Status: `READY`
- Configured: `true`
- Reachable: `true`
- Reason code: `null`
- Response secret scan: no obvious secret/provider URL exposure found.

## Normalized Routing API

Coordinates:

- Origin: lat `-6.214120`, lon `106.682990`
- Destination: lat `-6.218000`, lon `106.687000`

| Mode | HTTP | Route status | Distance meters | Duration seconds | Geometry | Coordinates |
| --- | ---: | --- | ---: | ---: | --- | ---: |
| walking | 200 | ROUTABLE | 953 | 673 | LineString | 25 |
| motorcycle | 200 | ROUTABLE | 1035 | 150 | LineString | 29 |
| car | 200 | ROUTABLE | 8706 | 1045 | LineString | 385 |

## Failure Behavior

Out-of-graph walking request:

- HTTP status: `200`
- Route status: `SERVICE_UNAVAILABLE`
- Distance: `null`
- Duration: `null`
- Geometry: `null`
- Reason code: `ROUTING_UPSTREAM_ERROR`

This confirms no fabricated route geometry is returned. The reason-code classification can be improved later, but it does not create false route success.

