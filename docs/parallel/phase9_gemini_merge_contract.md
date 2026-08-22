BASE COMMIT: ed918ec3152fd6758e8ac62bd5ca0e84a158815e
PHASE 9 COMMIT: (See Local Git History)

TARGET HOTSPOT:
`frontend/components/getra-dashboard.tsx`

LEGACY BLOCK TO REMOVE:
Lines ~420-436 in `getra-dashboard.tsx`:
```tsx
        <nav
          className="stakeholder-switch"
          aria-label="Mode data"
        >
          <button className="stakeholder-button stakeholder-button--active">
            Coffee
          </button>
          <button className="stakeholder-button" disabled>
            Transit
          </button>
          <button className="stakeholder-button" disabled>
            UMKM
          </button>
          <button className="stakeholder-button" disabled>
            Investor
          </button>
        </nav>
```

NEW IMPORTS:
```tsx
import { StakeholderModeSwitcher } from "@/src/components/stakeholder/stakeholder-mode-switcher";
import { StakeholderContextShell } from "@/src/components/stakeholder/stakeholder-context-shell";
```

NEW COMPONENT INSERTION:
Replace the removed `<nav>` block with:
```tsx
        <StakeholderModeSwitcher />
```

Additionally, locate where the main dashboard content is rendered in `getra-dashboard.tsx` (or possibly wrap the entire `<div className="dashboard-content">`), and wrap it with `<StakeholderContextShell>`:
```tsx
        <StakeholderContextShell>
          {/* Existing Dashboard children/sections go here */}
        </StakeholderContextShell>
```

REQUIRED PROPS:
None. `StakeholderModeSwitcher` and `StakeholderContextShell` both read context directly from `StakeholderProvider`.

PHASE 8 DATA WIRING TO PRESERVE:
Do not alter any `useQuery`, `fetchMapidData`, or MAPID properties being passed around in `getra-dashboard.tsx`. The new components just wrap the view for contextual presentation.

PHASE 4 USER CONTEXT TO PRESERVE:
Ensure `<AuthProvider>` and `<StakeholderProvider>` remain correctly nested in `frontend/app/layout.tsx`.

LEGACY STATE/IMPORTS THAT MAY BE REMOVED:
Any React `useState` hooks inside `getra-dashboard.tsx` used purely to toggle between "UMKM", "Investor", etc. can be safely removed, as `StakeholderProvider` now manages this globally.

POST-MERGE TESTS:
1. Load dashboard. Ensure switcher appears and defaults to "General".
2. If the user has `UMKM`, verify clicking "UMKM" highlights the button and changes the wrapping context style to UMKM.
3. Verify all other Phase 8 components (Map, POI list) still render flawlessly under the shell.
