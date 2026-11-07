import assert from "node:assert/strict";
import test from "node:test";
import {
  MARKET_PULSE_COLUMNS,
  MARKET_PULSE_QUERY,
  getMarketPulseCellColor,
  getMarketPulseTextColor,
  parseMarketPulseResponse
} from "../../.test-dist/features/marketPulse/marketPulse.js";

function fixture() {
  const timestamps = [Date.UTC(2026, 10, 4), Date.UTC(2026, 10, 5)];
  const keys = MARKET_PULSE_COLUMNS.slice(1);
  return {
    metaData: [{ tradeTimes: timestamps }],
    groupData: [{
      results: keys.map((key, index) => ({
        [key]: index === 2 ? [1.26, 4.04] : [index + 10, index + 20]
      }))
    }]
  };
}

test("Market Pulse query is the original ChartInk dashboard query", () => {
  assert.match(MARKET_PULSE_QUERY, /as '4% bull'/);
  assert.match(MARKET_PULSE_QUERY, /as '34\/13 bear'/);
  assert.match(MARKET_PULSE_QUERY, /weekly buyer initiated trades/);
});

test("response parser maps all 12 metric groups and reverses dates newest first", () => {
  const rows = parseMarketPulseResponse(fixture());
  assert.equal(rows.length, 2);
  assert.equal(rows[0].Date, "05-11-2026");
  assert.equal(rows[1].Date, "04-11-2026");
  assert.equal(rows[0]["4% bull"], 20);
  assert.equal(rows[0]["5-day ratio"], 4);
  assert.equal(rows[1]["5-day ratio"], 1.3);
  assert.equal(Object.keys(rows[0]).length, 13);
});

test("response parser rejects missing metric groups and inconsistent arrays", () => {
  assert.throws(() => parseMarketPulseResponse({ metaData: [{ tradeTimes: [1] }], groupData: [{ results: [] }] }), /missing dashboard/);
  const bad = fixture();
  bad.groupData[0].results[0]["4% bull"] = [1];
  assert.throws(() => parseMarketPulseResponse(bad), /inconsistent/);
  const missing = fixture();
  missing.groupData[0].results[0]["4% bull"][0] = null;
  assert.throws(() => parseMarketPulseResponse(missing), /missing value/);
});

test("cell colours preserve desktop inclusive rule ordering and neutral gaps", () => {
  assert.equal(getMarketPulseCellColor("4% bull", 170), "#339966");
  assert.equal(getMarketPulseCellColor("4% bull", 50), "#F4CCCC");
  assert.equal(getMarketPulseCellColor("4% bull", 68), "#FFFFFF");
  assert.equal(getMarketPulseCellColor("5-day ratio", 1.2), "#F4CCCC");
  assert.equal(getMarketPulseCellColor("q25 bear", 500), "#E06666");
  assert.equal(getMarketPulseCellColor("Date", "05-11-2026"), "#FFFFFF");
});

test("cell text contrast follows the desktop luminance threshold", () => {
  assert.equal(getMarketPulseTextColor("#FFFFFF"), "#000000");
  assert.equal(getMarketPulseTextColor("#339966"), "#FFFFFF");
  assert.equal(getMarketPulseTextColor("invalid"), "#000000");
});


test("blank and missing metric values remain neutral instead of being treated as zero", () => {
  assert.equal(getMarketPulseCellColor("4% bull", null), "#FFFFFF");
  assert.equal(getMarketPulseCellColor("4% bull", undefined), "#FFFFFF");
  assert.equal(getMarketPulseCellColor("4% bull", ""), "#FFFFFF");
  assert.equal(getMarketPulseCellColor("4% bull", "   "), "#FFFFFF");
});

test("Market Pulse fetch uses the same-origin Worker widget route and desktop parameters", async () => {
  let requestedUrl = "";
  let requestOptions;
  const result = await fetchMarketPulse(undefined, async (url, options) => {
    requestedUrl = String(url);
    requestOptions = options;
    return new Response(JSON.stringify(fixture()), {
      status: 200,
      headers: { "content-type": "application/json" }
    });
  });
  assert.equal(requestedUrl, "/api/chartink/scan");
  assert.equal(requestOptions.method, "POST");
  assert.equal(requestOptions.mode, "same-origin");
  assert.equal(requestOptions.credentials, "same-origin");
  const body = JSON.parse(requestOptions.body);
  assert.equal(body.mode, "widget");
  assert.equal(body.query, MARKET_PULSE_QUERY);
  assert.equal(body.use_live, true);
  assert.equal(body.limit, 6);
  assert.equal(body.size, 375);
  assert.equal(result.rows.length, 2);
  assert.ok(Number.isFinite(Date.parse(result.fetchedAt)));
});

test("Market Pulse fetch surfaces Worker HTTP errors without substituting sample data", async () => {
  await assert.rejects(
    fetchMarketPulse(undefined, async () => new Response(
      JSON.stringify({ error: "chartink_csrf_token_missing", message: "ChartInk CSRF unavailable" }),
      { status: 502, headers: { "content-type": "application/json" } }
    )),
    /ChartInk CSRF unavailable/
  );
});
