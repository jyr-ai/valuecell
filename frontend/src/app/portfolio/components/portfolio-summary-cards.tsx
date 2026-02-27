import { ArrowDown, ArrowUp, Minus } from "lucide-react";
import { useTranslation } from "react-i18next";
import { cn } from "@/lib/utils";
import type { PortfolioSummary } from "@/lib/fidelity-csv-parser";

interface SummaryCardProps {
  label: string;
  value: string;
  subValue?: string;
  trend?: "positive" | "negative" | "neutral";
}

function SummaryCard({ label, value, subValue, trend }: SummaryCardProps) {
  return (
    <div className="flex flex-col gap-1.5 rounded-xl border border-border bg-card p-4">
      <p className="text-muted-foreground text-xs font-medium uppercase tracking-wide">
        {label}
      </p>
      <div className="flex items-baseline gap-2">
        <p
          className={cn(
            "font-bold text-2xl",
            trend === "positive" && "text-green-600 dark:text-green-400",
            trend === "negative" && "text-red-600 dark:text-red-400",
            (!trend || trend === "neutral") && "text-foreground",
          )}
        >
          {value}
        </p>
        {trend && trend !== "neutral" && (
          <span
            className={cn(
              "flex items-center text-xs font-medium",
              trend === "positive" && "text-green-600 dark:text-green-400",
              trend === "negative" && "text-red-600 dark:text-red-400",
            )}
          >
            {trend === "positive" ? (
              <ArrowUp className="size-3" />
            ) : (
              <ArrowDown className="size-3" />
            )}
          </span>
        )}
        {trend === "neutral" && (
          <Minus className="size-3 text-muted-foreground" />
        )}
      </div>
      {subValue && (
        <p className="text-muted-foreground text-xs">{subValue}</p>
      )}
    </div>
  );
}

function formatCurrency(value: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);
}

function formatPercent(value: number): string {
  const sign = value > 0 ? "+" : "";
  return `${sign}${value.toFixed(2)}%`;
}

function trendOf(value: number): "positive" | "negative" | "neutral" {
  if (value > 0) return "positive";
  if (value < 0) return "negative";
  return "neutral";
}

interface PortfolioSummaryCardsProps {
  summary: PortfolioSummary;
}

export function PortfolioSummaryCards({ summary }: PortfolioSummaryCardsProps) {
  const { t } = useTranslation();

  const cards: SummaryCardProps[] = [
    {
      label: t("portfolio.summary.totalValue"),
      value: formatCurrency(summary.totalAccountValue),
    },
    {
      label: t("portfolio.summary.weekGainLoss"),
      value:
        summary.weeklyGainLoss !== null
          ? formatCurrency(summary.weeklyGainLoss)
          : "—",
      subValue:
        summary.weeklyGainLossPercent !== null
          ? formatPercent(summary.weeklyGainLossPercent)
          : undefined,
      trend:
        summary.weeklyGainLoss !== null
          ? trendOf(summary.weeklyGainLoss)
          : "neutral",
    },
    {
      label: t("portfolio.summary.monthGainLoss"),
      value:
        summary.monthlyGainLoss !== null
          ? formatCurrency(summary.monthlyGainLoss)
          : "—",
      subValue:
        summary.monthlyGainLossPercent !== null
          ? formatPercent(summary.monthlyGainLossPercent)
          : undefined,
      trend:
        summary.monthlyGainLoss !== null
          ? trendOf(summary.monthlyGainLoss)
          : "neutral",
    },
    {
      label: t("portfolio.summary.totalUnrealizedGainLoss"),
      value: formatCurrency(summary.totalUnrealizedGainLoss),
      trend: trendOf(summary.totalUnrealizedGainLoss),
    },
    {
      label: t("portfolio.summary.totalCostBasis"),
      value: formatCurrency(summary.totalCostBasis),
    },
    {
      label: t("portfolio.summary.positions"),
      value: summary.positionCount.toString(),
    },
  ];

  if (summary.realizedGainLoss !== null) {
    cards.push({
      label: t("portfolio.summary.realizedGainLoss"),
      value: formatCurrency(summary.realizedGainLoss),
      trend: trendOf(summary.realizedGainLoss),
    });
  }

  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6 xl:grid-cols-7">
      {cards.map((card) => (
        <SummaryCard key={card.label} {...card} />
      ))}
    </div>
  );
}
