import type { MarketSmithFinanceData, MarketSmithLiveMetrics } from "../../data/providers/marketSmithStockData";
import { InstitutionalOwnershipChart, RevenueEpsHistoryChart, RoceHistoryChart } from "../charts/RightPanelQuickCharts";

export interface SelectedStockGraphsProps {
  symbol: string;
  status: "idle" | "loading" | "ready" | "partial" | "auth-required" | "error";
  finance: MarketSmithFinanceData | null;
  metrics: MarketSmithLiveMetrics | null;
  message: string;
  updatedAt: string | null;
}

export default function SelectedStockGraphs({
  symbol,
  status,
  finance,
  metrics,
  message,
  updatedAt
}: SelectedStockGraphsProps) {
  return (
    <section className="screener-detail-graphs" aria-label={symbol + " live company history graphs"}>
      {status !== "ready" && status !== "idle" && (
        <p className={"screener-detail-research-message " + status} role="status" aria-live="polite">
          {message || (status === "loading" ? "Loading company history…" : "Company history unavailable.")}
        </p>
      )}
      <article className="screener-detail-graph">
        <div className="screener-detail-graph-title"><strong>Annual ROCE</strong></div>
        <RoceHistoryChart points={finance?.annualRoce ?? []} />
      </article>
      <article className="screener-detail-graph">
        <div className="screener-detail-graph-title"><strong>Institutional ownership</strong></div>
        <InstitutionalOwnershipChart points={metrics?.institutionalOwnership ?? []} />
      </article>
      <article className="screener-detail-graph">
        <div className="screener-detail-graph-title"><strong>Revenue / EPS</strong></div>
        <RevenueEpsHistoryChart
          revenue={(finance?.annualRevenue ?? []).map((point) => ({ year: point.year, normalized: point.normalized }))}
          eps={(finance?.annualEps ?? []).map((point) => ({ year: point.year, normalized: point.normalized }))}
        />
      </article>
      {updatedAt && <p className="screener-detail-research-updated">Updated {updatedAt} · MarketSmith India</p>}
    </section>
  );
}
