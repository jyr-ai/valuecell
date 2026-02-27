import { BarChart } from "echarts/charts";
import { GridComponent, TooltipComponent } from "echarts/components";
import type { ECharts } from "echarts/core";
import * as echarts from "echarts/core";
import { CanvasRenderer } from "echarts/renderers";
import type { EChartsOption } from "echarts/types/dist/shared";
import { useEffect, useMemo, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { useChartResize } from "@/hooks/use-chart-resize";
import { cn } from "@/lib/utils";
import type { PortfolioPosition } from "@/lib/fidelity-csv-parser";

echarts.use([BarChart, GridComponent, TooltipComponent, CanvasRenderer]);

interface GainsChartProps {
  positions: PortfolioPosition[];
}

// Green/red palette matching Fidelity style
const POSITIVE_COLOR = "#16a34a";
const NEGATIVE_COLOR = "#dc2626";

type AssetTab = "stocks" | "options";

/**
 * Options symbols in Fidelity start with '-' (e.g. "-AAPL250117C00150000").
 * Everything else is treated as a stock/ETF.
 */
function isOption(symbol: string): boolean {
  return symbol.startsWith("-");
}

/**
 * From a list of positions, return top-N gainers + bottom-N losers,
 * deduped and sorted for the chart (biggest loss → biggest gain).
 */
function topAndBottom(
  positions: PortfolioPosition[],
  n: number,
): PortfolioPosition[] {
  if (positions.length === 0) return [];

  const sorted = [...positions].sort(
    (a, b) => b.totalGainLossDollar - a.totalGainLossDollar,
  );

  // If there are ≤ 2n positions just show them all
  if (sorted.length <= 2 * n) return sorted;

  const topN = sorted.slice(0, n);
  const bottomN = sorted.slice(sorted.length - n);

  // Combine (bottom first → ascending), remove accidental duplicates
  const seen = new Set<string>();
  const result: PortfolioPosition[] = [];
  for (const p of [...bottomN.reverse(), ...topN.reverse()].reverse()) {
    const key = `${p.accountNumber}:${p.symbol}`;
    if (!seen.has(key)) {
      seen.add(key);
      result.push(p);
    }
  }
  // Re-sort ascending (bottom to top in horizontal bar)
  return result.sort((a, b) => a.totalGainLossDollar - b.totalGainLossDollar);
}

// ─── Inner bar chart ──────────────────────────────────────────────────────────

interface InnerChartProps {
  positions: PortfolioPosition[];
  emptyMessage: string;
}

function InnerGainsChart({ positions, emptyMessage }: InnerChartProps) {
  const chartRef = useRef<HTMLDivElement>(null);
  const chartInstance = useRef<ECharts | null>(null);

  const slice = useMemo(() => topAndBottom(positions, 10), [positions]);

  const { symbols, values, colors } = useMemo(() => {
    return {
      symbols: slice.map((p) => p.symbol),
      values: slice.map((p) => Number(p.totalGainLossDollar.toFixed(2))),
      colors: slice.map((p) =>
        p.totalGainLossDollar >= 0 ? POSITIVE_COLOR : NEGATIVE_COLOR,
      ),
    };
  }, [slice]);

  const chartHeight = Math.max(200, symbols.length * 32);

  const option: EChartsOption = useMemo(
    () => ({
      tooltip: {
        trigger: "axis",
        axisPointer: { type: "shadow" },
        formatter: (params: unknown) => {
          const arr = params as Array<{ name: string; value: number }>;
          if (!arr.length) return "";
          const p = arr[0];
          const sign = p.value >= 0 ? "+" : "";
          return `<strong>${p.name}</strong><br/>${sign}$${Math.abs(p.value).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
        },
        backgroundColor: "rgba(0,0,0,0.75)",
        textStyle: { color: "#fff", fontSize: 12 },
        borderRadius: 8,
        padding: [10, 14],
      },
      grid: { left: 72, right: 86, top: 8, bottom: 8 },
      xAxis: {
        type: "value",
        axisLabel: {
          formatter: (v: number) =>
            `${v >= 0 ? "+" : ""}$${Math.abs(v / 1000).toFixed(1)}k`,
          fontSize: 10,
        },
        splitLine: {
          lineStyle: { color: "rgba(150,150,150,0.15)" },
        },
      },
      yAxis: {
        type: "category",
        data: symbols,
        axisLabel: {
          fontSize: 10,
          fontWeight: "bold",
          // Truncate long option strings
          formatter: (v: string) =>
            v.length > 14 ? `${v.slice(0, 13)}…` : v,
        },
        axisTick: { show: false },
        axisLine: { show: false },
      },
      series: [
        {
          type: "bar",
          data: values.map((v, i) => ({
            value: v,
            itemStyle: { color: colors[i], borderRadius: [0, 3, 3, 0] },
          })),
          label: {
            show: true,
            position: "right" as const,
            formatter: (params: unknown) => {
              const p = params as { value: number };
              const sign = p.value >= 0 ? "+" : "";
              return `${sign}$${Math.abs(p.value).toLocaleString("en-US", { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
            },
            fontSize: 10,
            color: "#6b7280",
          },
          barMaxWidth: 22,
        },
      ],
    }),
    [symbols, values, colors],
  );

  useChartResize(chartInstance);

  useEffect(() => {
    if (!chartRef.current) return;
    chartInstance.current = echarts.init(chartRef.current);
    chartInstance.current.setOption(option);
    return () => {
      chartInstance.current?.dispose();
    };
  }, [option]);

  if (positions.length === 0) {
    return (
      <div className="flex items-center justify-center py-10 text-muted-foreground text-sm">
        {emptyMessage}
      </div>
    );
  }

  return (
    <div ref={chartRef} style={{ width: "100%", height: chartHeight }} />
  );
}

// ─── Public component ─────────────────────────────────────────────────────────

export function GainsChart({ positions }: GainsChartProps) {
  const { t } = useTranslation();
  const [activeTab, setActiveTab] = useState<AssetTab>("stocks");

  const { stocks, options } = useMemo(() => {
    const s: PortfolioPosition[] = [];
    const o: PortfolioPosition[] = [];
    for (const p of positions) {
      if (isOption(p.symbol)) {
        o.push(p);
      } else {
        s.push(p);
      }
    }
    return { stocks: s, options: o };
  }, [positions]);

  const tabs: Array<{ id: AssetTab; label: string; count: number }> = [
    { id: "stocks", label: t("portfolio.gains.tabStocks"), count: stocks.length },
    { id: "options", label: t("portfolio.gains.tabOptions"), count: options.length },
  ];

  return (
    <div className="flex flex-col gap-0 rounded-xl border border-border bg-card">
      {/* Header + tab bar */}
      <div className="border-b border-border px-4 pt-4">
        <h3 className="mb-3 font-semibold text-sm text-foreground">
          {t("portfolio.gains.title")}
        </h3>

        <div className="flex gap-0">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id)}
              className={cn(
                "flex items-center gap-1.5 rounded-t-lg px-4 py-2 font-medium text-sm transition-colors",
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
      </div>

      {/* Subtitle */}
      <p className="px-4 pt-2 text-muted-foreground text-xs">
        {t("portfolio.gains.subtitle")}
      </p>

      {/* Chart area */}
      <div className="p-4 pt-2">
        {activeTab === "stocks" ? (
          <InnerGainsChart
            positions={stocks}
            emptyMessage={t("portfolio.gains.emptyStocks")}
          />
        ) : (
          <InnerGainsChart
            positions={options}
            emptyMessage={t("portfolio.gains.emptyOptions")}
          />
        )}
      </div>
    </div>
  );
}
