# GETRA Integration Baseline
**Version 1.0**

This document marks the official boundary between the GETRA Integration Track (Phases 1–13) and subsequent New Feature Development.

## Baseline Freeze
- **Date**: 2026-08-23
- **Branch**: `finalmerge`
- **Integration Phase 1–13 Status**: PASS / Complete (with documented limitations)

## Purpose of this Baseline
Any future engineering or product feature work should explicitly reference this baseline:
> "Feature X was built on top of the GETRA Integration Baseline (v1.0)"

This baseline guarantees that the fundamental architecture—Frontend, Backend API boundaries, PostGIS routing, and RLS security—is stable, tested, and firmly established. Future development should strictly avoid unilaterally rewriting these foundational layers unless absolutely required by a strategic migration.

## Future Development Engineering Rules
When building new features atop this baseline, the following permanent principles apply:

1. **Migration-First**: All database schema changes must be driven by Supabase migrations and tested via `dry-run` against linked branches before deployment.
2. **Security-First**: Every new feature must be tested for RLS bypasses and unauthorized access.
3. **Source-of-Truth Hierarchy**: The database remains the ultimate source of truth. Raw data is staged, validated, and normalized before it ever touches the canonical presentation layer.
4. **GIS Computes, AI Interprets**: All spatial mathematics, routing calculations, proximity lookups, and bounding boxes are exclusively computed by the PostGIS/pgRouting database engine. The AI interpretation layer acts only as an explainer of the retrieved factual geometries, not a generator.
5. **Role Semantics**: Authorization uses the strict `USER` or `ADMIN` `account_role`. Legacy roles (`COMMUTER`, `COMMUNITY`, `UMKM_OWNER`) remain abolished.
6. **General Baseline Experience**: All GETRA users implicitly have access to the General/Komuter baseline features (Maps, Routing, Transport, Survey logic). 
7. **Stakeholder Modes**: UMKM, INVESTOR, and GOVERNMENT are optional UI stakeholder modes, not distinct permission levels. A user actively assuming the `UMKM` stakeholder mode does not automatically grant them ownership over a merchant entity. Ownership requires a strict entity claim relation.

## Known Limitations & Technical Debt
### Blocking Issues
*None detected during Phase 12 Regression sweeps.*

### Non-Blocking Issues & Future Features
- **Email Confirmation**: Temporarily disabled. Must be reviewed before public production launch.
- **Accessibility Routing**: The current pedestrian routing graph does not factor in wheelchairs, steep gradients, or blockages.
- **AI Dependency**: The AI system requires an external API provider.
- **Deployment Strategy**: The deployment configuration is drafted but full cloud topology depends on operational provisioning.
