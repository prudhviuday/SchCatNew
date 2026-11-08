# SchCatNew migration checkpoint

Last updated: 2026-11-08

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
| 3 | Integrate SchCatWeb API gateway into SchCatNew | Complete — Worker, Wrangler config, static asset binding and API route tests are in place; user confirmed the Cloudflare site is working |
| 4 | Complete provider integration and verify live upstream behaviour | Integration code complete — all browser providers use same-origin Worker routes; actual live upstream reliability remains subject to final live checks and MarketSmith `ms-auth` session |
| 5 | Port shared Python calculations and utilities | Complete — audited the legacy utility layer, retained existing calculation ports, and added tested shared metric-presentation rules |
| 6 | Complete Stocks screen parity | Complete — parity fixes committed and full CI passed on code commit `60e8725ccba8dfc7e6094c14f58700d6f5c2d201` (run `42386634477`) |
| 7 | Complete Chart screen parity | Complete — four legacy timeframe panes, same-origin Yahoo proxy, indicator alignment and tested older/newer history navigation; full CI passed (run `42473474421`) |
| 8 | Complete Industry Stocks / multi-stock Analysis parity | Complete — legacy first-seen industry order restored, batched charts and gallery navigation covered; full CI passed (run `42473474421`) |
| 9 | Complete Industry Analysis parity | Complete — full-universe batch run, exact legacy aggregations, browser persistence and combined JSON export; CI passed (run `42389197840`) |
| 10 | Complete Research / Querys parity | Complete — migrated saved queries and performance symbols auto-load; live ChartInk history/evaluation retained; CI passed (run `42390084818`) |
| 11 | Complete Market Pulse parity | Complete — exact 4,478-character query, 13-column mapping, refresh behaviour and Worker request contract verified; CI passed (run `42445863179`) |
| 12 | Complete Portfolio parity | Complete — synthetic OHLC/P&L workflow audited; first-visit workbook holdings migration and browser-local override behaviour tested; full CI passed (run `42473474421`) |
| 13 | Full parity and regression verification | In progress — cross-feature/provider/Worker audit; corrected remaining SchCatWeb UI error labels and outdated Yahoo CORS guidance; CI pending |
| 14 | Final Cloudflare deployment and real URL verification | Not started |

## Step 11 — Market Pulse (complete)

Compared the original `Tabs/MarketPulseTab.py` and `chartink.py::chartinkDashboard` against `MarketPulse.tsx`, `marketPulse.ts`, the Worker ChartInk widget route, and Market Pulse tests.

Verified parity already present:
- The TypeScript `MARKET_PULSE_QUERY` is an exact character-for-character match for the original Python `querybig` (4,478 characters after trimming surrounding whitespace).
- The original 13 columns and newest-first date ordering are retained.
- The six-session widget request uses `use_live=1`, `limit=6`, and `size=375`.
- All 12 metric groups are mapped in the original order; 5-day and 10-day ratios are rounded to one decimal.
- The original inclusive colour rule ordering and luminance-based text contrast are retained, including intentional neutral gaps.
- Manual Refresh and optional 60-second Auto-refresh match the desktop's default refresh interval.

Fixes and tests added in this step:
- Corrected the UI explanation: Market Pulse does not fetch ChartInk directly from the browser. It calls the same-origin Cloudflare Worker, which bootstraps ChartInk CSRF and forwards the widget request. The browser does not persist ChartInk cookies/session tokens.
- Updated remaining SchCatWeb labels and Worker error text to SchCatNew.
- Blank/null metric values now remain neutral instead of JavaScript coercing them to zero and potentially assigning a misleading colour.
- Added tests for the exact Worker request contract (same-origin POST, widget mode, exact query, live flag, six sessions and size 375), Worker error propagation, and blank-value colour handling.

The Worker route and upstream behaviour are covered by mocked tests; this does not prove ChartInk is currently reachable from the deployed Cloudflare Worker. GitHub Actions build/test passed on commit `980a0d5ff08557c3f49b778c164ede4ceba82cfd` (run `42445863179`).

Browser test after deployment: open Market Pulse and confirm the 13-column history loads newest-first; verify ratios show one decimal, cell colours include neutral gaps, manually Refresh, enable Auto-refresh and wait one minute, then disable it. If ChartInk is unavailable, the page should show the actual Worker/provider error rather than sample data.

## Step 10 — Research / Querys (complete)

Compared the original `Tabs/ResearchTab.py` and `util.getHistoryfromQuery` workflow with `Research.tsx`, `research.ts`, and the same-origin ChartInk history provider.

The desktop workflow reads a performance workbook and query workbook, runs each saved ChartInk clause through the historical query endpoint, intersects the returned unique stock universe with the successful-performance stock set, reports Matches and Total, and plots Query vs Match Percentage.

Parity changes in this step:
- Research now automatically fetches the build-generated `/data/legacyWorkbookData.json` snapshot and loads the migrated saved ChartInk query clauses from `ChartInkQs.xlsx` plus the performance symbol list from `Book1.xlsx`.
- The imported workbook defaults are used only when the user has not already loaded a replacement CSV; manual CSV imports remain supported.
- Added validation and tests for migrated workbook query names, clauses, performance symbols, duplicates and malformed legacy data.
- The existing sequential live ChartInk history backtest, per-query progress, failures, history JSON export/import, evaluation table, match-percentage chart and CSV export remain in place.
- Unlike the desktop's broad exception handler that writes a failed query as 0%, the web app distinguishes missing/failed historical data from a genuine 0% match result.

The workbook JSON is generated during the frontend prebuild from the archived source workbooks; it is a dated snapshot and does not refresh automatically from the original desktop machine. ChartInk history still depends on the live provider and Cloudflare Worker route.

GitHub Actions build/test passed on commit `557142e0ac105e8a8541d77e0496ad9f85299602` (run `42390084818`), including the frontend build, Wrangler dry-run and Research tests. Browser test after deployment: open Research without importing files and confirm the migrated saved query and performance counts appear; run ChartInk history and verify progress/failure reporting; evaluate the results; then import a replacement query CSV and performance CSV to confirm manual overrides still work.

## Step 9 — Industry Analysis (complete)

Compared the original `Tabs/IndustryAnalysisTab.py` and `util.py` with `IndustryAnalysis.tsx`, `industryAnalysis.ts`, `industryLive.ts`, and the Yahoo / MarketSmith / NSE provider adapters.

The existing calculation port preserves the desktop formulas and ordering:
- Institutional value uses MarketSmith fund-held shares multiplied by current price and divided by ₹1 billion, truncated to an integer.
- Close × volume uses weekly Yahoo candles, divided by ₹1 billion, rounded to two decimals, and limited to the latest 30 observations.
- NSE delivery and traded-value series use the original five-session rolling averages and the desktop's zero-prefix alignment before calculating the combined delivery percentage.
- MarketSmith RS fills missing values with the stock's integer average, reverses the provider's newest-first rows, weights each stock's RS by the reference-workbook market cap, and divides by the legacy industry market-cap denominator. The denominator includes every constituent, including stocks whose provider request failed, and preserves the original initial +1 / missing-cap fallback.
- Institutional, turnover and RS series retain the desktop's first-value prefix alignment; delivery/traded series retain zero-prefix alignment. Saved five-array JSON remains import/export compatible.

Parity gap addressed in this step: the desktop Start button processes all sorted non-BSE industries and writes one combined JSON result, while the initial web screen only ran the selected industry. Added **Run all industries** alongside **Run selected industry**. The batch runner processes industries sequentially with bounded per-industry stock concurrency, reports overall progress and industry name, lists failed constituents by industry, and returns one combined five-series result set. Existing selected-industry mode remains available.

Live and imported results now persist in browser local storage across reloads, while the existing Export JSON action keeps a portable desktop-compatible file. This is browser-local persistence, not server/database storage. MarketSmith live requests still require the user's current `ms-auth` session; provider tests do not establish real upstream availability.

Added a batch-orchestration test covering multiple industries, result ordering, aggregate progress and combined output. The existing `test:industry` CI command already runs both industry aggregation and live-provider suites. GitHub Actions build/test passed on commit `c471e6e5d07aec6d965a4ffc77a854f3ab6f329c` (run `42389197840`), including TypeScript build, Wrangler dry-run, reference-data checks and all industry tests.

Browser test after deployment: open Industry Analysis, save a current MarketSmith session in Provider Diagnostics, then use **Run selected industry** for a small industry. Confirm all four series appear and failures are reported. Then use **Run all industries**, watch the overall stock counter and current industry, reload the page to confirm results persist, and use Export JSON to download a five-array-compatible file.

## Step 8 — Industry Stocks / multi-stock Analysis (in progress)

Compared the original `Tabs/AnalysisTab.py` with `MultiStockAnalysis.tsx` and its domain helpers. The web gallery already covers the core desktop workflow: case-insensitive industry/stock substring search, exact-industry navigation from the Stocks tab, a 12-stock cap, weekly/daily chart pairs, refresh, scrollable chart cards, and opening a ticker in the full Chart tab. It fetches in small batches rather than launching every chart request at once.

Fixed a parity mismatch in industry suggestions/cycling: the web helper previously alphabetically sorted industries, whereas the desktop completer and Right Arrow / `.` cycling followed first-seen source order. It now retains first-seen order, removes case-only duplicates, and ignores blank names. Added tests for ordering and duplicate handling. The existing `test:multi-stock-analysis` suite is now explicitly included in GitHub Actions so these behaviours are continuously checked.

Verification pending: the full GitHub Actions run triggered by these commits. The gallery still relies on the same-origin Yahoo chart Worker and real upstream access is not inferred from fixture tests.

## Step 7 — Chart screen parity (in progress)

Compared the original `Tabs/ChartTab.py` and `chartengine.py` with `StockWorkspace.tsx` and `chartData.ts`. The original screen loads Weekly, Daily, Hourly and 5-minute OHLCV panes. SchCatNew already loads those four intervals through the same-origin Yahoo Worker, renders candlesticks and volume, calculates SMA 50 / EMA 50 / EMA 200 / RSI 21 on the complete history, and exposes 100/200/500-candle windows.

Step 7 adds navigation through historical chart windows: **Older** moves back by one selected window and **Newer** returns toward the latest candles. Indicator values remain aligned to their original candles because calculations still run against the complete sorted history before the visible window is sliced. Changing the symbol or window size resets the offset to the latest view. Added tests for latest/older/empty windows and invalid offsets.

The source desktop `ChartTab.py` itself only specifies the four panes, candlesticks, volume and mouse pan/zoom; it does not define extra drawing tools. This web navigation is a deterministic keyboard/touch-friendly equivalent for browsing history; freehand drawing tools are not claimed as ported.

Verification pending: full GitHub Actions build/test workflow after these commits. Live Yahoo access still depends on the deployed Worker and provider availability; the automated chart tests use fixtures and do not prove live upstream availability.

## Step 6 — Stocks screen parity

Compared the web Stocks screen against `Guimain2.py` and `helper.py`. The web implementation already includes the reference-universe load, manual eight-worker MarketSmith refresh, search, sector/industry and numeric filters, AND-combined saved queries, watchlists, sorting, CSV export, row selection/right-panel history, and 1–9/Right Arrow watchlist shortcuts. Completed additional parity fixes:
- Double-clicking a stock row now opens that stock in the Chart workspace, while a double-click on the Industry action does not hijack the industry navigation.
- The table and selected-stock panel now label the MarketSmith `epsRank` field as `EPS`, matching the original desktop Stocks table rather than the more modernized `EPS Rank` wording.
- Watchlist Go now toggles to Drop when the same watchlist is active, and Drop clears the watchlist filter, matching the original desktop toggle behaviour.
- Added unit coverage for the watchlist Go/Drop transition.

The latest full CI run passed, including the frontend build, Wrangler dry-run, reference data checks, and all calculation/feature test groups.

## Step 5 — shared calculations and utilities

Audited the original `util.py`, `helper.py`, `CRIP4/indicators.js`, and right-panel metric presentation logic against the existing TypeScript domain modules. Confirmed the following legacy calculations/utilities are already ported and covered by tests: normalization, EPS/sales FScore, quarterly growth clamping, expansion percentage, institutional cost scaling, market-cap-weighted relative strength, SMA/EMA/RSI/ULTM/ATP, screener query intersection/filtering/sorting, watchlist shortcuts, industry drilldown, PEG parsing, and NSE delivery rolling averages.

Added `frontend/src/domain/analysis/stockMetricPresentation.ts` to centralize the original `Tabs/rightpanel.py` metric colour thresholds. It returns semantic bands rather than hard-coded UI colours: RS/EPS 70/80; PE strictly between 0 and 25; ROE >=15; EPSGrowth >=25; MasterScore/AccDis/CashFlow/Stability 50/70. Unhandled fields such as ROCE, PEG, PB and NikScore remain neutral, matching the original right-panel method. Added boundary/invalid-input tests and wired them into the TypeScript test build and GitHub Actions.

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

CI now installs the root Worker toolchain, runs the root `npm run build`, executes `npx wrangler deploy --dry-run`, and runs all existing frontend test groups including the chart and provider diagnostics tests. The dry-run successfully bundled the Worker (17.06 KiB, 4.32 KiB gzip) and all CI test groups passed on commit `7f1754647fa7e42f421f6861073fa250fa0eec4b` (run `42366127997`). Cloudflare Workers Builds still reports a separate deployment-check failure for that commit. This confirms the source Worker/config can bundle locally in CI; it does not prove Cloudflare has deployed it.

**User action required to unblock live verification:** In Cloudflare Dashboard → Workers & Pages → `schcatnew` → Settings → Build, set Root directory to repository root (blank), Build command to `npm run build`, and Deploy command to `npx wrangler deploy`; save and retry/retrigger the build. The repo now has the root `package.json` and pinned Wrangler 4.158.0 required for this setup. Then provide the result/build log or say when it completes so live `/api/health` and provider checks can be run.

## Latest verified repository state
- Branch: `main`
- Latest Step 4 code/CI commit: `7f1754647fa7e42f421f6861073fa250fa0eec4b`
- CI run: `https://github.com/prudhviuday/SchCatNew/actions/runs/42366127997` — success, including root build and Wrangler dry-run.
- Cloudflare build: `https://dash.cloudflare.com/25cbd8f5e7df317d5d1f2bb3a94452f1/workers/services/view/schcatnew/production/builds/a3ece1a6-bf11-4bd3-b02b-3adc7b6e091b` — failed; exact reason not available in GitHub check summary. Cloudflare dashboard build settings need checking.

## Next action
Continue with **Step 7/14**: complete Chart screen parity against the original `Tabs/ChartTab.py` and chart engine, including interval panes, overlays, drawing/navigation behaviour, and chart data refresh.


## Step 12 — Portfolio (in progress)

Compared the original `Tabs/portfolioTab.py` with `Portfolio.tsx` and `portfolio.ts`. The desktop reads holdings from `util.getPortfolio()`, fetches Weekly, Daily, Hourly and 5-minute candles for each holding, converts each stock's OHLC into quantity-weighted unrealised P&L contribution (`quantity × (OHLC − buy price)`), aligns the union of timestamps, forward-fills each holding independently (zero before its first bar), sums volume, and limits the result to 800 points.

The web implementation already supports the four matching timeframes, the same synthetic OHLC/P&L aggregation, up to 800 bars, current-value/unrealised-P&L summaries, editable holdings, browser-local persistence, and CSV/JSON backup and restore. These are additional web conveniences; they do not change the legacy chart calculation.

Parity gap addressed: the desktop automatically reads the saved Portfolio sheet, but a first-time web visit previously started with an empty portfolio despite the migrated workbook snapshot. Added a validated parser for `legacyWorkbookData.json` and first-visit seeding from its `portfolio.holdings`. Existing browser-local holdings always take precedence, including an intentionally empty saved portfolio, so later visits do not overwrite user edits. Added tests for valid defaults, empty/missing snapshots, and invalid rows.

CI is pending for the latest Portfolio changes. Live chart prices still depend on the deployed same-origin Yahoo Worker route and upstream availability; automated tests do not prove live Yahoo access.

Browser test after deployment: open Portfolio in a fresh browser profile and confirm the two migrated workbook holdings appear; edit/add/remove a holding, reload and confirm local changes persist; refresh prices & charts and inspect all four timeframes; export JSON/CSV, then test merge and replace imports. In a browser that already has a saved portfolio, confirm the migrated defaults do not overwrite it.


## Step 13 — full parity and regression verification (in progress)

The full automated workflow passed after the Portfolio migration (GitHub Actions run `42473474421`): TypeScript/Vite production build, Wrangler Worker dry-run and asset binding validation, migrated workbook/reference data checks, and the complete feature/provider/integration test matrix. This run includes Chart, Industry Stocks, Industry Analysis, Research, Market Pulse, Portfolio, Yahoo, MarketSmith, ChartInk, NSE and Worker API tests.

A final cross-feature audit checked the frontend provider clients against the Worker route table:
- Yahoo chart candles use `GET /api/yahoo/chart`.
- MarketSmith symbol, finance and relative-strength clients use the matching authenticated Worker routes.
- ChartInk scan and historical backtest use `POST /api/chartink/scan` with distinct modes.
- NSE delivery uses `GET /api/nse/delivery`.
- Provider Diagnostics health checks expect the SchCatNew Worker identity and route inventory.
- Legacy workbook data is build-generated and shared by Stocks, Research and Portfolio; Industry Analysis snapshots remain static assets.
- Portfolio holdings and Industry Analysis results are browser-local; no private holdings are embedded into the published workbook snapshot.

Cross-module polish found and fixed stale visible ChartInk errors referring to the SchCatWeb Worker, the Portfolio footer's old product label, and an obsolete Portfolio error message that told users to check browser Yahoo CORS even though chart requests now use the same-origin Worker. MarketSmith's legacy local-storage key remains intentionally unchanged to preserve an existing saved browser session.

The full CI run above predates these final wording-only changes; a fresh CI run is pending. This step does not yet establish live provider availability or exact deployed Cloudflare URL behaviour. Those are reserved for Step 14.
