import test from "node:test";
import assert from "node:assert/strict";
import { getStockMetricBand } from "../../.test-dist/domain/analysis/stockMetricPresentation.js";

test("RS and EPS use the desktop 70/80 thresholds", () => {
  assert.equal(getStockMetricBand("RS", 69.99), "negative");
  assert.equal(getStockMetricBand("RS", 70), "warning");
  assert.equal(getStockMetricBand("EPS", 79.99), "warning");
  assert.equal(getStockMetricBand("EPS", 80), "positive");
});

test("PE is positive only strictly between zero and 25", () => {
  assert.equal(getStockMetricBand("PE", 0), "negative");
  assert.equal(getStockMetricBand("PE", 0.01), "positive");
  assert.equal(getStockMetricBand("PE", 24.99), "positive");
  assert.equal(getStockMetricBand("PE", 25), "negative");
});

test("ROE and EPS growth preserve their independent thresholds", () => {
  assert.equal(getStockMetricBand("ROE", 14.99), "negative");
  assert.equal(getStockMetricBand("ROE", 15), "positive");
  assert.equal(getStockMetricBand("EPSGrowth", 24.99), "negative");
  assert.equal(getStockMetricBand("EPSGrowth", 25), "positive");
});

test("score-like metrics use 50/70 thresholds", () => {
  for (const field of ["MasterScore", "AccDis", "CashFlow", "Stability"]) {
    assert.equal(getStockMetricBand(field, 49.99), "negative");
    assert.equal(getStockMetricBand(field, 50), "warning");
    assert.equal(getStockMetricBand(field, 69.99), "warning");
    assert.equal(getStockMetricBand(field, 70), "positive");
  }
});

test("numeric strings are accepted and invalid or unhandled fields stay neutral", () => {
  assert.equal(getStockMetricBand("RS", "80"), "positive");
  assert.equal(getStockMetricBand("RS", ""), "neutral");
  assert.equal(getStockMetricBand("RS", null), "neutral");
  assert.equal(getStockMetricBand("RS", Number.NaN), "neutral");
  assert.equal(getStockMetricBand("ROCE", 30), "neutral");
  assert.equal(getStockMetricBand("unknown", 99), "neutral");
});
