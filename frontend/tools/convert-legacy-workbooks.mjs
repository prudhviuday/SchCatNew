import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import readExcelFile from "read-excel-file/node";

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(scriptDir, "../..");
const sourceDir = path.join(repoRoot, "source-data");
const outputDir = path.join(repoRoot, "frontend", "public", "data");
const industrySourceDir = path.join(sourceDir, "IndustryAnalysis");
const industryOutputDir = path.join(outputDir, "industry-analysis");

function safeText(value) {
  if (value === null || value === undefined) return "";
  if (value instanceof Date && Number.isFinite(value.getTime())) return value.toISOString();
  return String(value).trim();
}

async function readWorkbook(filename) {
  const fullPath = path.join(sourceDir, filename);
  if (!fs.existsSync(fullPath)) throw new Error("Missing archived source workbook: " + fullPath);
  const sheetEntries = await readExcelFile(fullPath);
  const sheets = Object.fromEntries(sheetEntries.map((entry) => [entry.sheet, entry.data]));
  return { sheetNames: sheetEntries.map((entry) => entry.sheet), sheets };
}

function normalizedHeader(value) {
  return safeText(value).toLocaleLowerCase().replace(/[^a-z0-9]/g, "");
}

function findColumn(headers, candidates) {
  const normalized = headers.map(normalizedHeader);
  for (const candidate of candidates) {
    const index = normalized.indexOf(normalizedHeader(candidate));
    if (index >= 0) return index;
  }
  return -1;
}

function nonEmptyRows(rows) {
  return rows.filter((row) => row.some((value) => safeText(value) !== ""));
}

function exportQueries(rows) {
  if (!rows.length) return { headers: [], queries: [], warnings: ["QUERIES sheet is empty."] };
  const headers = rows[0].map(safeText);
  // The original desktop code uses dataframe columns 1 and 2 as query name/code.
  // Prefer their headers when available, while retaining those positional fallbacks.
  const nameIndex = findColumn(headers, ["QueryName", "Name", "Query"]);
  const codeIndex = findColumn(headers, ["QueryCode", "Query Clause", "Clause", "Code"]);
  const resolvedNameIndex = nameIndex >= 0 ? nameIndex : (headers.length > 1 ? 1 : 0);
  const resolvedCodeIndex = codeIndex >= 0 ? codeIndex : (headers.length > 2 ? 2 : -1);
  const queries = [];
  const warnings = [];
  for (const [offset, row] of rows.slice(1).entries()) {
    const name = safeText(row[resolvedNameIndex]);
    const code = safeText(row[resolvedCodeIndex]);
    if (!name && !code) continue;
    if (!name || !code) {
      warnings.push("Skipped incomplete query row " + (offset + 2) + ".");
      continue;
    }
    queries.push({ name, code, queryCode: code, symbols: [] });
  }
  const duplicateNames = new Set();
  const seen = new Set();
  for (const query of queries) {
    const key = query.name.toLocaleLowerCase();
    if (seen.has(key)) duplicateNames.add(query.name);
    seen.add(key);
  }
  if (duplicateNames.size) warnings.push("Duplicate query names: " + [...duplicateNames].join(", "));
  return { headers, queries, warnings, nameColumn: resolvedNameIndex, codeColumn: resolvedCodeIndex };
}

function exportWatchlists(rows) {
  if (!rows.length) return { headers: [], watchlists: [], warnings: ["Watchlist sheet is empty."] };
  const headers = rows[0].map(safeText);
  const watchlists = [];
  const warnings = [];
  headers.forEach((rawName, columnIndex) => {
    const name = rawName;
    if (!name) return;
    const symbols = [];
    for (const row of rows.slice(1)) {
      const symbol = safeText(row[columnIndex]).toUpperCase();
      if (symbol && !symbols.includes(symbol)) symbols.push(symbol);
    }
    watchlists.push({ name, symbols });
  });
  if (!watchlists.length) warnings.push("No named watchlist columns were found.");
  return { headers, watchlists, warnings };
}

function exportPortfolio(rows) {
  if (!rows.length) return { headers: [], holdings: [], warnings: ["Portfolio sheet is empty."] };
  const headers = rows[0].map(safeText);
  const symbolIndex = findColumn(headers, ["Stock", "Symbol", "Ticker"]);
  const quantityIndex = findColumn(headers, ["Qty", "Quantity", "Shares"]);
  const buyPriceIndex = findColumn(headers, ["Buy price", "BuyPrice", "Purchase price", "Average buy price"]);
  const indices = {
    symbol: symbolIndex >= 0 ? symbolIndex : 0,
    quantity: quantityIndex >= 0 ? quantityIndex : 1,
    buyPrice: buyPriceIndex >= 0 ? buyPriceIndex : 2
  };
  const holdings = [];
  const warnings = [];
  for (const [offset, row] of rows.slice(1).entries()) {
    const symbol = safeText(row[indices.symbol]).toUpperCase();
    if (!symbol) continue;
    const quantity = Number(row[indices.quantity]);
    const buyPrice = Number(row[indices.buyPrice]);
    if (!Number.isFinite(quantity) || quantity <= 0 || !Number.isFinite(buyPrice) || buyPrice < 0) {
      warnings.push("Skipped invalid portfolio row " + (offset + 2) + " for " + symbol + ".");
      continue;
    }
    holdings.push({ symbol, quantity, buyPrice });
  }
  return { headers, holdings, warnings, columns: indices };
}

function exportPerformance(rows) {
  if (!rows.length) return { sheetName: null, headers: [], performanceSymbols: [], warnings: ["Performance workbook is empty."] };
  const headers = rows[0].map(safeText);
  let symbolIndex = findColumn(headers, ["Stock", "Symbol", "Ticker", "NSE Code"]);
  if (symbolIndex < 0) symbolIndex = 0;
  const performanceSymbols = [];
  for (const row of rows.slice(1)) {
    const symbol = safeText(row[symbolIndex]).toUpperCase();
    if (symbol && /^[A-Z0-9&._-]+$/.test(symbol) && !performanceSymbols.includes(symbol)) {
      performanceSymbols.push(symbol);
    }
  }
  return {
    headers,
    symbolColumn: symbolIndex,
    performanceSymbols,
    warnings: performanceSymbols.length ? [] : ["No performance symbols could be identified."]
  };
}

fs.mkdirSync(outputDir, { recursive: true });
const queryBook = await readWorkbook("ChartInkQs.xlsx");
const querySheetName = queryBook.sheetNames.find((name) => name.trim().toUpperCase() === "QUERIES");
const watchlistSheetName = queryBook.sheetNames.find((name) => name.trim().toUpperCase() === "WATCHLIST");
const portfolioSheetName = queryBook.sheetNames.find((name) => name.trim().toUpperCase() === "PORTFOLIO");
if (!querySheetName || !watchlistSheetName || !portfolioSheetName) {
  throw new Error("ChartInkQs.xlsx must contain QUERIES, Watchlist and Portfolio sheets. Found: " + queryBook.sheetNames.join(", "));
}
const queryData = exportQueries(queryBook.sheets[querySheetName]);
const watchlistData = exportWatchlists(queryBook.sheets[watchlistSheetName]);
const portfolioData = exportPortfolio(queryBook.sheets[portfolioSheetName]);

const performanceBook = await readWorkbook("Book1.xlsx");
const performanceSheetName = performanceBook.sheetNames[0];
const performanceData = exportPerformance(performanceBook.sheets[performanceSheetName] ?? []);

const legacyWorkbookData = {
  schemaVersion: 1,
  source: {
    repository: "prudhviuday/SchCat",
    workbooks: {
      "ChartInkQs.xlsx": { path: "data/ChartInkQs.xlsx", blobSha: "8cfe0564de29cdf0bb0b9698bc16d7fc6c0d1311" },
      "Book1.xlsx": { path: "data/Book1.xlsx", blobSha: "1bbefe1d552073d87fc97d80217cea73675cda9e" }
    },
    note: "Imported as a dated source snapshot. It is not refreshed automatically from the original desktop files."
  },
  screenerLibrary: {
    version: 1,
    queries: queryData.queries,
    watchlists: watchlistData.watchlists
  },
  portfolio: {
    schemaVersion: 1,
    holdings: portfolioData.holdings
  },
  research: {
    performanceSymbols: performanceData.performanceSymbols,
    queries: queryData.queries.map(({ name, code }) => ({ name, code }))
  },
  workbookMetadata: {
    chartInkSheets: queryBook.sheetNames.map((name) => ({
      name, rowCount: queryBook.sheets[name].length,
      headers: (queryBook.sheets[name][0] ?? []).map(safeText)
    })),
    performanceSheet: {
      name: performanceSheetName,
      rowCount: (performanceBook.sheets[performanceSheetName] ?? []).length,
      headers: performanceData.headers
    },
    queryColumns: { name: queryData.nameColumn, code: queryData.codeColumn },
    portfolioColumns: portfolioData.columns
  },
  warnings: [
    ...queryData.warnings.map((message) => "QUERIES: " + message),
    ...watchlistData.warnings.map((message) => "Watchlist: " + message),
    ...portfolioData.warnings.map((message) => "Portfolio: " + message),
    ...performanceData.warnings.map((message) => "Book1: " + message)
  ]
};
fs.writeFileSync(path.join(outputDir, "legacyWorkbookData.json"), JSON.stringify(legacyWorkbookData, null, 2) + "\n");

if (!fs.existsSync(industrySourceDir)) throw new Error("Missing archived IndustryAnalysis history directory.");
fs.rmSync(industryOutputDir, { recursive: true, force: true });
fs.mkdirSync(industryOutputDir, { recursive: true });
const industryFiles = fs.readdirSync(industrySourceDir).filter((name) => name.toLowerCase().endsWith(".json")).sort();
if (industryFiles.length === 0) throw new Error("No saved Industry Analysis JSON files were found.");
const industryIndex = {
  schemaVersion: 1,
  sourceRepository: "prudhviuday/SchCat",
  count: industryFiles.length,
  files: []
};
for (const filename of industryFiles) {
  const sourcePath = path.join(industrySourceDir, filename);
  const parsed = JSON.parse(fs.readFileSync(sourcePath, "utf8"));
  if (!Array.isArray(parsed)) throw new Error("Legacy industry result is not an array: " + filename);
  const emptyIndustryRows = parsed.filter((row) => Array.isArray(row) && safeText(row[0]) === "").length;
  const malformedRows = parsed.filter((row) => !Array.isArray(row) || row.length < 5).length;
  const outputPath = path.join(industryOutputDir, filename);
  fs.copyFileSync(sourcePath, outputPath);
  industryIndex.files.push({
    fileName: filename,
    url: "/data/industry-analysis/" + filename,
    industryRows: parsed.length,
    emptyIndustryRows,
    malformedRows
  });
}
fs.writeFileSync(path.join(outputDir, "industryAnalysisIndex.json"), JSON.stringify(industryIndex, null, 2) + "\n");

const conversionReport = {
  schemaVersion: 1,
  sourceFiles: ["source-data/Book1.xlsx", "source-data/ChartInkQs.xlsx", "source-data/marketsmithidsall4.xlsx", "source-data/Industrydata.xlsx"],
  marketUniverse: { records: 2256, industries: 107, sourceAlreadyConverted: true },
  savedQueries: queryData.queries.length,
  watchlists: watchlistData.watchlists.length,
  watchlistSymbols: watchlistData.watchlists.reduce((total, item) => total + item.symbols.length, 0),
  portfolioHoldings: portfolioData.holdings.length,
  performanceSymbols: performanceData.performanceSymbols.length,
  industryHistoryFiles: industryFiles.length,
  industryHistoryRows: industryIndex.files.reduce((total, file) => total + file.industryRows, 0),
  warnings: legacyWorkbookData.warnings,
  outputs: ["/data/legacyWorkbookData.json", "/data/industryAnalysisIndex.json", ...industryIndex.files.map((file) => file.url)]
};
fs.writeFileSync(path.join(outputDir, "legacy-data-report.json"), JSON.stringify(conversionReport, null, 2) + "\n");
console.log(JSON.stringify(conversionReport, null, 2));
