# Manual routing diagnostics

These scripts require an explicitly selected runtime and an existing authorized test account. They are manual checks, separate from `npm test`, and do not create users, deploy code, or change routing services.

Configure the environment locally; never commit populated credentials:

- Both scripts: `GETRA_TEST_USER_EMAIL`, `GETRA_TEST_USER_PASSWORD`, `GETRA_FRONTEND_ORIGIN`.
- API diagnostic: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`, `GETRA_BACKEND_ORIGIN`. Optionally set `GETRA_ROUTING_TARGETS` to a comma-separated list of full routing endpoint URLs instead of the backend origin. Authentication tokens are sent to those explicit targets.
- Browser diagnostic: install Playwright in your test environment or set `GETRA_PLAYWRIGHT_MODULE` to an existing module path. Microsoft Edge must be installed. `GETRA_ROUTING_SCREENSHOT` optionally changes the output file.

From the repository root, after configuring those environment variables:

```powershell
node tmp/test-routing-auth.mjs
node tmp/test-browser-routing.mjs
```

The API diagnostic posts a fixed motorcycle A/B request and exits unsuccessfully if any target fails. The browser diagnostic uses fixed coordinates and simulated browser geolocation; it checks the routable state and start button, then closes the browser. Generated screenshots default to ignored `outputs/routing-smoke/`.

`browser-routing-success.png` is the existing screenshot captured on 8 September 2026. It shows a previous test session; its serving build was not established by this commit. It is not evidence that the current deployment or physical GPS/sleep-wake behavior passes. No live routing test was run as part of committing these helpers.
