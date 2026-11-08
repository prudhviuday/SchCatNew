# SchCatNew

A Cloudflare-hosted rebuild of the SchCat desktop stock-analysis terminal.

## Production deployment

The application is served by the Cloudflare Worker configured in the repository root `wrangler.toml`. The Worker serves the built React app from `frontend/dist` and handles same-origin `/api/*` requests for Yahoo Finance, MarketSmith, ChartInk and NSE. **Do not publish `frontend/dist` to a static-only host**: doing so bypasses the API Worker and live provider requests will not work.

The Cloudflare Workers Builds configuration for this repository should use:
- Root directory: repository root
- Build command: `npm run build`
- Deploy command: `npx wrangler deploy`

The build command generates the legacy workbook JSON snapshot and builds the frontend; the deploy command publishes the Worker and its static assets together. A successful local/CI dry-run validates the bundle but does not by itself prove the deployed URL or live upstream providers are working.

## Local development

1. Install Node.js LTS.
2. From the repository root, run `npm install`.
3. Run `npm run build` to build the frontend and Worker assets.
4. Run `npm run preview` to start the local Wrangler Worker preview.

No database is required. The deployed app does not need a local Python process, local Node server or manually configured API base URL.

## Included modules

Stocks screener, stock charts/workspace, multi-stock industry charts, Industry Analysis, Research/Querys, Market Pulse and Portfolio.

## Data and provider limitations

The original workbook data is a migrated snapshot generated at build time; it is not refreshed automatically from the original desktop files. Industry Analysis history snapshots are also archived source data.

Live Yahoo Finance, MarketSmith, ChartInk and NSE data depends on the upstream providers. MarketSmith requests require a valid current browser `ms-auth` session saved through Provider Diagnostics. A provider failure must be shown as unavailable; the app must not fabricate live values.

Portfolio holdings and Industry Analysis results are stored in the user's browser local storage unless explicitly exported. Private holdings and credentials are not included in the repository or published workbook snapshot.
