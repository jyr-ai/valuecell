import { BarChart } from "echarts/charts";
import { GridComponent, LegendComponent, TooltipComponent } from "echarts/components";
import type { ECharts } from "echarts/core";
import * as echarts from "echarts/core";
import { CanvasRenderer } from "echarts/renderers";
import { useEffect, useMemo, useRef } from "react";
import { useTranslation } from "react-i18next";
import { useChartResize } from "@/hooks/use-chart-resize";
import { cn } from "@/lib/utils";
import type { TradingBehaviorStats } from "@/lib/fidelity-csv-parser";
import { AlertTriangle } from "lucide-react";

echarts.use([BarChart, GridComponent, TooltipComponent, LegendComponent, CanvasRenderer]);

function formatCurrency(v: number): string {
  if (v >= 1_000_000) return `$${(v / 1_000_000).toFixed(2)}M`;
  if (v >= 1_000) return `$${(v / 1_000).toFixed(1)}k`;
  return `$${v.toFixed(2)}`;
}

// ─── Monthly Activity Stacked Bar Chart ───────────────────────────────────────

function MonthlyActivityChart({
  data,
}: {
  data: TradingBehaviorStats["monthlyActivity"];
}) {
  const { t } = useTranslation();
  const chartRef = useRef<HTMLDivElement>(null);
  const chartInstance = useRef<ECharts | null>(null);

  // Show last 24 months for readability
  const recent = data.slice(-24);

  const option = useMemo(
    () => ({
      tooltip: {
        trigger: "axis",
        axisPointer: { type: "shadow" },
        backgroundColor: "rgba(0,0,0,0.75)",
        textStyle: { color: "#fff", fontSize: 12 },
        borderRadius: 8,
        padding: [10, 14],
      },
      legend: {
        bottom: 0,
        left: "center",
        itemWidth: 10,
        itemHeight: 10,
        textStyle: { fontSize: 11 },
      },
      grid: { left: 30, right: 10, top: 10, bottom: 40 },
      xAxis: {
        type: "category",
        data: recent.map((d) => d.month),
        axisLabel: { fontSize: 9, rotate: 45 },
        axisTick: { show: false },
        axisLine: { lineStyle: { color: "rgba(150,150,150,0.3)" } },
      },
      yAxis: {
        type: "value",
        axisLabel: { fontSize: 10 },
        splitLine: { lineStyle: { color: "rgba(150,150,150,0.15)" } },
        minInterval: 1,
      },
      series: [
        {
          name: t("portfolio.behavior.buys"),
          type: "bar",
          stack: "activity",
          data: recent.map((d) => d.buys),
          itemStyle: { color: "#2563eb" },
          barMaxWidth: 20,
        },
        {
          name: t("portfolio.behavior.sells"),
          type: "bar",
          stack: "activity",
          data: recent.map((d) => d.sells),
          itemStyle: { color: "#f97316" },
          barMaxWidth: 20,
        },
        {
          name: t("portfolio.behavior.dividends"),
          type: "bar",
          stack: "activity",
          data: recent.map((d) => d.dividends),
          itemStyle: { color: "#16a34a" },
          barMaxWidth: 20,
        },
      ],
    }),
    [recent, t],
  );

  useChartResize(chartInstance);

  useEffect(() => {
    if (!chartRef.current) return;
    chartInstance.current = echarts.init(chartRef.current);
    chartInstance.current.setOption(option);
    return () => chartInstance.current?.dispose();
  }, [option]);

  return <div ref={chartRef} style={{ width: "100%", height: 260 }} />;
}

// ─── Stat Pill ─────────────────────────────────────────────────────────────────

interface StatPillProps {
  label: string;
  value: string;
  accent?: "blue" | "orange" | "green" | "neutral";
}

function StatPill({ label, value, accent = "neutral" }: StatPillProps) {
  const accentClass = {
    blue: "bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800",
    orange: "bg-orange-50 dark:bg-orange-900/20 border-orange-200 dark:border-orange-800",
    green: "bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800",
    neutral: "bg-muted/40 border-border",
  }[accent];

  return (
    <div className={cn("flex flex-col gap-0.5 rounded-lg border px-3 py-2.5", accentClass)}>
      <p className="text-muted-foreground text-xs">{label}</p>
      <p className="font-bold text-foreground text-base tabular-nums">{value}</p>
    </div>
  );
}

// ─── Wash Sale Warning ────────────────────────────────────────────────────────

function WashSaleWarning({ symbols }: { symbols: string[] }) {
  const { t } = useTranslation();
  if (symbols.length === 0) return null;

  return (
    <div className="flex items-start gap-3 rounded-lg border border-amber-300 bg-amber-50 p-3 dark:border-amber-700 dark:bg-amber-900/20">
      <AlertTriangle className="mt-0.5 size-4 shrink-0 text-amber-600 dark:text-amber-400" />
      <div>
        <p className="font-semibold text-amber-800 text-xs dark:text-amber-300">
          {t("portfolio.behavior.washSaleWarning")}
        </p>
        <p className="mt-0.5 text-amber-700 text-xs dark:text-amber-400">
          {t("portfolio.behavior.washSaleDesc")}
        </p>
        <div className="mt-1.5 flex flex-wrap gap-1">
          {symbols.map((s) => (
            <span
              key={s}
              className="rounded bg-amber-200 px-1.5 py-0.5 font-mono font-semibold text-amber-900 text-xs dark:bg-amber-800 dark:text-amber-200"
            >
              {s}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}

// ─── Public Component ─────────────────────────────────────────────────────────

interface TradingBehaviorProps {
  stats: TradingBehaviorStats;
}

export function TradingBehavior({ stats }: TradingBehaviorProps) {
  const { t } = useTranslation();

  const holdingLabel = stats.avgHoldingDays !== null
    ? stats.avgHoldingDays >= 365
      ? `${(stats.avgHoldingDays / 365).toFixed(1)} yrs`
      : `${stats.avgHoldingDays} days`
    : t("portfolio.behavior.notEnoughData");

  return (
    <div className="flex flex-col gap-5">

      {/* Wash sale alert — shown first so it's prominent */}
      <WashSaleWarning symbols={stats.washSaleRiskSymbols} />

      {/* Behavioral stat pills */}
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-6">
        <StatPill
          label={t("portfolio.behavior.totalBuys")}
          value={stats.totalBuys.toLocaleString()}
          accent="blue"
        />
        <StatPill
          label={t("portfolio.behavior.totalSells")}
          value={stats.totalSells.toLocaleString()}
          accent="orange"
        />
        <StatPill
          label={t("portfolio.behavior.capitalDeployed")}
          value={formatCurrency(stats.totalCapitalDeployed)}
          accent="blue"
        />
        <StatPill
          label={t("portfolio.behavior.saleProceeds")}
          value={formatCurrency(stats.totalSaleProceeds)}
          accent="orange"
        />
        <StatPill
          label={t("portfolio.behavior.tradesPerMonth")}
          value={stats.tradesPerMonth.toString()}
          accent="neutral"
        />
        <StatPill
          label={t("portfolio.behavior.avgHoldingPeriod")}
          value={holdingLabel}
          accent="green"
        />
      </div>

      {/* Charts side by side */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">

        {/* Monthly activity chart (takes 2/3 width) */}
        <div className="flex flex-col gap-2 rounded-xl border border-border bg-card p-4 lg:col-span-2">
          <h3 className="font-semibold text-sm text-foreground">
            {t("portfolio.behavior.monthlyTitle")}
          </h3>
          <p className="text-muted-foreground text-xs">
            {t("portfolio.behavior.monthlyDesc")}
          </p>
          <MonthlyActivityChart data={stats.monthlyActivity} />
        </div>

        {/* Most traded + dividend income (1/3 width) */}
        <div className="flex flex-col gap-3">
          {/* Most traded */}
          <div className="flex flex-col gap-2 rounded-xl border border-border bg-card p-4">
            <h3 className="font-semibold text-sm text-foreground">
              {t("portfolio.behavior.mostTraded")}
            </h3>
            <div className="flex flex-col gap-1.5">
              {stats.mostTradedSymbols.map(({ symbol, count }, i) => (
                <div key={symbol} className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="w-4 text-muted-foreground text-xs tabular-nums">
                      {i + 1}.
                    </span>
                    <span className="font-semibold text-foreground text-sm">
                      {symbol}
                    </span>
                  </div>
                  <span className="text-muted-foreground text-xs tabular-nums">
                    {count} {t("portfolio.behavior.trades")}
                  </span>
                </div>
              ))}
              {stats.mostTradedSymbols.length === 0 && (
                <p className="text-muted-foreground text-xs">
                  {t("portfolio.behavior.noData")}
                </p>
              )}
            </div>
          </div>

          {/* Dividend income */}
          <div className="flex flex-col gap-1.5 rounded-xl border border-border bg-card p-4">
            <h3 className="font-semibold text-sm text-foreground">
              {t("portfolio.behavior.dividendIncome")}
            </h3>
            <p
              className={cn(
                "font-bold text-xl tabular-nums",
                stats.totalDividendIncome > 0
                  ? "text-green-600 dark:text-green-400"
                  : "text-muted-foreground",
              )}
            >
              {formatCurrency(stats.totalDividendIncome)}
            </p>
            <p className="text-muted-foreground text-xs">
              {t("portfolio.behavior.dividendDesc")}
            </p>
          </div>
        </div>
      </div>

      {/* AI Agent Context Note */}
      <div className="rounded-lg border border-primary/20 bg-primary/5 p-4">
        <p className="font-semibold text-primary text-xs">
          🤖 {t("portfolio.behavior.aiContextTitle")}
        </p>
        <p className="mt-1 text-muted-foreground text-xs leading-relaxed">
          {t("portfolio.behavior.aiContextDesc")}
        </p>
      </div>
    </div>
  );
}
