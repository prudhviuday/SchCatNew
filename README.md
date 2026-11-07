# SchCatNew

A portable, static-hosted rebuild of the SchCat desktop stock-analysis terminal.

## Run it
1. Install Node.js (LTS) once.
2. Open a terminal in `frontend`.
3. Run `npm install`, then `npm run build`.
4. Publish the contents of `frontend/dist` to any static host. No database, Worker, backend, API secret, environment variable, or hosting-specific runtime is required.

For local development: `cd frontend && npm install && npm run dev`.

## Included modules
Stocks screener, stock charts/workspace, multi-stock industry charts, industry analysis, Research/Querys, Market Pulse, and Portfolio. The migrated calculations and deterministic tests are retained from SchCatWeb; the original Python repository remains unchanged.

## Live data limitation
Static browser apps cannot bypass provider CORS, authentication, or anti-bot restrictions. Yahoo, MarketSmith, ChartInk and NSE availability depends on each provider permitting browser access. When a provider blocks access, SchCatNew must show an explicit unavailable state; it must never fabricate live values. Reference workbook data is a dated/undated snapshot as identified in the UI, not live market data. Portfolio and user files remain in this browser unless exported.

No credentials or private sessions are included in this repository.
