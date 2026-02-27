import { useTranslation } from "react-i18next";
import { cn } from "@/lib/utils";
import type { ClosedPosition } from "@/lib/fidelity-csv-parser";

function formatCurrency(v: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(v);
}

function GainCell({ value }: { value: number }) {
  const isPositive = value > 0;
  const isNeutral = value === 0;
  return (
    <span
      className={cn(
        "font-medium tabular-nums",
        isPositive && "text-green-600 dark:text-green-400",
        !isPositive && !isNeutral && "text-red-600 dark:text-red-400",
        isNeutral && "text-muted-foreground",
      )}
    >
      {formatCurrency(value)}
    </span>
  );
}

interface ClosedPositionsTableProps {
  positions: ClosedPosition[];
}

export function ClosedPositionsTable({ positions }: ClosedPositionsTableProps) {
  const { t } = useTranslation();

  // Sort by total gain/loss descending
  const sorted = [...positions].sort(
    (a, b) => b.totalGainLoss - a.totalGainLoss,
  );

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-border">
            <th className="whitespace-nowrap px-3 py-2.5 text-left font-medium text-muted-foreground text-xs">
              {t("portfolio.closed.symbol")}
            </th>
            <th className="whitespace-nowrap px-3 py-2.5 text-left font-medium text-muted-foreground text-xs">
              {t("portfolio.closed.description")}
            </th>
            <th className="whitespace-nowrap px-3 py-2.5 text-right font-medium text-muted-foreground text-xs">
              {t("portfolio.closed.costBasis")}
            </th>
            <th className="whitespace-nowrap px-3 py-2.5 text-right font-medium text-muted-foreground text-xs">
              {t("portfolio.closed.proceeds")}
            </th>
            <th className="whitespace-nowrap px-3 py-2.5 text-right font-medium text-muted-foreground text-xs">
              {t("portfolio.closed.shortTermGL")}
            </th>
            <th className="whitespace-nowrap px-3 py-2.5 text-right font-medium text-muted-foreground text-xs">
              {t("portfolio.closed.longTermGL")}
            </th>
            <th className="whitespace-nowrap px-3 py-2.5 text-right font-medium text-muted-foreground text-xs">
              {t("portfolio.closed.totalGL")}
            </th>
          </tr>
        </thead>
        <tbody>
          {sorted.map((pos, idx) => (
            <tr
              // biome-ignore lint/suspicious/noArrayIndexKey: closed positions don't have a unique id
              key={idx}
              className="border-b border-border/50 transition-colors hover:bg-muted/30"
            >
              <td className="whitespace-nowrap px-3 py-2.5 font-semibold text-foreground">
                {pos.symbol}
              </td>
              <td className="max-w-[220px] truncate px-3 py-2.5 text-muted-foreground text-xs">
                {pos.description}
              </td>
              <td className="px-3 py-2.5 text-right tabular-nums text-muted-foreground">
                {formatCurrency(pos.costBasis)}
              </td>
              <td className="px-3 py-2.5 text-right tabular-nums">
                {formatCurrency(pos.proceeds)}
              </td>
              <td className="px-3 py-2.5 text-right">
                {pos.shortTermGainLoss !== 0 ? (
                  <GainCell value={pos.shortTermGainLoss} />
                ) : (
                  <span className="text-muted-foreground">—</span>
                )}
              </td>
              <td className="px-3 py-2.5 text-right">
                {pos.longTermGainLoss !== 0 ? (
                  <GainCell value={pos.longTermGainLoss} />
                ) : (
                  <span className="text-muted-foreground">—</span>
                )}
              </td>
              <td className="px-3 py-2.5 text-right">
                <GainCell value={pos.totalGainLoss} />
              </td>
            </tr>
          ))}
        </tbody>

        {/* Totals row */}
        {positions.length > 0 && (() => {
          const totalCostBasis = positions.reduce((s, p) => s + p.costBasis, 0);
          const totalProceeds = positions.reduce((s, p) => s + p.proceeds, 0);
          const totalST = positions.reduce((s, p) => s + p.shortTermGainLoss, 0);
          const totalLT = positions.reduce((s, p) => s + p.longTermGainLoss, 0);
          const totalGL = positions.reduce((s, p) => s + p.totalGainLoss, 0);
          return (
            <tfoot>
              <tr className="border-t-2 border-border bg-muted/20">
                <td className="px-3 py-2.5 font-bold text-foreground text-xs uppercase tracking-wide" colSpan={2}>
                  {t("portfolio.closed.total")}
                </td>
                <td className="px-3 py-2.5 text-right font-semibold tabular-nums text-muted-foreground">
                  {formatCurrency(totalCostBasis)}
                </td>
                <td className="px-3 py-2.5 text-right font-semibold tabular-nums">
                  {formatCurrency(totalProceeds)}
                </td>
                <td className="px-3 py-2.5 text-right font-semibold">
                  <GainCell value={totalST} />
                </td>
                <td className="px-3 py-2.5 text-right font-semibold">
                  <GainCell value={totalLT} />
                </td>
                <td className="px-3 py-2.5 text-right font-bold">
                  <GainCell value={totalGL} />
                </td>
              </tr>
            </tfoot>
          );
        })()}
      </table>

      {positions.length === 0 && (
        <div className="flex items-center justify-center py-12 text-muted-foreground text-sm">
          {t("portfolio.closed.empty")}
        </div>
      )}
    </div>
  );
}
