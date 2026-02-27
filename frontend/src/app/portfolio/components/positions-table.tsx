import { ArrowDown, ArrowUp, ChevronsUpDown } from "lucide-react";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { cn } from "@/lib/utils";
import type { PortfolioPosition } from "@/lib/fidelity-csv-parser";

type SortKey = keyof Pick<
  PortfolioPosition,
  | "symbol"
  | "quantity"
  | "lastPrice"
  | "currentValue"
  | "todayGainLossDollar"
  | "totalGainLossDollar"
  | "totalGainLossPercent"
  | "percentOfAccount"
  | "costBasisTotal"
>;

type SortDir = "asc" | "desc";

function formatCurrency(v: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(v);
}

function formatPercent(v: number): string {
  const sign = v > 0 ? "+" : "";
  return `${sign}${v.toFixed(2)}%`;
}

function GainCell({ value, percent }: { value: number; percent?: number }) {
  const isPositive = value > 0;
  const isNeutral = value === 0;
  return (
    <div
      className={cn(
        "flex flex-col",
        isPositive && "text-green-600 dark:text-green-400",
        !isPositive && !isNeutral && "text-red-600 dark:text-red-400",
        isNeutral && "text-muted-foreground",
      )}
    >
      <span>{formatCurrency(value)}</span>
      {percent !== undefined && (
        <span className="text-xs opacity-80">{formatPercent(percent)}</span>
      )}
    </div>
  );
}

interface SortHeaderProps {
  label: string;
  sortKey: SortKey;
  currentKey: SortKey;
  currentDir: SortDir;
  onSort: (key: SortKey) => void;
  className?: string;
}

function SortHeader({
  label,
  sortKey,
  currentKey,
  currentDir,
  onSort,
  className,
}: SortHeaderProps) {
  const active = sortKey === currentKey;
  return (
    <th
      className={cn(
        "cursor-pointer select-none whitespace-nowrap px-3 py-2.5 text-left font-medium text-muted-foreground text-xs",
        "hover:text-foreground",
        className,
      )}
      onClick={() => onSort(sortKey)}
      onKeyDown={(e) => e.key === "Enter" && onSort(sortKey)}
      tabIndex={0}
    >
      <span className="flex items-center gap-1">
        {label}
        {active ? (
          currentDir === "asc" ? (
            <ArrowUp className="size-3" />
          ) : (
            <ArrowDown className="size-3" />
          )
        ) : (
          <ChevronsUpDown className="size-3 opacity-40" />
        )}
      </span>
    </th>
  );
}

interface PositionsTableProps {
  positions: PortfolioPosition[];
}

export function PositionsTable({ positions }: PositionsTableProps) {
  const { t } = useTranslation();
  const [sortKey, setSortKey] = useState<SortKey>("currentValue");
  const [sortDir, setSortDir] = useState<SortDir>("desc");

  const handleSort = (key: SortKey) => {
    if (key === sortKey) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortKey(key);
      setSortDir("desc");
    }
  };

  const sorted = [...positions].sort((a, b) => {
    const av = a[sortKey];
    const bv = b[sortKey];
    if (typeof av === "string" && typeof bv === "string") {
      return sortDir === "asc"
        ? av.localeCompare(bv)
        : bv.localeCompare(av);
    }
    const an = av as number;
    const bn = bv as number;
    return sortDir === "asc" ? an - bn : bn - an;
  });

  const sortProps = { currentKey: sortKey, currentDir: sortDir, onSort: handleSort };

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-border">
            <SortHeader label={t("portfolio.positions.symbol")} sortKey="symbol" {...sortProps} />
            <th className="whitespace-nowrap px-3 py-2.5 text-left font-medium text-muted-foreground text-xs">
              {t("portfolio.positions.description")}
            </th>
            <SortHeader label={t("portfolio.positions.qty")} sortKey="quantity" {...sortProps} className="text-right" />
            <SortHeader label={t("portfolio.positions.lastPrice")} sortKey="lastPrice" {...sortProps} className="text-right" />
            <SortHeader label={t("portfolio.positions.currentValue")} sortKey="currentValue" {...sortProps} className="text-right" />
            <SortHeader label={t("portfolio.positions.costBasis")} sortKey="costBasisTotal" {...sortProps} className="text-right" />
            <SortHeader label={t("portfolio.positions.todayGL")} sortKey="todayGainLossDollar" {...sortProps} className="text-right" />
            <SortHeader label={t("portfolio.positions.totalGL")} sortKey="totalGainLossDollar" {...sortProps} className="text-right" />
            <SortHeader label={t("portfolio.positions.pctAccount")} sortKey="percentOfAccount" {...sortProps} className="text-right" />
          </tr>
        </thead>
        <tbody>
          {sorted.map((pos) => (
            <tr
              key={`${pos.accountNumber}-${pos.symbol}`}
              className="border-b border-border/50 transition-colors hover:bg-muted/30"
            >
              <td className="whitespace-nowrap px-3 py-2.5 font-semibold text-foreground">
                {pos.symbol}
              </td>
              <td className="max-w-[200px] truncate px-3 py-2.5 text-muted-foreground text-xs">
                {pos.description}
              </td>
              <td className="px-3 py-2.5 text-right tabular-nums">
                {pos.quantity.toLocaleString("en-US", { maximumFractionDigits: 4 })}
              </td>
              <td className="px-3 py-2.5 text-right tabular-nums">
                {formatCurrency(pos.lastPrice)}
              </td>
              <td className="px-3 py-2.5 text-right font-medium tabular-nums">
                {formatCurrency(pos.currentValue)}
              </td>
              <td className="px-3 py-2.5 text-right tabular-nums text-muted-foreground">
                {formatCurrency(pos.costBasisTotal)}
              </td>
              <td className="px-3 py-2.5 text-right">
                <GainCell value={pos.todayGainLossDollar} percent={pos.todayGainLossPercent} />
              </td>
              <td className="px-3 py-2.5 text-right">
                <GainCell value={pos.totalGainLossDollar} percent={pos.totalGainLossPercent} />
              </td>
              <td className="px-3 py-2.5 text-right text-muted-foreground tabular-nums">
                {pos.percentOfAccount.toFixed(2)}%
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      {positions.length === 0 && (
        <div className="flex items-center justify-center py-12 text-muted-foreground text-sm">
          {t("portfolio.positions.empty")}
        </div>
      )}
    </div>
  );
}
