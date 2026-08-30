# GETRA Integration Phase 7: Canonical Data Mapping & Provenance
## Final Verification Report

PHASE 7: PASS

PHASE 8 READINESS: READY

### 1. Database Audit & Legacy Context
An audit of the existing tables (including `merchants`, `umkm`, `pois`, `mission_menu_records`, `community_activities`, `survey_responses`) verified that they contain exactly **0 rows**. There was no legacy dummy data to migrate or delete on the canonical layer.

### 2. Provenance Architecture (Migration)
We applied the safe, idempotent migration `20260823000002_add_canonical_mapid_provenance.sql` to the spatial foundation (`transport_nodes`, `transport_corridors`, `study_areas`). 
This guarantees provenance lineage tracking across the pipeline by enforcing:
```sql
UNIQUE (source_id, source_record_id, environment)
```
This safely prevents duplicate canonical entities if the ingestion pipeline is executed repeatedly.

### 3. Idempotent Mapper Implementation
We implemented the Canonical Mapper for `transport_node` (`src/modules/transport-node/mappers/transport-node.canonical-mapper.ts`), mapping `staging_mapid_activities` to the Canonical `transport_nodes` model. It correctly adheres to Postgres constraints like `validated_at_order`.

> [!NOTE]
> Following **Rule 84 (Missing Activity Rule)**, we mapped exactly what was successfully ingested in Phase 6 (`transport_node`). Menu, Receipt, Property, Community, and Survey evidence mappings have been logically designed in the implementation plan but are currently marked as **BLOCKED BY SOURCE DATA** and safely skipped to avoid fabricating fake integration test data.

### 4. Lineage Verification
Running the pipeline dynamically inserts the correct provenance identifiers. A join query from canonical down to external MAPID shows a perfect un-broken lineage:

| External MAPID Record ID | Raw Evidence ID | Staging ID | Canonical Transport Node ID |
| --- | --- | --- | --- |
| `TEST-MAPID-NODE-001` | `2709e0cf-560c-47bf-a606-984434d0d6d5` | `54d43a23-39d4-488e-a2c2-8ff6c58c4238` | `da1f0435-b58b-4f4f-ade0-e7c59fb91225` |
| `TEST-MAPID-NODE-002` | `6c5d3119-3a55-4aa7-ae49-cf35fccec269` | `e2dac5c4-0241-4b6d-95af-fb4d3d2c4c2a` | `481f0c4d-da50-463c-9bca-bca91090134e` |

### 5. Idempotency Check
Executing `run-canonical-mapping.ts --apply` multiple times resulted in exactly 0 constraint violations and 0 duplicate rows created. The process is completely stable and safely repeatable.

**PHASE 7 STATUS: COMPLETED SUCCESSFULLY**
**READY FOR PHASE 8 (BACKEND API/FRONTEND INTEGRATION)**
