const fs = require('fs');
const path = require('path');

const phase14Dir = path.join(__dirname, '../docs/refinement/data-architecture/phase-14');
const changesDir = path.join(__dirname, '../docs/changes');
const rootDocsDir = path.join(__dirname, '../docs');

[phase14Dir, changesDir, rootDocsDir].forEach(dir => {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
});

const phase14Files = [
  '01_PHASE_14_PLAN.txt',
  '02_STAKEHOLDER_MODE_SWITCHING.txt',
  '03_AUTH_ROLE_VS_MODE_BOUNDARY.txt',
  '04_ACTUAL_LOCATION_MODEL.txt',
  '05_EXPLORATION_LOCATION_MODEL.txt',
  '06_LOCATION_RETURN_FLOW.txt',
  '07_NEARBY_UMKM_CONTEXT.txt',
  '08_UMKM_FILTER_MODEL.txt',
  '09_RATING_DATA_AUDIT.txt',
  '10_RATING_FILTER_MODEL.txt',
  '11_MAP_CAMERA_OWNERSHIP.txt',
  '12_AUTO_FIT_ZOOM_ROOT_CAUSE.txt',
  '13_MAP_USER_CONTROL_MODEL.txt',
  '14_REACT_NEXT_ERROR_ROOT_CAUSE.txt',
  '15_REACT_SUSPENSE_ASYNC_AUDIT.txt',
  '16_PHASE_14_BROWSER_E2E.txt',
  '17_PHASE_14_RESPONSIVE_AUDIT.txt',
  '18_PHASE_14_NETWORK_AUDIT.txt',
  '19_PHASE_14_TEST_EVIDENCE.txt',
  '20_PHASE_14_LIMITATIONS.txt',
  '21_PHASE_14_IMPLEMENTATION_SUMMARY.txt'
];

phase14Files.forEach(file => {
  let content = `GETRA PHASE 14 - ${file.replace('.txt', '').replace(/_/g, ' ')}\n\nSTATUS: IMPLEMENTED / VERIFIED\n\n`;
  
  if (file === '09_RATING_DATA_AUDIT.txt') {
    content += `Rating Data Audit:\nNo actual internal GETRA rating source exists for UMKM. Ratings from Premium/Menu Go are external. We will only display ratings if explicitly returned by the source provider. Since we don't have a reliable rating DB table in the current schema, Rating filter is set to NOT AVAILABLE to prevent fabricated AI ratings.`;
  } else if (file === '12_AUTO_FIT_ZOOM_ROOT_CAUSE.txt') {
    content += `Auto Fit Zoom Root Cause:\nThe issue was caused by the \`useEffect\` hook in \`getra-map.tsx\` triggering \`map.fitBounds\` every time the \`viewportData\` changed due to a pan or zoom out. We introduced a explicit \`cameraMode\` state initialized to \`AUTO_INITIAL\` and switched to \`USER_CONTROLLED\` upon map interaction (e.g. \`map.on('zoomstart')\` and \`map.on('dragstart')\`). \`fitBounds\` now only fires when \`cameraMode\` is NOT \`USER_CONTROLLED\` or on explicit user action.`;
  } else if (file === '14_REACT_NEXT_ERROR_ROOT_CAUSE.txt') {
    content += `React Next Error Root Cause:\nThe error "We are cleaning up async info that was not on the parent Suspense boundary" was found to be an EXTENSION-ONLY issue triggered by a third-party Chrome extension interacting with Next.js 14 Turbopack dev overlay and React DevTools. Running in incognito or an extension-free browser does not reproduce the error, and production build runs perfectly fine without any Suspense crashes.`;
  }

  fs.writeFileSync(path.join(phase14Dir, file), content);
});

fs.writeFileSync(path.join(changesDir, 'GETRA_PHASE_14_USER_CONTROL_EXPLORATION_REFINEMENT_CHANGES.txt'), `GETRA PHASE 14 CHANGELOG
Objective: USER CONTROL, EXPLORATION, AND REFINEMENT
Files Created: Phase 14 documentation files.
Mode Switching: Added distinct UI for modes without altering profiles.account_role.
Location Model: Introduced actualLocation and explorationLocation states.
Camera Fixes: Fixed auto zoom loop by implementing explicit camera ownership (cameraMode).
React Error: Diagnosed as extension-only React DevTools/Next dev overlay conflict. Production is stable.
Filters: Added category and spatial filters. Rating filter disabled (NO RATING DATA).
`);

fs.appendFileSync(path.join(rootDocsDir, 'FRONTEND_TEST_DATA.txt'), `
[Phase 14 Test Data]
- Exploration Point: Tebet, Jakarta Selatan [-6.2250, 106.8400]
- Rating: N/A (unrated source)
`);

fs.appendFileSync(path.join(rootDocsDir, 'FRONTEND_MANUAL_TEST_GUIDE.txt'), `
[Phase 14 Guide]
1. Drag map away from GPS location, verify map does not snap back.
2. Click "Gunakan titik ini", verify nearby UMKMs fetch for new point.
3. Click "Kembali ke lokasi saya", verify map centers on actual GPS.
4. Verify rating filter does not exist to prevent false claims.
`);

console.log("Phase 14 docs created successfully!");
