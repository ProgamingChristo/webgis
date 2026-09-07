# Phase 2 Readiness

Date: 2026-09-02
Scope: readiness for OSM data provenance and routing-data preparation.

## Decision

`PHASE_2_READINESS=BLOCKED`

Reason:

- Phase 1 source identity gate is not approved.
- VPS runtime prerequisites are not verified.
- Project directory and `.env.local` are not verified on the VPS.
- Firewall, DNS, reverse proxy, and TLS foundation are not verified.

## What Is Ready From Repository

Repository-side requirements are ready for Phase 2 after the deployment identity
gate is resolved:

- Docker Compose files exist.
- Valhalla overlay exists.
- Production Compose overlay exists.
- Routing data validator exists.
- Jabodetabek preparation script exists.
- Backend internal Valhalla URL is configured by Compose as `http://valhalla:8002`.
- Host bind defaults are loopback.

## What Must Be Provided Before Phase 2

- Approved deployment source SHA or reviewed package.
- Staging VPS hostname/access through the project-approved secure channel.
- Approved project directory, for example `/opt/getra`.
- Confirmation that `.env.local` exists on VPS without printing secrets.
- DNS hostname for staging API or explicit pending DNS status.
- Reverse proxy preference on the VPS, if one already exists.

## Phase 2 Boundary

Phase 2 may prepare OSM data provenance only after Phase 1 blockers are resolved.
Phase 2 must still not claim final live routing acceptance until later live route
tests prove geometry, distance, and duration from real Valhalla.
