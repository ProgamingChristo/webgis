# GETRA Valhalla Routing - Limitations

Date: 2026-09-02 Asia/Jakarta

## Verified Limitations

- This run was executed on Windows Docker Desktop, not the final Linux VPS.
- Host `osmium` was not installed; extraction used temporary Dockerized `osmium`.
- HTTPS reverse proxy was not configured or verified here.
- External public port scan was not performed from outside the machine.
- `APP_BASE_URL` used a local HTTPS placeholder for production env validation.
- Out-of-graph backend request returned `SERVICE_UNAVAILABLE` with `ROUTING_UPSTREAM_ERROR`; no fake geometry was returned, but reason-code specificity can be improved.
- Valhalla `file_hashes.txt` contained a hash that did not match the active PBF hash. PowerShell and in-container `sha256sum` agreed on the active PBF SHA-256 recorded in `03_OSM_DATA_PROVENANCE.md`.

## Not Changed

- No remote Supabase migration was applied.
- No frontend redesign was performed.
- No AI routing or straight-line fallback was introduced.
- No database model was changed for this routing infrastructure closure.

