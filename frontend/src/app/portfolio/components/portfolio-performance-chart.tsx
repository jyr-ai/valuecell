import { LineChart } from "echarts/charts";
import {
  DataZoomComponent,
  GridComponent,
  TooltipComponent,
} from "echarts/components";
import type { ECharts } from "echarts/core";
import * as echarts from "echarts/core";
import { CanvasRenderer } from "echarts/renderers";
import type { EChartsOption } from "echarts/types/dist/shared";
import { useEffect, useMemo, useRef } from "react";
import { useTranslation } from "react-i18next";
import { useChartResize } from "@/hooks/use-chart-resize";

echarts.use([
  LineChart,
  GridComponent,
  TooltipComponent,
  DataZoomComponent,
  CanvasRenderer,
]);

interface PortfolioPerformanceChartProps {
  series: Array<[string, number]>;
}

export function PortfolioPerformanceChart({
  series,
}: PortfolioPerformanceChartProps) {
  const { t } = useTranslation();
  const chartRef = useRef<HTMLDivElement>(null);
  const chartInstance = useRef<ECharts | null>(null);

  const option: EChartsOption = useMemo(
    () => ({
      grid: { left: 70, right: 20, top: 20, bottom: 60 },
      xAxis: {
        type: "category",
        data: series.map(([date]) => date),
        axisLabel: { fontSize: 11, rotate: 30 },
        axisTick: { show: false },
        axisLine: { lineStyle: { color: "rgba(150,150,150,0.3)" } },
      },
      yAxis: {
        type: "value",
        scale: true,
        axisLabel: {
          formatter: (v: number) =>
            `$${(v / 1000).toFixed(0)}k`,
          fontSize: 11,
        },
        splitLine: {
          lineStyle: { color: "rgba(150,150,150,0.15)" },
        },
      },
      dataZoom: [
        {
          type: "inside",
          start: 0,
          end: 100,
        },
        {
          type: "slider",
          start: 0,
          end: 100,
          height: 20,
          bottom: 10,
          borderColor: "transparent",
          backgroundColor: "rgba(150,150,150,0.1)",
          fillerColor: "rgba(99,102,241,0.15)",
          handleStyle: { color: "#6366f1" },
        },
      ],
      tooltip: {
        trigger: "axis",
        axisPointer: { type: "line" },
        formatter: (params: unknown) => {
          const arr = params as Array<{ axisValue: string; value: number }>;
          if (!arr.length) return "";
          const p = arr[0];
          return `<strong>${p.axisValue}</strong><br/>$${p.value.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
        },
        backgroundColor: "rgba(0,0,0,0.75)",
        textStyle: { color: "#fff", fontSize: 12 },
        borderRadius: 8,
        padding: [10, 14],
      },
      series: [
        {
          type: "line",
          data: series.map(([, value]) => value),
          smooth: true,
          showSymbol: false,
          lineStyle: { color: "#6366f1", width: 2 },
          areaStyle: {
            color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
              { offset: 0, color: "rgba(99,102,241,0.3)" },
              { offset: 1, color: "rgba(99,102,241,0.02)" },
            ]),
          },
        },
      ],
    }),
    [series],
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

  return (
    <div className="flex flex-col gap-3 rounded-xl border border-border bg-card p-4">
      <h3 className="font-semibold text-sm text-foreground">
        {t("portfolio.performance.title")}
      </h3>
      <p className="text-muted-foreground text-xs">
        {t("portfolio.performance.description")}
      </p>
      <div ref={chartRef} style={{ width: "100%", height: 300 }} />
    </div>
  );
}
