# Demo / Successful Verification

FINAL DEMO STATUS: `PASS`

Environment:

- Branch: `finalmerge`
- HEAD: `e53f74261368e7fbdcbb5c140679e89d79437bed`
- Demo date: `2026-08-24`
- Frontend: `http://localhost:3000`
- Backend: `http://localhost:8080`
- Supabase target: `sesakxnjaphrxqxllqjm`
- Browser: Chrome headless through `puppeteer-core`
- Video demo: `NOT_APPLICABLE`
- Playwright trace: `NOT_APPLICABLE`

The demo used generated test identities and a generated demo merchant. No passwords, access tokens, service keys, private phone numbers, or personal addresses are documented.

## Result Summary

- Submission: `PASS`
- Pending History: `PASS`
- Admin Approval: `PASS`
- Points: `PASS`
- Trust Score: `PASS`
- Notification: `PASS`
- Approved Map: `PASS`
- Rejection: `PASS`
- Privacy: `PASS`
- Security: `PASS`
- Six report types: `PASS`
- Merchant canonical boundary: `PASS`

Final evidence file: [assets/demo/demo-evidence.json](./assets/demo/demo-evidence.json)

## Verified Demo Steps

| Step | Action | Expected Result | Actual Result | Status | Evidence |
|---|---|---|---|---|---|
| 1 | USER opens Community then Contribution form for `SIDEWALK_OBSTRUCTION` | Real form with structured fields and explicit map picker | Form rendered with details, observed time, and selected map point | PASS | [01-contribution-form.png](./assets/demo/01-contribution-form.png) |
| 2 | USER submits accessibility contribution | New contribution is `PENDING` | Browser submission landed as `PENDING` and appeared in history | PASS | [02-pending-history.png](./assets/demo/02-pending-history.png) |
| 3 | ADMIN opens moderation queue | Pending contribution visible to admin | Admin moderation page rendered the pending demo contribution | PASS | [03-admin-moderation.png](./assets/demo/03-admin-moderation.png) |
| 4 | ADMIN approves contribution | Status becomes `APPROVED`, review timestamp stored, server reviewer derived | Confirm API returned `APPROVED`; user history showed approved contribution | PASS | [04-approved-history.png](./assets/demo/04-approved-history.png) |
| 5 | USER checks points and Trust Score | Points awarded once; Trust Score recalculated | Summary showed `2` points across two approved demo contributions and Trust Score `60` after `2` approved / `1` rejected reviewed records | PASS | [05-points-trust.png](./assets/demo/05-points-trust.png) |
| 6 | USER opens approved contribution map | Approved contribution appears on MapLibre map with safe projection | Map rendered approved contribution layer/marker; API privacy check passed | PASS | [06-approved-map.png](./assets/demo/06-approved-map.png) |
| 7 | USER submits second contribution and ADMIN rejects it | Status becomes `REJECTED`, no points, notification created, excluded from map | Rejected contribution appeared in history and was absent from approved map response | PASS | [07-rejected-history.png](./assets/demo/07-rejected-history.png) |
| 8 | USER notification evidence | Moderation notifications visible | Notification API returned `3` scoped notifications; dashboard notification surface captured | PASS | [08-notification.png](./assets/demo/08-notification.png) |
| 9 | USER submits `MERCHANT_LOCATION_CHANGED` in browser | Canonical merchant selected, old/new locations submitted, contribution approved | Browser form selected generated demo merchant and submitted location-change report | PASS | [09-merchant-location-select.png](./assets/demo/09-merchant-location-select.png), [09-merchant-location-browser.png](./assets/demo/09-merchant-location-browser.png) |

## API / Integration Coverage

All report types have evidence:

- `SIDEWALK_OBSTRUCTION`: full browser demo
- `MERCHANT_LOCATION_CHANGED`: full browser demo
- `CROSSING`: browser rejection demo
- `RAMP_OR_GUIDING_BLOCK`: live RPC/API evidence
- `MERCHANT_PRICE_CHANGED`: live RPC/API evidence
- `MERCHANT_HOURS_CHANGED`: live RPC/API evidence

## Security Evidence

The final demo runner verified:

- USER attempts moderation: denied
- USER attempts status spoof: denied
- USER attempts points spoof: denied
- USER attempts trust-score spoof: denied

## Privacy Evidence

The approved map API response was scanned for forbidden fields:

- `email`
- `phone`
- `account_role`
- reviewer identity
- private moderation note
- raw `report_data`
- points internals
- Trust Score internals

Result: no forbidden keys found.

## Demo Data Cleanup

The demo runner cleans only generated fixture IDs:

- Isolated demo contribution IDs
- Isolated demo merchant ID
- Isolated demo auth users/profiles

It does not run `TRUNCATE`, `db reset`, or broad deletes.
