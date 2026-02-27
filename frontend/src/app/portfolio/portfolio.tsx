import { BarChart3, RefreshCw } from "lucide-react";
import { useCallback, useState } from "react";
import { useTranslation } from "react-i18next";
import {
  type ClosedPosition,
  type PortfolioPosition,
  type TradeRecord,
  type TradingBehaviorStats,
  buildPerformanceSeries,
  computePortfolioSummary,
  computeTradingBehavior,
  parseClosedPositions,
  parseHistoricalTrades,
  parsePortfolioPositions,
} from "@/lib/fidelity-csv-parser";
import { CsvUploadZone } from "./components/csv-upload-zone";
import { GainsChart } from "./components/gains-chart";
import { PnlAnalysis } from "./components/pnl-analysis";
import { PortfolioAllocationChart } from "./components/portfolio-allocation-chart";
import { PortfolioPerformanceChart } from "./components/portfolio-performance-chart";
import { PortfolioSummaryCards } from "./components/portfolio-summary-cards";
import { PortfolioTabs } from "./components/portfolio-tabs";
import { TradingBehavior } from "./components/trading-behavior";

// ─── State Types ──────────────────────────────────────────────────────────────

interface FileState {
  name: string | null;
  error: string | null;
}

const emptyFileState = (): FileState => ({ name: null, error: null });

// ─── Helpers ──────────────────────────────────────────────────────────────────

async function readFileAsText(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => resolve((e.target?.result as string) ?? "");
    reader.onerror = () => reject(new Error("Failed to read file"));
    reader.readAsText(file);
  });
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function PortfolioPage() {
  const { t } = useTranslation();

  // File state
  const [positionsFile, setPositionsFile] = useState<FileState>(emptyFileState());
  const [tradesFile, setTradesFile] = useState<FileState>(emptyFileState());
  const [closedFile, setClosedFile] = useState<FileState>(emptyFileState());

  // Parsed data
  const [positions, setPositions] = useState<PortfolioPosition[] | null>(null);
  const [trades, setTrades] = useState<TradeRecord[] | null>(null);
  const [closedPositions, setClosedPositions] = useState<ClosedPosition[] | null>(null);

  const isDashboardReady = positions !== null && trades !== null;

  // ─── File handlers ──────────────────────────────────────────────────────────

  const handlePositionsFile = useCallback(async (file: File) => {
    setPositionsFile({ name: file.name, error: null });
    try {
      const text = await readFileAsText(file);
      const result = parsePortfolioPositions(text);
      if (result.errors.length > 0) {
        setPositionsFile({ name: file.name, error: result.errors[0] });
        setPositions(null);
      } else {
        setPositions(result.data);
      }
    } catch {
      setPositionsFile({ name: file.name, error: t("portfolio.upload.readError") });
      setPositions(null);
    }
  }, [t]);

  const handleTradesFile = useCallback(async (file: File) => {
    setTradesFile({ name: file.name, error: null });
    try {
      const text = await readFileAsText(file);
      const result = parseHistoricalTrades(text);
      if (result.errors.length > 0) {
        setTradesFile({ name: file.name, error: result.errors[0] });
        setTrades(null);
      } else {
        setTrades(result.data);
      }
    } catch {
      setTradesFile({ name: file.name, error: t("portfolio.upload.readError") });
      setTrades(null);
    }
  }, [t]);

  const handleClosedFile = useCallback(async (file: File) => {
    setClosedFile({ name: file.name, error: null });
    try {
      const text = await readFileAsText(file);
      const result = parseClosedPositions(text);
      if (result.errors.length > 0) {
        setClosedFile({ name: file.name, error: result.errors[0] });
        setClosedPositions(null);
      } else {
        setClosedPositions(result.data);
      }
    } catch {
      setClosedFile({ name: file.name, error: t("portfolio.upload.readError") });
      setClosedPositions(null);
    }
  }, [t]);

  const handleReset = () => {
    setPositionsFile(emptyFileState());
    setTradesFile(emptyFileState());
    setClosedFile(emptyFileState());
    setPositions(null);
    setTrades(null);
    setClosedPositions(null);
  };

  // ─── Derived data ───────────────────────────────────────────────────────────

  const summary =
    positions !== null
      ? computePortfolioSummary(positions, closedPositions, trades)
      : null;

  const performanceSeries =
    trades !== null ? buildPerformanceSeries(trades) : [];

  const behaviorStats: TradingBehaviorStats | null =
    trades !== null ? computeTradingBehavior(trades) : null;

  // ─── Upload Screen ──────────────────────────────────────────────────────────

  if (!isDashboardReady) {
    return (
      <div className="flex h-full flex-col overflow-auto bg-muted px-6 py-6">
        {/* Page header */}
        <div className="mb-6 flex items-center gap-3">
          <div className="flex size-10 items-center justify-center rounded-xl bg-primary/10">
            <BarChart3 className="size-5 text-primary" />
          </div>
          <div>
            <h1 className="font-bold text-xl text-foreground">
              {t("portfolio.title")}
            </h1>
            <p className="text-muted-foreground text-sm">
              {t("portfolio.subtitle")}
            </p>
          </div>
        </div>

        {/* Upload card */}
        <div className="mx-auto w-full max-w-2xl rounded-2xl border border-border bg-card p-8 shadow-sm">
          <h2 className="mb-1 font-semibold text-base text-foreground">
            {t("portfolio.upload.title")}
          </h2>
          <p className="mb-6 text-muted-foreground text-sm">
            {t("portfolio.upload.description")}
          </p>

          <div className="flex flex-col gap-6">
            <CsvUploadZone
              label={t("portfolio.upload.positionsLabel")}
              description={t("portfolio.upload.positionsDesc")}
              fileName={positionsFile.name}
              required
              onFileSelect={handlePositionsFile}
              onClear={() => {
                setPositionsFile(emptyFileState());
                setPositions(null);
              }}
              error={positionsFile.error}
            />

            <CsvUploadZone
              label={t("portfolio.upload.tradesLabel")}
              description={t("portfolio.upload.tradesDesc")}
              fileName={tradesFile.name}
              required
              onFileSelect={handleTradesFile}
              onClear={() => {
                setTradesFile(emptyFileState());
                setTrades(null);
              }}
              error={tradesFile.error}
            />

            <CsvUploadZone
              label={t("portfolio.upload.closedLabel")}
              description={t("portfolio.upload.closedDesc")}
              fileName={closedFile.name}
              required={false}
              onFileSelect={handleClosedFile}
              onClear={() => {
                setClosedFile(emptyFileState());
                setClosedPositions(null);
              }}
              error={closedFile.error}
            />
          </div>

          {/* Hint about how to download from Fidelity */}
          <div className="mt-6 rounded-lg bg-muted/50 p-4">
            <p className="font-medium text-foreground text-xs">
              {t("portfolio.upload.howToTitle")}
            </p>
            <ol className="mt-2 list-inside list-decimal space-y-1 text-muted-foreground text-xs">
              <li>{t("portfolio.upload.howTo1")}</li>
              <li>{t("portfolio.upload.howTo2")}</li>
              <li>{t("portfolio.upload.howTo3")}</li>
            </ol>
          </div>
        </div>
      </div>
    );
  }

  // ─── Dashboard ──────────────────────────────────────────────────────────────

  return (
    <div className="flex h-full flex-col overflow-auto bg-muted px-6 py-6">
      {/* Page header */}
      <div className="mb-5 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="flex size-10 items-center justify-center rounded-xl bg-primary/10">
            <BarChart3 className="size-5 text-primary" />
          </div>
          <div>
            <h1 className="font-bold text-xl text-foreground">
              {t("portfolio.title")}
            </h1>
            <p className="text-muted-foreground text-xs">
              {t("portfolio.dataFrom", {
                positions: positionsFile.name,
                trades: tradesFile.name,
              })}
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={handleReset}
          className="flex items-center gap-1.5 rounded-lg border border-border bg-card px-3 py-2 text-muted-foreground text-sm transition-colors hover:bg-muted hover:text-foreground"
        >
          <RefreshCw className="size-3.5" />
          {t("portfolio.uploadNew")}
        </button>
      </div>

      <div className="flex flex-col gap-5">
        {/* Row 1 — Summary cards */}
        {summary && <PortfolioSummaryCards summary={summary} />}

        {/* Row 2 — Allocation + Gains side by side */}
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          <PortfolioAllocationChart positions={positions} />
          <GainsChart positions={positions} />
        </div>

        {/* Row 3 — Performance line chart */}
        {performanceSeries.length > 1 && (
          <PortfolioPerformanceChart series={performanceSeries} />
        )}

        {/* Row 4 — Tabbed data tables */}
        <PortfolioTabs
          positions={positions}
          trades={trades}
          closedPositions={closedPositions}
        />

        {/* Row 5 — Behavioral Analytics (always shown when trades are loaded) */}
        {behaviorStats && (
          <div className="flex flex-col gap-3">
            <div>
              <h2 className="font-bold text-base text-foreground">
                {t("portfolio.behavior.sectionTitle")}
              </h2>
              <p className="mt-0.5 text-muted-foreground text-xs">
                {t("portfolio.behavior.sectionSubtitle")}
              </p>
            </div>
            <TradingBehavior stats={behaviorStats} />
          </div>
        )}

        {/* Row 6 — P&L Analysis (only when closed positions uploaded) */}
        {closedPositions && closedPositions.length > 0 && (
          <div className="flex flex-col gap-3">
            <h2 className="font-bold text-base text-foreground">
              {t("portfolio.pnl.sectionTitle")}
            </h2>
            <PnlAnalysis positions={closedPositions} />
          </div>
        )}
      </div>
    </div>
  );
}
