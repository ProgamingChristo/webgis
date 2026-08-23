# GETRA Troubleshooting Runbook

This guide covers common operational, deployment, and runtime issues.

## Port Conflicts
**Symptom**: `EADDRINUSE` for port `3000` (Frontend) or `8080` (Backend).
**Solution**:
1. Identify the blocking process PID using standard OS tools (e.g. `netstat -ano | findstr :3000` on Windows or `lsof -i :3000` on Unix).
2. Verify if the process is a stale GETRA development process.
3. Terminate it gracefully before attempting to forcefully kill it.

## Network & CORS Issues
**Symptom**: Frontend console reports `CORS policy` blockage or `Failed to fetch`.
**Solution**:
1. Check the `FRONTEND_ALLOWED_ORIGINS` array in the backend `.env.local`.
2. Ensure the frontend origin exactly matches the allowed whitelist, without trailing slashes.
3. Verify the backend is running and the port is reachable (`curl http://localhost:8080/api/health`).

## Spatial & Routing Issues
**Symptom**: `/api/routing` returns `503 SPATIAL_NETWORK_NOT_READY` or `404 NO_ROUTE`.
**Solution**:
1. `503` implies the pedestrian geometry or vertices graph is completely empty or unavailable in PostGIS.
2. `404` implies the requested origin or destination is too far from the existing walk network to snap successfully. Check `pedestrian_network_ways`.

**Symptom**: `/api/spatial/distance` or nearest lookups fail with `SPATIAL_INVALID_COORDINATE`.
**Solution**: Ensure JSON requests supply valid numeric floats between `[-180, 180]` for Longitude and `[-90, 90]` for Latitude.

## Authentication & Sessions
**Symptom**: `401 Unauthorized` or unexpected redirect loops during Onboarding.
**Solution**:
1. Verify the access token is present in the `Authorization: Bearer <token>` header.
2. Confirm the user's UUID correctly maps to a record in `profiles`.
3. If email verification is re-enabled but the user hasn't verified, Supabase will refuse to issue valid user context.

## External Provider Issues
**Symptom**: `/api/ai/ask` fails or returns fallback errors.
**Solution**: Check `AI_API_KEY` configuration. If AI goes down, note that the core GETRA maps, UMKM data, and routing will still function perfectly.

**Symptom**: Ingestion jobs fail to pull from MAPID.
**Solution**: Verify the official MAPID endpoint contract. If the MAPID credentials (`MAPID_SECRET_KEY`) are missing, the ingest adapter safely blocks ingestion with a clear error.
