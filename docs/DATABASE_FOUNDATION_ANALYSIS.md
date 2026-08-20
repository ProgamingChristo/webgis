# GETRA Step 2 — Database Foundation Analysis

## 1. Objective

Build the database skeleton before field survey and competition data exist, while keeping the working MAPID + MapLibre prototype intact.

This baseline deliberately separates five concerns:

1. **Application identity and preferences** — users, app authorization roles, stakeholder-mode preference.
2. **Reference and provenance** — categories, data source registry, feature registry.
3. **Canonical publishable layers** — transit nodes and merchants after validation.
4. **Raw/restricted source storage** — Community Activity, Menu Go, Struk Go, Properti Go.
5. **Flexible survey staging** — a generic envelope until the organizer provides the final technical survey contract.

No synthetic merchant or survey observation is inserted into Supabase by this step.

## 2. Key modeling decisions

### App role is not stakeholder mode

`profiles.app_role` controls authorization:

- `user`
- `contributor`
- `umkm_owner`
- `moderator`
- `admin`

Stakeholder mode remains a UI/decision context:

- `commuter`
- `umkm`
- `investor`
- `government`

A single account can therefore explore multiple decision modes without changing its authorization role.

### Canonical merchant is not Menu Go

`merchants` is the cleaned/publishable GETRA business layer. It is not a copy of any one source dataset.

Future pipeline:

```text
Menu Go ---------\
Community --------+--> cleaning + dedup + validation --> merchants
Open data --------+
Field survey -----/
```

`merchant_source_links` records provenance back to source records without exposing raw protected source data to browsers.

### Raw competition datasets stay separate

The baseline creates four empty raw tables:

- `community_activities`
- `mission_menu_records`
- `mission_receipt_records`
- `mission_property_records`

They are intentionally not merged into one generic `survey` table. Their source structures and privacy risks differ.

### Survey schema is intentionally flexible

The stable survey fields are normalized:

- contributor
- type
- location
- title/notes
- observation time
- workflow status
- privacy status
- media references

Unknown survey-specific fields stay in `attributes jsonb` until the official technical format is available. At that point, important stable attributes should be normalized through a new migration.

### No fake spatial facts in the database

At the end of Step 2 these tables should contain zero observational rows:

- `transit_nodes`
- `merchants`
- `survey_submissions`
- all raw MAPID competition tables

The existing local TypeScript demo remains the only synthetic spatial scenario and must stay visibly labeled synthetic.

## 3. Security model

### Public/RLS-visible

- active categories
- public data-source metadata
- published + surveyed/verified transit nodes
- published + surveyed/verified merchants
- public feature flags

### Self-only authenticated

- own profile
- own preferences
- eligible contributor's own survey submissions/media

### Backend-only / restricted

- raw MAPID Community Activity
- Menu Go raw records
- Struk Go raw records
- Properti Go raw records
- merchant-to-source provenance links
- evidence media
- ingestion runs
- moderation events
- audit events
- analysis trace

The backend secret key must never be used from a client component.

## 4. Why Step 2 does not enable pgRouting yet

PostGIS is needed now because canonical location columns should already use spatial types and indexes. pgRouting is deferred until the pedestrian graph contract is explicitly defined (node/edge topology, directionality, walk-time cost, accessibility attributes, graph version, and validation method). Enabling it early is harmless, but modeling the graph early is not.

## 5. What Step 3 should add

Step 3 should focus on authoritative/non-survey spatial foundations:

- chosen pilot area
- authoritative transit nodes
- pedestrian-network source
- graph cleaning/snapping rules
- `pedestrian_nodes`
- `pedestrian_edges`
- pgRouting
- deterministic route + walking time
- deterministic service area

Only after that should the UI replace synthetic walking minutes and synthetic service-area geometry.
