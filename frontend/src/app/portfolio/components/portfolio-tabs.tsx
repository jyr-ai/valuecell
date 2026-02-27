import { useState } from "react";
import { useTranslation } from "react-i18next";
import { cn } from "@/lib/utils";
import type {
  ClosedPosition,
  PortfolioPosition,
  TradeRecord,
} from "@/lib/fidelity-csv-parser";
import { ClosedPositionsTable } from "./closed-positions-table";
import { PositionsTable } from "./positions-table";
import { TradesHistoryTable } from "./trades-history-table";

interface PortfolioTabsProps {
  positions: PortfolioPosition[];
  trades: TradeRecord[];
  closedPositions: ClosedPosition[] | null;
}

type TabId = "positions" | "trades" | "closed";

export function PortfolioTabs({
  positions,
  trades,
  closedPositions,
}: PortfolioTabsProps) {
  const { t } = useTranslation();
  const [activeTab, setActiveTab] = useState<TabId>("positions");

  const tabs: Array<{ id: TabId; label: string; count: number; show: boolean }> =
    (
      [
        {
          id: "positions" as TabId,
          label: t("portfolio.tabs.positions"),
          count: positions.length,
          show: true,
        },
        {
          id: "trades" as TabId,
          label: t("portfolio.tabs.trades"),
          count: trades.length,
          show: true,
        },
        {
          id: "closed" as TabId,
          label: t("portfolio.tabs.closed"),
          count: closedPositions?.length ?? 0,
          show: closedPositions !== null,
        },
      ] satisfies Array<{ id: TabId; label: string; count: number; show: boolean }>
    ).filter((tab) => tab.show);

  return (
    <div className="flex flex-col rounded-xl border border-border bg-card">
      {/* Tab bar */}
      <div className="flex gap-0 border-b border-border px-1 pt-1">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => setActiveTab(tab.id)}
            className={cn(
              "flex items-center gap-1.5 rounded-t-lg px-4 py-2.5 font-medium text-sm transition-colors",
              activeTab === tab.id
                ? "border border-b-0 border-border bg-background text-foreground"
                : "text-muted-foreground hover:text-foreground",
            )}
          >
            {tab.label}
            <span
              className={cn(
                "rounded-full px-1.5 py-0.5 text-xs",
                activeTab === tab.id
                  ? "bg-primary/10 text-primary"
                  : "bg-muted text-muted-foreground",
              )}
            >
              {tab.count}
            </span>
          </button>
        ))}
      </div>

      {/* Tab content */}
      <div className="p-4">
        {activeTab === "positions" && (
          <PositionsTable positions={positions} />
        )}
        {activeTab === "trades" && (
          <TradesHistoryTable trades={trades} />
        )}
        {activeTab === "closed" && closedPositions && (
          <ClosedPositionsTable positions={closedPositions} />
        )}
      </div>
    </div>
  );
}
