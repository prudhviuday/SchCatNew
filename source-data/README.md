# Archived SchCat source data

This folder contains source data copied from `prudhviuday/SchCat` on the `main` branch for the Step 2 migration. The original repository remains unchanged.

- `Book1.xlsx` and `ChartInkQs.xlsx` are the original Research, saved-query, watchlist and portfolio workbooks.
- `marketsmithidsall4.xlsx` and `Industrydata.xlsx` are the reference workbooks used by the desktop application. Their converted browser datasets already exist under `frontend/public/data` and retain the original source blob identifiers in the manifest.
- `IndustryAnalysis/` contains the nine saved JSON analysis snapshots. They are copied byte-for-byte and indexed during the frontend build.

The frontend build runs `tools/convert-legacy-workbooks.mjs` to create browser-readable JSON assets. This conversion does not include API credentials or MarketSmith session values.
