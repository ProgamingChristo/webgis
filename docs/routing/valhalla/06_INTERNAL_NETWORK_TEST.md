# GETRA Valhalla Routing - Internal Network Test

Date: 2026-09-02 Asia/Jakarta

## Test

Executed from `getra-backend` container:

```text
fetch('http://valhalla:8002/status')
```

## Result

- HTTP status: `200`
- Result: PASS

## Meaning

This proves:

- `getra-backend` can resolve Docker DNS service name `valhalla`.
- `getra-backend` can reach Valhalla over the private Compose network.
- Backend container is not using `localhost:8002` for Valhalla.

