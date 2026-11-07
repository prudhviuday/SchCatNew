# SchCatNew migration checkpoint

Last updated: 2026-11-07

## Project rules
- Work only in `prudhviuday/SchCatNew`, branch `main`.
- Do not modify `prudhviuday/SchCat` or `prudhviuday/SchCatWeb`.
- Do not create branches without the user's permission.
- Preserve original SchCat behaviour; do not mark a feature complete solely because a screen exists.
- The final application must open from its Cloudflare URL without local Python/Node setup or manual API URL configuration.
- MarketSmith may still require a valid `ms-auth` session; never imply that provider authentication can be bypassed.

## 14-step plan and status

| Step | Scope | Status |
|---|---|---|
| 1 | Audit original Python app against SchCatNew | Complete — source audit only; no files modified |
| 2 | Migrate original reference workbooks, saved queries, watchlists, portfolio and Industry Analysis history | Complete — data archived and browser JSON conversion added |
| 3 | Integrate SchCatWeb API gateway into SchCatNew | Complete in repository — Worker, Wrangler config and route tests added; Cloudflare production build status still unverified/failed |
| 4 | Complete provider integration and verify live upstream behaviour | In progress — fixed frontend routing/diagnostics; live provider check blocked until Cloudflare build settings are corrected |
| 5 | Port shared Python calculations and utilities | Not started |
| 6 | Complete Stocks screen parity | Not started |
| 7 | Complete Chart screen parity | Not started |
| 8 | Complete Industry Stocks / multi-stock Analysis parity | Not started |
| 9 | Complete Industry Analysis parity | Not started |
| 10 | Complete Research / Querys parity | Not started |
| 11 | Complete Market Pulse parity | Not started |
| 12 | Complete Portfolio parity | Not started |
| 13 | Full parity and regression verification | Not started |
| 14 | Final Cloudflare deployment and real URL verification | Not started |

## Step 1 — audit findings
The desktop app's primary screens are Stocks, Chart, Industry Stocks, Industry Analysis, Querys/Research, Market and Portfolio. The web repository already contains implementations for all seven, but several are partial and still need comparison against the original Python workflows. The original chart panel has weekly, daily, hourly and 5-minute charts; the Industry Analysis uses institutional value, close-volume, NSE delivery and market-cap-weighted relative strength aggregation. Important desktop sources include `Guimain2.py`, `helper.py`, `util.py`, `chartengine.py`, `Tabs/AnalysisTab.py`, `Tabs/ChartTab.py`, `Tabs/IndustryAnalysisTab.py`, `Tabs/MarketPulseTab.py`, `Tabs/ResearchTab.py` and `Tabs/portfolioTab.py`.

## Step 2 — data migrated
Original workbook snapshots from `prudhviuday/SchCat` are archived in `source-data/`:
- `Book1.xlsx`
- `ChartInkQs.xlsx`
- `marketsmithidsall4.xlsx`
- `Industrydata.xlsx`

All 10 saved `data/IndustryAnalysis/*.json` snapshots are archived byte-for-byte in `source-data/IndustryAnalysis/`.

`frontend/tools/convert-legacy-workbooks.mjs` runs automatically via the frontend `prebuild` script and creates:
- `frontend/public/data/legacyWorkbookData.json`
- `frontend/public/data/industryAnalysisIndex.json`
- `frontend/public/data/industry-analysis/*.json`

Verified conversion counts: 2,256 stock-universe rows; 107 industries; 27 saved queries; 5 watchlists with 34 symbols; 2 portfolio holdings; 98 performance symbols; 10 Industry Analysis snapshots containing 1,446 result rows. Conversion warnings: none. Existing static market-universe/industry/MarketSmith-ID assets retain their original provenance and manifest.

## Step 3 — API gateway integrated
Copied/adapted `worker/index.js` from SchCatWeb into SchCatNew. Added root `wrangler.toml` with:
- Worker name `schcatnew`
- Main entry `worker/index.js`
- Static assets from `./frontend/dist`, bound as `ASSETS`
- SPA fallback for frontend routes
- Worker-first handling for `/api/*`

Routes: `GET /api/health`, `GET /api/yahoo/chart`, `GET /api/marketsmith/finance`, `GET /api/marketsmith/symbol`, `GET /api/marketsmith/relative-strength`, `POST /api/chartink/scan`, `GET /api/nse/delivery`.

Added `frontend/tests/integration/workerApi.test.mjs`, copied/adapted from SchCatWeb, and CI now runs `npm run test:integration`. The successful CI run verified 22 Worker API cases, including mocked upstream handling for Yahoo, MarketSmith, ChartInk CSRF/history, NSE session bootstrap, method/input validation, unknown API routes and static asset forwarding. These are mocked route tests, not evidence that real provider upstreams or the deployed URL currently work.

Important deployment caveat: GitHub Actions `build` workflow passed on commit `40a13f839f86bf8d491683f93f765fb51372dc09`; Cloudflare's `Workers Builds: schcatnew` check for the same commit completed with failure. Its check summary does not expose the underlying reason. Do not claim the Worker is deployed/working until the Cloudflare build issue is diagnosed and the live URL/routes are tested.

## Step 4 — provider integration fixes and deployment blocker
A provider/client audit found two concrete integration defects and fixed them:
- Live chart candles were still fetched directly from Yahoo in the browser even though a Worker proxy builder and test already existed. `fetchYahooCandles` now calls `/api/yahoo/chart` with same-origin credentials, so production charts use the Worker and avoid Yahoo CORS restrictions.
- The diagnostics page still expected health service identity `schcatweb-api`, while the copied Worker correctly identifies itself as `schcatnew-api`. Health checks would therefore incorrectly report the Worker as invalid. Updated the expected identity and all visible diagnostics branding to SchCatNew. Kept the existing browser local-storage key for MarketSmith auth so an existing saved session is not discarded.

Added a root `package.json` that pins Wrangler 4.158.0 and defines `build`, `deploy`, and `preview` scripts. The build script installs/builds the frontend before Wrangler deploys the root Worker. CI now explicitly runs the chart-provider and provider-diagnostics regression suites in addition to the prior checks.

**Cloudflare build configuration still requires a dashboard setting:** Cloudflare Workers Builds runs a separate optional Build command and then the Deploy command (default `npx wrangler deploy`). Its current GitHub integration has been failing on the Worker deployment. Cloudflare's current docs state that Workers Builds settings live in Worker Settings → Build and that Workers Builds does not honor Wrangler Custom Builds configuration. Therefore the Worker project must have Build command `npm run build` (repository root), Deploy command `npx wrangler deploy`, and root directory blank/repository root. This dashboard setting cannot be changed through the available repository tools. After the setting is corrected, a new production build is needed before live health/provider testing can be meaningful.

The current provider diagnostics page can test health plus live Yahoo, MarketSmith finance/symbol/relative-strength, ChartInk and NSE delivery routes. MarketSmith still requires the user's valid current `ms-auth` value, entered locally in that browser. Real provider upstream access has not yet been verified because the Cloudflare Worker build/deployment is not confirmed. Do not describe mocked tests as live provider tests.

## Latest verified repository state
- Branch: `main`
- Latest Step 3 commit: `40a13f839f86bf8d491683f93f765fb51372dc09`
- CI run: `https://github.com/prudhviuday/SchCatNew/actions/runs/42356128890` — success.
- Cloudflare build: `https://dash.cloudflare.com/25cbd8f5e7df317d5d1f2bb3a94452f1/workers/services/view/schcatnew/production/builds/c97b8f3e-41f2-47db-9c9d-645c42e03720` — failed; reason not available in the GitHub check summary.

## Next action
Continue with **Step 4/14**: compare every frontend provider request with the Worker routes, test upstream provider reachability/authentication, resolve the Cloudflare Worker build failure if possible, and report any provider-specific restrictions. Keep the distinction between mocked tests and real upstream verification explicit.
