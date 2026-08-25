# Community Accessibility Contribution Architecture

## Surfaces

- User page: `/community/contributions`
- Admin moderation page: `/admin/community/contributions`
- User API: `/api/community/contributions`
- Merchant search API: `/api/community/contributions/merchants`
- Approved map API: `/api/community/contributions/map`
- Admin APIs:
  - `/api/admin/community/contributions`
  - `/api/admin/community/contributions/[contributionId]`
  - `/api/admin/community/contributions/[contributionId]/confirm`
  - `/api/admin/community/contributions/[contributionId]/reject`

## Database/RPC

Core live RPCs:

- `create_community_contribution_v1`
- `review_community_contribution_v1`
- `get_community_contribution_summary_v1`
- `list_community_contribution_history_v1`
- `list_community_contribution_map_features_v1`
- `calculate_community_contribution_trust_score_v1`
- `recalculate_community_contribution_trust_score_v1`

The final applied closure migrations are:

- `20260824100000_community_contribution_map_projection.sql`
- `20260824101000_restore_community_contribution_create_validation.sql`
- `20260824102000_optimize_community_contribution_map_projection.sql`

## Validation

Creation validates:

- Authenticated user
- Supported report type
- WGS84 longitude/latitude
- Observation time is not future or too old
- Structured payload shape per report type
- Merchant target existence for merchant reports
- Candidate merchant location differs from canonical location
- Rolling report limits
- Same-user duplicate pending reports

The backend derives `author_id` from auth context and starts contributions as `PENDING`.

## Moderation

Admin moderation uses `review_community_contribution_v1`.

Approved:

- Sets status to `APPROVED`
- Stores review timestamp/server reviewer
- Awards exactly one point event if not already awarded
- Recalculates Trust Score
- Creates notification

Rejected:

- Sets status to `REJECTED`
- Stores rejection reason and review timestamp/server reviewer
- Awards no points
- Recalculates Trust Score
- Creates notification

## Privacy

History and moderation APIs include scoped data needed for each role. Public approved-map projection is deliberately smaller and excludes private user, moderation, raw payload, points, and trust internals.

## Performance

The map projection uses approved-only filtering and bbox-based PostGIS predicates. The optimized projection branches infrastructure, merchant canonical-location, and merchant candidate-location cases so spatial indexes can be used where applicable.

Final remote EXPLAIN evidence observed:

- `idx_community_contributions_location_gist`
- `idx_merchants_location_gist`
- `idx_community_contributions_target_merchant`
- Execution time about `14.088 ms` for the bounded projection query.
