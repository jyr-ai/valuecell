import { PieChart } from "echarts/charts";
import { LegendComponent, TooltipComponent } from "echarts/components";
import type { ECharts } from "echarts/core";
import * as echarts from "echarts/core";
import { CanvasRenderer } from "echarts/renderers";
import type { EChartsOption } from "echarts/types/dist/shared";
import { useEffect, useMemo, useRef } from "react";
import { useTranslation } from "react-i18next";
import { useChartResize } from "@/hooks/use-chart-resize";
import type { PortfolioPosition } from "@/lib/fidelity-csv-parser";

echarts.use([PieChart, TooltipComponent, LegendComponent, CanvasRenderer]);

interface PortfolioAllocationChartProps {
  positions: PortfolioPosition[];
}

export function PortfolioAllocationChart({
  positions,
}: PortfolioAllocationChartProps) {
  const { t } = useTranslation();
  const chartRef = useRef<HTMLDivElement>(null);
  const chartInstance = useRef<ECharts | null>(null);

  // Sort by current value descending, group small positions into "Other"
  const chartData = useMemo(() => {
    const sorted = [...positions].sort(
      (a, b) => b.currentValue - a.currentValue,
    );

    const TOP_N = 10;
    const top = sorted.slice(0, TOP_N);
    const rest = sorted.slice(TOP_N);

    const data = top.map((p) => ({
      name: p.symbol,
      value: Number(p.currentValue.toFixed(2)),
    }));

    if (rest.length > 0) {
      const otherValue = rest.reduce((sum, p) => sum + p.currentValue, 0);
      data.push({
        name: t("portfolio.allocation.other"),
        value: Number(otherValue.toFixed(2)),
      });
    }

    return data;
  }, [positions, t]);

  const option: EChartsOption = useMemo(
    () => ({
      tooltip: {
        trigger: "item",
        formatter: (params: unknown) => {
          const p = params as {
            name: string;
            value: number;
            percent: number;
          };
          return `
          <div style="font-weight:600;margin-bottom:4px">${p.name}</div>
          <div>$${p.value.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
          <div style="color:#888">${p.percent.toFixed(1)}%</div>
        `;
        },
        backgroundColor: "rgba(0,0,0,0.75)",
        textStyle: { color: "#fff", fontSize: 12 },
        borderRadius: 8,
        padding: [10, 14],
      },
      legend: {
        type: "scroll",
        orient: "vertical",
        right: 0,
        top: "middle",
        itemWidth: 10,
        itemHeight: 10,
        textStyle: { fontSize: 11 },
      },
      series: [
        {
          type: "pie",
          radius: ["45%", "70%"],
          center: ["38%", "50%"],
          avoidLabelOverlap: true,
          itemStyle: {
            borderRadius: 4,
            borderColor: "transparent",
            borderWidth: 2,
          },
          label: { show: false },
          emphasis: {
            label: {
              show: true,
              fontSize: 14,
              fontWeight: "bold",
            },
            itemStyle: {
              shadowBlur: 10,
              shadowOffsetX: 0,
              shadowColor: "rgba(0,0,0,0.3)",
            },
          },
          data: chartData,
        },
      ],
    }),
    [chartData],
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
        {t("portfolio.allocation.title")}
      </h3>
      <div ref={chartRef} style={{ width: "100%", height: 280 }} />
    </div>
  );
}
