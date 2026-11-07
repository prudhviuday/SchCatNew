import type { MarketUniverseRecord } from "../../data/reference/marketUniverse.js";

export const MAX_ANALYSIS_STOCKS = 12;

/** Legacy AnalysisTab matches an industry or symbol by case-insensitive substring. */
export function filterAnalysisStocks(
  records: readonly MarketUniverseRecord[],
  query: string,
  limit = MAX_ANALYSIS_STOCKS
): MarketUniverseRecord[] {
  const needle = query.trim().toLocaleLowerCase();
  if (!needle) return [];
  const safeLimit = Number.isFinite(limit) ? Math.max(0, Math.min(MAX_ANALYSIS_STOCKS, Math.trunc(limit))) : MAX_ANALYSIS_STOCKS;
  return records.filter((record) =>
    (record.industry ?? "").toLocaleLowerCase().includes(needle) ||
    record.symbol.toLocaleLowerCase().includes(needle)
  ).slice(0, safeLimit);
}

export function getAnalysisIndustries(records: readonly MarketUniverseRecord[]): string[] {
  // The desktop tab populated its completer from the workbook's first-seen
  // industry order. Keep the market-universe order instead of alphabetically
  // sorting, so Right Arrow / "." cycles in a stable source order.
  const seen = new Set<string>();
  const industries: string[] = [];
  for (const record of records) {
    const industry = record.industry?.trim();
    if (!industry) continue;
    const key = industry.toLocaleLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    industries.push(industry);
  }
  return industries;
}

export function nextAnalysisIndustry(industries: readonly string[], current: string): string {
  if (industries.length === 0) return "";
  const index = industries.findIndex((industry) => industry.toLocaleLowerCase() === current.trim().toLocaleLowerCase());
  return industries[index < 0 ? 0 : (index + 1) % industries.length];
}


/** Exact industry routing from the screener; preserves the legacy twelve-chart limit. */
export function filterAnalysisStocksByIndustry(
  records: readonly MarketUniverseRecord[],
  industry: string
): MarketUniverseRecord[] {
  const target = industry.trim().toLocaleLowerCase();
  if (!target) return [];
  return records.filter((record) =>
    (record.industry ?? "").trim().toLocaleLowerCase() === target ||
    (record.sector ?? "").trim().toLocaleLowerCase() === target
  ).slice(0, MAX_ANALYSIS_STOCKS);
}


export type AnalysisChartTimeframe = "1D" | "1W";
export type AnalysisChartRange = "3M" | "6M" | "1Y" | "2Y" | "5Y";

const ANALYSIS_RANGE_DAYS: Record<AnalysisChartRange, number> = {
  "3M": 90,
  "6M": 180,
  "1Y": 365,
  "2Y": 730,
  "5Y": 1825
};

/** Date ranges mirror the daily/weekly history available through the existing Yahoo chart route. */
export function getAnalysisChartRanges(timeframe: AnalysisChartTimeframe): readonly AnalysisChartRange[] {
  return timeframe === "1D"
    ? ["3M", "6M", "1Y", "2Y"]
    : ["1Y", "2Y", "5Y"];
}

/** Return an epoch-seconds cutoff for the gallery's selected visible range. */
export function getAnalysisRangeStart(range: AnalysisChartRange, nowMs = Date.now()): number {
  return Math.floor(nowMs / 1000) - ANALYSIS_RANGE_DAYS[range] * 24 * 60 * 60;
}
