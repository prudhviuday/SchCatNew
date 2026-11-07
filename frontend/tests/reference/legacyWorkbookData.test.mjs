import test from "node:test";
import assert from "node:assert/strict";
import { readFile, access } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const testDir = path.dirname(fileURLToPath(import.meta.url));
const dataDir = path.resolve(testDir, "../../public/data");

async function readJson(name) {
  return JSON.parse(await readFile(path.join(dataDir, name), "utf8"));
}

test("legacy Excel workbooks are converted into browser-readable source data", async () => {
  const data = await readJson("legacyWorkbookData.json");
  assert.equal(data.schemaVersion, 1);
  assert.ok(Array.isArray(data.screenerLibrary.queries));
  assert.ok(Array.isArray(data.screenerLibrary.watchlists));
  assert.ok(Array.isArray(data.portfolio.holdings));
  assert.ok(Array.isArray(data.research.performanceSymbols));
  assert.ok(data.workbookMetadata.chartInkSheets.some((sheet) => sheet.name.toUpperCase() === "QUERIES"));
  assert.ok(data.workbookMetadata.chartInkSheets.some((sheet) => sheet.name.toUpperCase() === "WATCHLIST"));
  assert.ok(data.workbookMetadata.chartInkSheets.some((sheet) => sheet.name.toUpperCase() === "PORTFOLIO"));
});

test("all archived legacy Industry Analysis files are indexed and published unchanged", async () => {
  const index = await readJson("industryAnalysisIndex.json");
  assert.equal(index.schemaVersion, 1);
  assert.equal(index.count, 9);
  assert.equal(index.files.length, 9);
  for (const entry of index.files) {
    const filePath = path.join(dataDir, "industry-analysis", entry.fileName);
    await access(filePath);
    const raw = await readFile(filePath, "utf8");
    assert.ok(Array.isArray(JSON.parse(raw)), entry.fileName + " should remain the original array format");
    assert.equal(entry.url, "/data/industry-analysis/" + entry.fileName);
  }
});

test("legacy-data conversion report reconciles all imported data", async () => {
  const report = await readJson("legacy-data-report.json");
  const workbooks = await readJson("legacyWorkbookData.json");
  const history = await readJson("industryAnalysisIndex.json");
  assert.equal(report.industryHistoryFiles, history.files.length);
  assert.equal(report.savedQueries, workbooks.screenerLibrary.queries.length);
  assert.equal(report.watchlists, workbooks.screenerLibrary.watchlists.length);
  assert.equal(report.portfolioHoldings, workbooks.portfolio.holdings.length);
  assert.equal(report.performanceSymbols, workbooks.research.performanceSymbols.length);
});
