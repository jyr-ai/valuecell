import { BarChart, PieChart } from "echarts/charts";
import { GridComponent, LegendComponent, TooltipComponent } from "echarts/components";
import type { ECharts } from "echarts/core";
import * as echarts from "echarts/core";
import { CanvasRenderer } from "echarts/renderers";
import { useEffect, useMemo, useRef } from "react";
import { useTranslation } from "react-i18next";
import { useChartResize } from "@/hooks/use-chart-resize";
import { cn } from "@/lib/utils";
import type { ClosedPosition } from "@/lib/fidelity-csv-parser";

echarts.use([
  PieChart,
  BarChart,
  GridComponent,
  TooltipComponent,
  LegendComponent,
  CanvasRenderer,
]);

function formatCurrency(v: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(v);
}

function trendOf(v: number): "positive" | "negative" | "neutral" {
  if (v > 0) return "positive";
  if (v < 0) return "negative";
  return "neutral";
}

// ─── Short vs Long Term Pie ───────────────────────────────────────────────────

interface StLtPieProps {
  shortTerm: number;
  longTerm: number;
}

function StLtPieChart({ shortTerm, longTerm }: StLtPieProps) {
  const { t } = useTranslation();
  const chartRef = useRef<HTMLDivElement>(null);
  const chartInstance = useRef<ECharts | null>(null);

  const option = useMemo(
    () => ({
      tooltip: {
        trigger: "item",
        formatter: (params: unknown) => {
          const p = params as { name: string; value: number; percent: number };
          return `<strong>${p.name}</strong><br/>${formatCurrency(p.value)}<br/>${p.percent.toFixed(1)}%`;
        },
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
      series: [
        {
          type: "pie",
          radius: ["40%", "68%"],
          center: ["50%", "45%"],
          label: { show: false },
          data: [
            {
              name: t("portfolio.pnl.shortTerm"),
              value: Math.abs(shortTerm),
              itemStyle: { color: shortTerm >= 0 ? "#16a34a" : "#dc2626" },
            },
            {
              name: t("portfolio.pnl.longTerm"),
              value: Math.abs(longTerm),
              itemStyle: { color: longTerm >= 0 ? "#2563eb" : "#f97316" },
            },
          ],
        },
      ],
    }),
    [shortTerm, longTerm, t],
  );

  useChartResize(chartInstance);

  useEffect(() => {
    if (!chartRef.current) return;
    chartInstance.current = echarts.init(chartRef.current);
    chartInstance.current.setOption(option);
    return () => chartInstance.current?.dispose();
  }, [option]);

  return <div ref={chartRef} style={{ width: "100%", height: 220 }} />;
}

// ─── Waterfall / Realized P&L Bar ────────────────────────────────────────────

interface WaterfallChartProps {
  positions: ClosedPosition[];
}

function WaterfallChart({ positions }: WaterfallChartProps) {
  const { t } = useTranslation();
  const chartRef = useRef<HTMLDivElement>(null);
  const chartInstance = useRef<ECharts | null>(null);

  // Top 15 by absolute gain/loss for readability
  const top = useMemo(() => {
    return [...positions]
      .sort((a, b) => Math.abs(b.totalGainLoss) - Math.abs(a.totalGainLoss))
      .slice(0, 15);
  }, [positions]);

  const option = useMemo(
    () => ({
      tooltip: {
        trigger: "axis",
        axisPointer: { type: "shadow" },
        formatter: (params: unknown) => {
          const arr = params as Array<{ name: string; value: number }>;
          if (!arr.length) return "";
          const p = arr[0];
          const sign = p.value >= 0 ? "+" : "";
          return `<strong>${p.name}</strong><br/>${sign}${formatCurrency(p.value)}`;
        },
        backgroundColor: "rgba(0,0,0,0.75)",
        textStyle: { color: "#fff", fontSize: 12 },
        borderRadius: 8,
        padding: [10, 14],
      },
      grid: { left: 60, right: 70, top: 10, bottom: 10 },
      xAxis: {
        type: "value",
        axisLabel: {
          formatter: (v: number) =>
            `${v >= 0 ? "+" : ""}$${(Math.abs(v) / 1000).toFixed(1)}k`,
          fontSize: 10,
        },
        splitLine: { lineStyle: { color: "rgba(150,150,150,0.15)" } },
      },
      yAxis: {
        type: "category",
        data: top.map((p) => p.symbol),
        axisLabel: { fontSize: 11, fontWeight: "bold" },
        axisTick: { show: false },
        axisLine: { show: false },
      },
      series: [
        {
          type: "bar",
          data: top.map((p) => ({
            value: Number(p.totalGainLoss.toFixed(2)),
            itemStyle: {
              color: p.totalGainLoss >= 0 ? "#16a34a" : "#dc2626",
              borderRadius: [0, 3, 3, 0],
            },
          })),
          label: {
            show: true,
            position: "right" as const,
            formatter: (params: unknown) => {
              const p = params as { value: number };
              const sign = p.value >= 0 ? "+" : "";
              return `${sign}$${Math.abs(p.value).toLocaleString("en-US", {
                minimumFractionDigits: 0,
                maximumFractionDigits: 0,
              })}`;
            },
            fontSize: 10,
            color: "#6b7280",
          },
          barMaxWidth: 20,
        },
      ],
    }),
    [top],
  );

  const chartHeight = Math.max(220, top.length * 28);

  useChartResize(chartInstance);

  useEffect(() => {
    if (!chartRef.current) return;
    chartInstance.current = echarts.init(chartRef.current);
    chartInstance.current.setOption(option);
    return () => chartInstance.current?.dispose();
  }, [option]);

  return (
    <div className="flex flex-col gap-2">
      <p className="text-muted-foreground text-xs">
        {t("portfolio.pnl.waterfallDesc")}
      </p>
      <div ref={chartRef} style={{ width: "100%", height: chartHeight }} />
    </div>
  );
}

// ─── Summary Cards ────────────────────────────────────────────────────────────

interface PnlCardProps {
  label: string;
  value: number;
}

function PnlCard({ label, value }: PnlCardProps) {
  const trend = trendOf(value);
  return (
    <div className="flex flex-col gap-1 rounded-xl border border-border bg-card p-4">
      <p className="text-muted-foreground text-xs font-medium uppercase tracking-wide">
        {label}
      </p>
      <p
        className={cn(
          "font-bold text-xl tabular-nums",
          trend === "positive" && "text-green-600 dark:text-green-400",
          trend === "negative" && "text-red-600 dark:text-red-400",
          trend === "neutral" && "text-foreground",
        )}
      >
        {formatCurrency(value)}
      </p>
    </div>
  );
}

// ─── Public Component ─────────────────────────────────────────────────────────

interface PnlAnalysisProps {
  positions: ClosedPosition[];
}

export function PnlAnalysis({ positions }: PnlAnalysisProps) {
  const { t } = useTranslation();

  const totalRealized = positions.reduce((s, p) => s + p.totalGainLoss, 0);
  const totalST = positions.reduce((s, p) => s + p.shortTermGainLoss, 0);
  const totalLT = positions.reduce((s, p) => s + p.longTermGainLoss, 0);

  return (
    <div className="flex flex-col gap-6">
      {/* Summary cards */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <PnlCard label={t("portfolio.pnl.totalRealized")} value={totalRealized} />
        <PnlCard label={t("portfolio.pnl.shortTermTotal")} value={totalST} />
        <PnlCard label={t("portfolio.pnl.longTermTotal")} value={totalLT} />
      </div>

      {/* Charts side-by-side */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <div className="flex flex-col gap-3 rounded-xl border border-border bg-card p-4">
          <h3 className="font-semibold text-sm text-foreground">
            {t("portfolio.pnl.stLtTitle")}
          </h3>
          <StLtPieChart shortTerm={totalST} longTerm={totalLT} />
        </div>

        <div className="flex flex-col gap-3 rounded-xl border border-border bg-card p-4">
          <h3 className="font-semibold text-sm text-foreground">
            {t("portfolio.pnl.waterfallTitle")}
          </h3>
          <WaterfallChart positions={positions} />
        </div>
      </div>
    </div>
  );
}
