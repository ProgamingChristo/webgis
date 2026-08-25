# Community Accessibility Contribution

Community Accessibility Contribution is the GETRA field-data contribution system for accessibility and merchant-data observations. Users submit structured reports with explicit location and observation time; admins moderate those reports before they become trusted public map observations.

## Report Types

- Trotoar terhalang (`SIDEWALK_OBSTRUCTION`)
- Ramp atau guiding block (`RAMP_OR_GUIDING_BLOCK`)
- Penyeberangan (`CROSSING`)
- Lokasi usaha berpindah (`MERCHANT_LOCATION_CHANGED`)
- Perubahan harga (`MERCHANT_PRICE_CHANGED`)
- Perubahan jam buka (`MERCHANT_HOURS_CHANGED`)

## Actual Lifecycle

```text
USER
  -> Submit
  -> Location/time validation
  -> Duplicate/report-limit protection
  -> PENDING
  -> ADMIN moderation
     -> APPROVED
        -> Contribution Points
        -> Trust Score recalculation
        -> Notification
        -> Safe Map Projection
     -> REJECTED
        -> 0 points
        -> Trust Score recalculation
        -> Notification
```

Canonical status names are `PENDING`, `APPROVED`, and `REJECTED`.

## Points

The current implementation awards `1` Contribution Point exactly once for each `APPROVED` contribution. `PENDING` and `REJECTED` contributions award `0` points. Point inserts are server-side only; users cannot directly create point events.

## Trust Score

Trust Score measures consistency of reviewed GETRA contributions, not general human trustworthiness.

Current formula:

```text
No reviewed contributions:
  trust_score = 50

Reviewed contributions:
  trust_score = round(100 * (approved + 1) / (approved + rejected + 2))
  bounded to 0..100
```

The score is recalculated after moderation. In the final demo evidence, `2` approved and `1` rejected contribution produced Trust Score `60`.

## Security Model

Authorization is based on `account_role` only:

```text
account_role
  -> USER
  -> ADMIN
```

Boundaries:

- Community membership is not a role.
- UMKM mode is not merchant ownership.
- GOVERNMENT mode is not moderation authority.
- Trust Score is not authorization.
- Contribution Points are not Trust Score.
- Friendship is not privilege.

Only `ADMIN` can moderate. Server-side RLS/RPC checks deny user moderation, status spoofing, point spoofing, trust-score spoofing, and self-confirmation.

## Map Projection

The approved contribution map is served by `list_community_contribution_map_features_v1` and `/api/community/contributions/map`.

Rules:

- Only `APPROVED` contributions are projected.
- `PENDING` and `REJECTED` contributions are excluded.
- Query is bbox-based and uses PostGIS.
- Public map projection excludes private fields such as author identity, email, phone, raw `report_data`, reviewer identity, points internals, and trust-score internals.

Report-type geometry:

- Accessibility infrastructure reports use the contribution location.
- Merchant price and merchant hours reports use the canonical merchant location.
- Merchant location-change reports use the approved reported candidate location.

## Canonical Data Boundary

```text
APPROVED COMMUNITY CONTRIBUTION
!=
AUTOMATIC CANONICAL DATA UPDATE
```

An approved contribution is a trusted observation or candidate correction. It does not automatically mutate canonical merchant location, price, hours, or pedestrian graph data.

## MVP Limitations

Not implemented in this MVP:

- Photo evidence
- Automatic merchant canonical mutation
- Automatic pedestrian graph mutation
- Complex reward economy
- Leaderboard
- AI moderation
- AI Trust Score

## Final Demo

Final demo status: `PASS`.

See [demo.md](./demo.md) for executed demo evidence and screenshots.

Architecture details are in [architecture.md](./architecture.md).
