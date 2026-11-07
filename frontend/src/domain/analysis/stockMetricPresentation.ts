/**
 * Shared, provider-independent presentation rules ported from Tabs/rightpanel.py.
 *
 * The desktop right panel colours numeric stock metrics using fixed thresholds.
 * Keep these rules in the domain layer so every screen can present the same
 * metric consistently without embedding business logic in React components.
 */

export type StockMetricField =
  | "RS"
  | "EPS"
  | "PE"
  | "ROE"
  | "EPSGrowth"
  | "MasterScore"
  | "AccDis"
  | "CashFlow"
  | "Stability"
  | "ROCE"
  | "PEG"
  | "PB"
  | "NikScore";

export type MetricBand = "positive" | "warning" | "negative" | "neutral";
export type MetricValue = number | string | null | undefined;

function numericValue(value: MetricValue): number | null {
  if (value == null || (typeof value === "string" && value.trim() === "")) {
    return null;
  }
  const parsed = typeof value === "number" ? value : Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

/**
 * Exact threshold behaviour of RightPanel.get_color_for_field:
 * RS/EPS: <70 red, 70–<80 amber, >=80 green.
 * PE: green only when 0<PE<25.
 * ROE: green at >=15; EPSGrowth: green at >=25.
 * MasterScore/AccDis/CashFlow/Stability: >=70 green, >=50 amber, else red.
 * Fields not handled by the original method remain neutral.
 */
export function getStockMetricBand(
  field: StockMetricField | string,
  rawValue: MetricValue
): MetricBand {
  const value = numericValue(rawValue);
  if (value === null) return "neutral";

  if (field === "RS" || field === "EPS") {
    return value < 70 ? "negative" : value < 80 ? "warning" : "positive";
  }

  if (field === "PE") {
    return value > 0 && value < 25 ? "positive" : "negative";
  }

  if (field === "ROE") return value >= 15 ? "positive" : "negative";
  if (field === "EPSGrowth") return value >= 25 ? "positive" : "negative";

  if (["MasterScore", "AccDis", "CashFlow", "Stability"].includes(field)) {
    return value >= 70 ? "positive" : value >= 50 ? "warning" : "negative";
  }

  return "neutral";
}
