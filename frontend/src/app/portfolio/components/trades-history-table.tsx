import { useState } from "react";
import { useTranslation } from "react-i18next";
import { cn } from "@/lib/utils";
import type { TradeRecord } from "@/lib/fidelity-csv-parser";

function formatCurrency(v: number): string {
  if (v === 0) return "—";
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(v);
}

/** Returns a colour class based on buy/sell/dividend action strings */
function actionColorClass(action: string): string {
  const lower = action.toLowerCase();
  if (lower.includes("bought") || lower.includes("buy")) {
    return "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400";
  }
  if (lower.includes("sold") || lower.includes("sell")) {
    return "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400";
  }
  if (lower.includes("dividend") || lower.includes("reinvest")) {
    return "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400";
  }
  return "bg-muted text-muted-foreground";
}

interface TradesHistoryTableProps {
  trades: TradeRecord[];
}

const PAGE_SIZE = 25;

export function TradesHistoryTable({ trades }: TradesHistoryTableProps) {
  const { t } = useTranslation();
  const [filter, setFilter] = useState("");
  const [page, setPage] = useState(0);

  const filtered = trades.filter((tr) => {
    const q = filter.toLowerCase();
    return (
      tr.symbol.toLowerCase().includes(q) ||
      tr.action.toLowerCase().includes(q) ||
      tr.securityDescription.toLowerCase().includes(q)
    );
  });

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const currentPage = Math.min(page, totalPages - 1);
  const paginated = filtered.slice(
    currentPage * PAGE_SIZE,
    currentPage * PAGE_SIZE + PAGE_SIZE,
  );

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center gap-2">
        <input
          type="text"
          value={filter}
          onChange={(e) => {
            setFilter(e.target.value);
            setPage(0);
          }}
          placeholder={t("portfolio.trades.filterPlaceholder")}
          className={cn(
            "h-8 w-56 rounded-md border border-border bg-background px-3 text-sm",
            "placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary",
          )}
        />
        <span className="text-muted-foreground text-xs">
          {filtered.length} {t("portfolio.trades.records")}
        </span>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border">
              <th className="whitespace-nowrap px-3 py-2.5 text-left font-medium text-muted-foreground text-xs">
                {t("portfolio.trades.date")}
              </th>
              <th className="whitespace-nowrap px-3 py-2.5 text-left font-medium text-muted-foreground text-xs">
                {t("portfolio.trades.action")}
              </th>
              <th className="whitespace-nowrap px-3 py-2.5 text-left font-medium text-muted-foreground text-xs">
                {t("portfolio.trades.symbol")}
              </th>
              <th className="whitespace-nowrap px-3 py-2.5 text-left font-medium text-muted-foreground text-xs">
                {t("portfolio.trades.description")}
              </th>
              <th className="whitespace-nowrap px-3 py-2.5 text-right font-medium text-muted-foreground text-xs">
                {t("portfolio.trades.qty")}
              </th>
              <th className="whitespace-nowrap px-3 py-2.5 text-right font-medium text-muted-foreground text-xs">
                {t("portfolio.trades.price")}
              </th>
              <th className="whitespace-nowrap px-3 py-2.5 text-right font-medium text-muted-foreground text-xs">
                {t("portfolio.trades.amount")}
              </th>
              <th className="whitespace-nowrap px-3 py-2.5 text-right font-medium text-muted-foreground text-xs">
                {t("portfolio.trades.fees")}
              </th>
              <th className="whitespace-nowrap px-3 py-2.5 text-left font-medium text-muted-foreground text-xs">
                {t("portfolio.trades.settlement")}
              </th>
            </tr>
          </thead>
          <tbody>
            {paginated.map((tr, idx) => (
              <tr
                // biome-ignore lint/suspicious/noArrayIndexKey: trade records have no unique id
                key={idx}
                className="border-b border-border/50 transition-colors hover:bg-muted/30"
              >
                <td className="whitespace-nowrap px-3 py-2 text-muted-foreground tabular-nums text-xs">
                  {tr.runDate}
                </td>
                <td className="px-3 py-2">
                  <span
                    className={cn(
                      "inline-block rounded-full px-2 py-0.5 text-xs font-medium",
                      actionColorClass(tr.action),
                    )}
                  >
                    {tr.action}
                  </span>
                </td>
                <td className="whitespace-nowrap px-3 py-2 font-semibold text-foreground">
                  {tr.symbol || "—"}
                </td>
                <td className="max-w-[200px] truncate px-3 py-2 text-muted-foreground text-xs">
                  {tr.securityDescription}
                </td>
                <td className="px-3 py-2 text-right tabular-nums">
                  {tr.quantity !== 0
                    ? tr.quantity.toLocaleString("en-US", {
                        maximumFractionDigits: 4,
                      })
                    : "—"}
                </td>
                <td className="px-3 py-2 text-right tabular-nums">
                  {tr.price !== 0 ? formatCurrency(tr.price) : "—"}
                </td>
                <td
                  className={cn(
                    "px-3 py-2 text-right font-medium tabular-nums",
                    tr.amount > 0
                      ? "text-green-600 dark:text-green-400"
                      : tr.amount < 0
                        ? "text-red-600 dark:text-red-400"
                        : "text-muted-foreground",
                  )}
                >
                  {formatCurrency(tr.amount)}
                </td>
                <td className="px-3 py-2 text-right tabular-nums text-muted-foreground text-xs">
                  {tr.fees !== 0 ? formatCurrency(tr.fees) : "—"}
                </td>
                <td className="whitespace-nowrap px-3 py-2 text-muted-foreground text-xs">
                  {tr.settlementDate || "—"}
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {filtered.length === 0 && (
          <div className="flex items-center justify-center py-12 text-muted-foreground text-sm">
            {t("portfolio.trades.empty")}
          </div>
        )}
      </div>

      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <button
            type="button"
            onClick={() => setPage((p) => Math.max(0, p - 1))}
            disabled={currentPage === 0}
            className="rounded-md border border-border px-3 py-1 text-xs disabled:opacity-40 hover:bg-muted"
          >
            {t("portfolio.trades.prev")}
          </button>
          <span className="text-muted-foreground text-xs">
            {t("portfolio.trades.pageOf", {
              current: currentPage + 1,
              total: totalPages,
            })}
          </span>
          <button
            type="button"
            onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
            disabled={currentPage === totalPages - 1}
            className="rounded-md border border-border px-3 py-1 text-xs disabled:opacity-40 hover:bg-muted"
          >
            {t("portfolio.trades.next")}
          </button>
        </div>
      )}
    </div>
  );
}
