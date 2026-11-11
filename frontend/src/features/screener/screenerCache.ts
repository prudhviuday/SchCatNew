import type { MarketSmithLiveMetrics } from "../../data/providers/marketSmithStockData.js";
import type { ScreenerRow } from "./screener.js";

export interface ScreenerCacheSnapshot {
  schemaVersion: 1;
  savedAt: string;
  marketSmithUpdatedAt: string | null;
  nikUpdatedAt: string | null;
  marketSmithSummary: { succeeded: number; failed: number; skipped: number } | null;
  nikSummary: { succeeded: number; failed: number } | null;
  records: ScreenerRow[];
  liveMetrics: Record<string, MarketSmithLiveMetrics>;
}

const CACHE_ENDPOINT = "/api/screener/cache";

function asRecord(value: unknown): Record<string, unknown> | null {
  return value !== null && typeof value === "object" && !Array.isArray(value)
    ? value as Record<string, unknown>
    : null;
}

export async function loadScreenerCache(fetcher: typeof fetch = fetch): Promise<ScreenerCacheSnapshot | null> {
  const response = await fetcher(CACHE_ENDPOINT, {
    method: "GET",
    mode: "same-origin",
    credentials: "same-origin",
    headers: { Accept: "application/json" }
  });
  if (!response.ok) {
    let message = `Unable to load the server-side screener cache (HTTP ${response.status}).`;
    try {
      const body = asRecord(await response.json());
      if (typeof body?.message === "string") message = body.message;
    } catch {
      // Keep the stable fallback message for non-JSON errors.
    }
    throw new Error(message);
  }

  const body = asRecord(await response.json());
  const data = body?.data;
  if (data == null) return null;
  const snapshot = asRecord(data);
  if (
    !snapshot ||
    snapshot.schemaVersion !== 1 ||
    !Array.isArray(snapshot.records) ||
    !asRecord(snapshot.liveMetrics)
  ) {
    throw new TypeError("The saved server-side screener snapshot has an unsupported format.");
  }
  return snapshot as unknown as ScreenerCacheSnapshot;
}

export async function saveScreenerCache(
  snapshot: ScreenerCacheSnapshot,
  fetcher: typeof fetch = fetch
): Promise<void> {
  const payload = JSON.stringify(snapshot);
  const response = await fetcher(CACHE_ENDPOINT, {
    method: "PUT",
    mode: "same-origin",
    credentials: "same-origin",
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json"
    },
    body: payload
  });
  if (!response.ok) {
    let message = `Unable to save the server-side screener snapshot (HTTP ${response.status}).`;
    try {
      const body = asRecord(await response.json());
      if (typeof body?.message === "string") message = body.message;
      else if (body?.error === "screener_cache_not_configured") message = "Cloudflare KV is not configured for this Worker yet.";
    } catch {
      // Keep the stable fallback message for non-JSON errors.
    }
    throw new Error(message);
  }
}
