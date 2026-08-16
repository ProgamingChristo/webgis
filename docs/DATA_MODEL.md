# GETRA Data Model

## Rules

- Raw MAPID and partner records are private by default and are never queried directly by the browser.
- Community Activity, Menu Go, Struk Go, Properti Go, and field survey records remain separate source datasets.
- `merchants` is the canonical publishable business layer produced after cleaning, validation, and provenance checks.
- `accessibility_scores`, `retail_gap_scores`, and `analysis_runs` contain deterministic derived results.
- `ai_processing_runs` records provider, model, purpose, input references, prompt version, output, and validation state.
- Receipt media and evidence containing personal data remain reviewer-only or private.
- A secret Supabase key may only be used by guarded backend operations because it bypasses RLS.

## Main Tables

- `profiles`: authenticated GETRA user profile and application role.
- `data_sources`: source terms, scope, attribution, freshness, and redistribution rules.
- `transit_nodes`: stations and stops used as analysis origins.
- `pedestrian_nodes`: pedestrian routing graph nodes.
- `pedestrian_edges`: pedestrian routing graph edges and accessibility attributes.
- `merchants`: canonical publishable UMKM and service locations.
- `community_activities`: raw MAPID Community Maps Activity records.
- `mission_menu_records`: raw Menu Go records.
- `mission_receipt_records`: restricted Struk Go records.
- `mission_property_records`: raw Properti Go records.
- `survey_observations`: GETRA field validation and accessibility observations.
- `evidence_media`: controlled media references and privacy review state.
- `accessibility_scores`: versioned network accessibility results.
- `retail_gap_scores`: versioned area and category opportunity indicators.
- `analysis_runs`: deterministic GIS and analytical execution trace.
- `ai_processing_runs`: AI execution and output-validation trace.
- `moderation_events`: immutable moderation history.
- `dataset_ingestion_runs`: ingestion counts, duplicates, rejects, and errors.
- `feature_registry`: feature rollout state.

## Public Access

- Browser clients use the Supabase publishable key and remain subject to RLS.
- Only publishable, surveyed or verified merchants are directly readable by public clients.
- Restricted source records, raw missions, Community Activity, evidence media, moderation, ingestion, and AI traces are backend-only.
- Contributors can submit and read their own survey observations after authentication.
- Moderator and admin operations must pass GETRA server authorization before using the secret key.

## Migration Order

- Run `0001_getra_core.sql` first.
- Run `0002_competition_data.sql` second.
- Review Supabase Security Advisor after every policy or schema change.
- Do not load competition data until the source terms and access scope are recorded in `data_sources`.
