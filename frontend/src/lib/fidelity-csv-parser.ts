/**
 * Fidelity Investment CSV Parser
 *
 * Handles the three Fidelity CSV export formats:
 *  1. Portfolio Positions
 *  2. Historical Activity / Trades
 *  3. Closed Positions (optional)
 *
 * Fidelity CSVs have quirks:
 *  - Multiple disclaimer rows at the top (before the header row)
 *  - Disclaimer rows at the bottom after the data
 *  - Some numeric fields include $ signs, commas, and +/- prefixes
 *  - The Closed Positions file has a blank column between Symbol and Description
 */

// ─── Type Definitions ────────────────────────────────────────────────────────

export interface PortfolioPosition {
  accountNumber: string;
  accountName: string;
  symbol: string;
  description: string;
  quantity: number;
  lastPrice: number;
  lastPriceChange: number;
  currentValue: number;
  todayGainLossDollar: number;
  todayGainLossPercent: number;
  totalGainLossDollar: number;
  totalGainLossPercent: number;
  percentOfAccount: number;
  costBasisTotal: number;
  averageCostBasis: number;
  type: string;
}

export interface TradeRecord {
  runDate: string;
  account: string;
  action: string;
  symbol: string;
  securityDescription: string;
  securityType: string;
  quantity: number;
  exchangeCurrency: string;
  price: number;
  commission: number;
  fees: number;
  accruedInterest: number;
  amount: number;
  settlementDate: string;
}

export interface ClosedPosition {
  accountNumber: string;
  accountName: string;
  symbol: string;
  description: string;
  costBasis: number;
  proceeds: number;
  shortTermGainLoss: number;
  longTermGainLoss: number;
  totalGainLoss: number;
}

export interface ParseResult<T> {
  data: T[];
  errors: string[];
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

/**
 * Parse a Fidelity-formatted number string like "$1,234.56", "+$123", "-$45.00", "N/A" etc.
 * Returns 0 for any unparse-able value.
 */
function parseFidelityNumber(raw: string | undefined): number {
  if (!raw) return 0;
  const cleaned = raw.trim().replace(/[$,+%]/g, "");
  const parsed = Number.parseFloat(cleaned);
  return Number.isNaN(parsed) ? 0 : parsed;
}

/**
 * Split a single CSV line respecting quoted fields.
 */
function splitCsvLine(line: string): string[] {
  const result: string[] = [];
  let current = "";
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') {
      inQuotes = !inQuotes;
    } else if (ch === "," && !inQuotes) {
      result.push(current.trim());
      current = "";
    } else {
      current += ch;
    }
  }
  result.push(current.trim());
  return result;
}

/**
 * Normalize a header name for flexible matching — lowercase, strip spaces/special chars.
 */
function normalizeHeader(h: string): string {
  return h
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "");
}

/**
 * Given an array of header strings, return an index-lookup map keyed by normalized header.
 */
function buildHeaderMap(headers: string[]): Record<string, number> {
  const map: Record<string, number> = {};
  for (let i = 0; i < headers.length; i++) {
    map[normalizeHeader(headers[i])] = i;
  }
  return map;
}

/**
 * Strip Fidelity's leading disclaimer rows and find the true header row.
 * The header row is the first row that contains recognizable column names
 * ("Account Number", "Symbol", "Run Date", etc.).
 *
 * Returns [headerRowIndex, rows[]] or null if not found.
 */
function findHeaderRow(
  rows: string[][],
  requiredHeaders: string[],
): { headerIndex: number; headerMap: Record<string, number> } | null {
  const required = requiredHeaders.map(normalizeHeader);

  for (let i = 0; i < rows.length; i++) {
    const normalized = rows[i].map(normalizeHeader);
    const hasAll = required.every((req) => normalized.includes(req));
    if (hasAll) {
      return { headerIndex: i, headerMap: buildHeaderMap(rows[i]) };
    }
  }
  return null;
}

/**
 * Parse raw CSV text into an array of rows (each row is an array of strings).
 * Skips completely empty rows.
 */
function parseCsvRows(csvText: string): string[][] {
  return csvText
    .split(/\r?\n/)
    .map(splitCsvLine)
    .filter((row) => row.some((cell) => cell.trim() !== ""));
}

// ─── Portfolio Positions Parser ───────────────────────────────────────────────

export function parsePortfolioPositions(
  csvText: string,
): ParseResult<PortfolioPosition> {
  const errors: string[] = [];
  const rows = parseCsvRows(csvText);

  const found = findHeaderRow(rows, ["Symbol", "Quantity", "Last Price"]);
  if (!found) {
    return {
      data: [],
      errors: [
        "Could not find header row. Ensure this is a Fidelity Portfolio Positions export.",
      ],
    };
  }

  const { headerIndex, headerMap } = found;
  const dataRows = rows.slice(headerIndex + 1);
  const data: PortfolioPosition[] = [];

  const col = (row: string[], key: string): string =>
    row[headerMap[normalizeHeader(key)]] ?? "";

  for (const row of dataRows) {
    // Skip footer/disclaimer rows — they typically start with empty symbol or known text patterns
    const symbol = col(row, "Symbol").trim();
    if (!symbol || symbol.startsWith("The") || symbol.startsWith("Brokerage")) {
      continue;
    }

    data.push({
      accountNumber: col(row, "Account Number"),
      accountName: col(row, "Account Name"),
      symbol,
      description: col(row, "Description"),
      quantity: parseFidelityNumber(col(row, "Quantity")),
      lastPrice: parseFidelityNumber(col(row, "Last Price")),
      lastPriceChange: parseFidelityNumber(col(row, "Last Price Change")),
      currentValue: parseFidelityNumber(col(row, "Current Value")),
      todayGainLossDollar: parseFidelityNumber(
        col(row, "Today's Gain/Loss Dollar"),
      ),
      todayGainLossPercent: parseFidelityNumber(
        col(row, "Today's Gain/Loss Percent"),
      ),
      totalGainLossDollar: parseFidelityNumber(
        col(row, "Total Gain/Loss Dollar"),
      ),
      totalGainLossPercent: parseFidelityNumber(
        col(row, "Total Gain/Loss Percent"),
      ),
      percentOfAccount: parseFidelityNumber(col(row, "Percent Of Account")),
      costBasisTotal: parseFidelityNumber(col(row, "Cost Basis Total")),
      averageCostBasis: parseFidelityNumber(col(row, "Average Cost Basis")),
      type: col(row, "Type"),
    });
  }

  return { data, errors };
}

// ─── Historical Trades Parser ─────────────────────────────────────────────────

export function parseHistoricalTrades(
  csvText: string,
): ParseResult<TradeRecord> {
  const errors: string[] = [];
  const rows = parseCsvRows(csvText);

  const found = findHeaderRow(rows, ["Run Date", "Action", "Symbol"]);
  if (!found) {
    return {
      data: [],
      errors: [
        "Could not find header row. Ensure this is a Fidelity Account Activity/History export.",
      ],
    };
  }

  const { headerIndex, headerMap } = found;
  const dataRows = rows.slice(headerIndex + 1);
  const data: TradeRecord[] = [];

  const col = (row: string[], key: string): string =>
    row[headerMap[normalizeHeader(key)]] ?? "";

  for (const row of dataRows) {
    const runDate = col(row, "Run Date").trim();
    // Skip footer/disclaimer rows
    if (!runDate || runDate.startsWith("The") || runDate.startsWith("Date")) {
      continue;
    }

    data.push({
      runDate,
      account: col(row, "Account"),
      action: col(row, "Action"),
      symbol: col(row, "Symbol"),
      securityDescription: col(row, "Security Description"),
      securityType: col(row, "Security Type"),
      quantity: parseFidelityNumber(col(row, "Exchange Quantity")),
      exchangeCurrency: col(row, "Exchange Currency"),
      price: parseFidelityNumber(col(row, "Price")),
      commission: parseFidelityNumber(col(row, "Commission")),
      fees: parseFidelityNumber(col(row, "Fees")),
      accruedInterest: parseFidelityNumber(col(row, "Accrued Interest")),
      amount: parseFidelityNumber(col(row, "Amount")),
      settlementDate: col(row, "Settlement Date"),
    });
  }

  return { data, errors };
}

// ─── Closed Positions Parser ──────────────────────────────────────────────────

export function parseClosedPositions(
  csvText: string,
): ParseResult<ClosedPosition> {
  const errors: string[] = [];
  const rows = parseCsvRows(csvText);

  // Required headers for closed positions file
  const found = findHeaderRow(rows, ["Symbol", "Cost Basis", "Proceeds"]);
  if (!found) {
    return {
      data: [],
      errors: [
        "Could not find header row. Ensure this is a Fidelity Closed Positions export.",
      ],
    };
  }

  const { headerIndex, headerMap } = found;
  const dataRows = rows.slice(headerIndex + 1);
  const data: ClosedPosition[] = [];

  const col = (row: string[], key: string): string =>
    row[headerMap[normalizeHeader(key)]] ?? "";

  for (const row of dataRows) {
    const symbol = col(row, "Symbol").trim();
    // Skip footer/disclaimer rows and totals rows
    if (
      !symbol ||
      symbol.toLowerCase().startsWith("total") ||
      symbol.startsWith("The")
    ) {
      continue;
    }

    data.push({
      accountNumber: col(row, "Account Number"),
      accountName: col(row, "Account Name"),
      symbol,
      description: col(row, "Description"),
      costBasis: parseFidelityNumber(col(row, "Cost Basis")),
      proceeds: parseFidelityNumber(col(row, "Proceeds")),
      shortTermGainLoss: parseFidelityNumber(
        col(row, "Short Term Gain/Loss"),
      ),
      longTermGainLoss: parseFidelityNumber(
        col(row, "Long Term Gain/Loss"),
      ),
      totalGainLoss: parseFidelityNumber(col(row, "Total Term Gain/Loss")),
    });
  }

  return { data, errors };
}

// ─── Aggregate Computation Helpers ───────────────────────────────────────────

export interface PortfolioSummary {
  totalAccountValue: number;
  totalUnrealizedGainLoss: number;
  totalCostBasis: number;
  positionCount: number;
  realizedGainLoss: number | null;
  shortTermGainLoss: number | null;
  longTermGainLoss: number | null;
  /**
   * Net unrealized change over the last 7 calendar days.
   * Computed as the sum of trade amounts (buys are negative, sells positive)
   * within the past 7 days from the most-recent trade date.
   * Represents net capital flow in the window — a proxy for short-term
   * portfolio activity when intraday historical prices aren't available.
   */
  weeklyGainLoss: number | null;
  weeklyGainLossPercent: number | null;
  /**
   * Same methodology as weeklyGainLoss but over the last 30 calendar days.
   */
  monthlyGainLoss: number | null;
  monthlyGainLossPercent: number | null;
}

/**
 * Find the latest trade date in the dataset.
 * Returns null if no parseable dates exist.
 */
function latestTradeDate(trades: TradeRecord[]): Date | null {
  let latest: Date | null = null;
  for (const t of trades) {
    const d = new Date(t.runDate.trim());
    if (!Number.isNaN(d.getTime())) {
      if (latest === null || d > latest) latest = d;
    }
  }
  return latest;
}

/**
 * Sum the net trade amounts (sells positive, buys negative) within
 * [refDate - windowDays, refDate].
 */
function netTradeAmountInWindow(
  trades: TradeRecord[],
  refDate: Date,
  windowDays: number,
): number {
  const cutoff = new Date(refDate.getTime() - windowDays * 24 * 60 * 60 * 1000);
  let total = 0;
  for (const t of trades) {
    const d = new Date(t.runDate.trim());
    if (Number.isNaN(d.getTime())) continue;
    if (d >= cutoff && d <= refDate) {
      total += t.amount;
    }
  }
  return total;
}

export function computePortfolioSummary(
  positions: PortfolioPosition[],
  closedPositions: ClosedPosition[] | null,
  trades: TradeRecord[] | null,
): PortfolioSummary {
  const totalAccountValue = positions.reduce(
    (sum, p) => sum + p.currentValue,
    0,
  );
  const totalCostBasis = positions.reduce((sum, p) => sum + p.costBasisTotal, 0);
  const totalUnrealizedGainLoss = positions.reduce(
    (sum, p) => sum + p.totalGainLossDollar,
    0,
  );

  let realizedGainLoss: number | null = null;
  let shortTermGainLoss: number | null = null;
  let longTermGainLoss: number | null = null;

  if (closedPositions && closedPositions.length > 0) {
    realizedGainLoss = closedPositions.reduce(
      (sum, p) => sum + p.totalGainLoss,
      0,
    );
    shortTermGainLoss = closedPositions.reduce(
      (sum, p) => sum + p.shortTermGainLoss,
      0,
    );
    longTermGainLoss = closedPositions.reduce(
      (sum, p) => sum + p.longTermGainLoss,
      0,
    );
  }

  // Weekly / monthly unrealized G/L derived from trade activity
  let weeklyGainLoss: number | null = null;
  let weeklyGainLossPercent: number | null = null;
  let monthlyGainLoss: number | null = null;
  let monthlyGainLossPercent: number | null = null;

  if (trades && trades.length > 0) {
    const refDate = latestTradeDate(trades) ?? new Date();
    weeklyGainLoss = netTradeAmountInWindow(trades, refDate, 7);
    monthlyGainLoss = netTradeAmountInWindow(trades, refDate, 30);

    // Express as percentage of total account value
    if (totalAccountValue > 0) {
      weeklyGainLossPercent = (weeklyGainLoss / totalAccountValue) * 100;
      monthlyGainLossPercent = (monthlyGainLoss / totalAccountValue) * 100;
    }
  }

  return {
    totalAccountValue,
    totalUnrealizedGainLoss,
    totalCostBasis,
    positionCount: positions.length,
    realizedGainLoss,
    shortTermGainLoss,
    longTermGainLoss,
    weeklyGainLoss,
    weeklyGainLossPercent,
    monthlyGainLoss,
    monthlyGainLossPercent,
  };
}

/**
 * Build cumulative invested capital over time from trade history.
 * Buys add to cumulative cost basis; sells reduce it.
 * Returns array of [date_string, cumulative_invested] sorted by date.
 */
export function buildPerformanceSeries(
  trades: TradeRecord[],
): Array<[string, number]> {
  if (trades.length === 0) return [];

  const sorted = [...trades].sort(
    (a, b) => new Date(a.runDate).getTime() - new Date(b.runDate).getTime(),
  );

  // Negative amount = money out (buy); positive amount = money in (sell/dividend)
  const dailyMap = new Map<string, number>();
  for (const trade of sorted) {
    const date = trade.runDate.trim();
    if (!date || !trade.symbol) continue;
    // Buys: amount is negative — flip sign to track capital deployed
    const delta = trade.amount < 0 ? Math.abs(trade.amount) : 0;
    dailyMap.set(date, (dailyMap.get(date) ?? 0) + delta);
  }

  let cumulative = 0;
  return Array.from(dailyMap.entries()).map(([date, val]) => {
    cumulative += val;
    return [date, cumulative];
  });
}

// ─── Behavioral Analytics ─────────────────────────────────────────────────────

export interface TradingBehaviorStats {
  /** Total number of buy transactions */
  totalBuys: number;
  /** Total number of sell transactions */
  totalSells: number;
  /** Total dollars deployed (buys) */
  totalCapitalDeployed: number;
  /** Total dollars received from sells */
  totalSaleProceeds: number;
  /** Number of trades per month (churn rate indicator) */
  tradesPerMonth: number;
  /** Monthly trade volume breakdown for charting: [month_label, buy_count, sell_count] */
  monthlyActivity: Array<{ month: string; buys: number; sells: number; dividends: number }>;
  /** Average holding period estimate in days (matched buy→sell pairs by symbol) */
  avgHoldingDays: number | null;
  /** Symbols bought and then sold within 30 days (potential wash sale risk) */
  washSaleRiskSymbols: string[];
  /** Top 5 most traded symbols by trade count */
  mostTradedSymbols: Array<{ symbol: string; count: number }>;
  /** Dividend/income transactions */
  totalDividendIncome: number;
}

/**
 * Classify an action string into buy / sell / dividend / other.
 */
function classifyAction(action: string): "buy" | "sell" | "dividend" | "other" {
  const lower = action.toLowerCase();
  if (lower.includes("bought") || lower.includes("buy") || lower.includes("reinvested")) return "buy";
  if (lower.includes("sold") || lower.includes("sell")) return "sell";
  if (lower.includes("dividend") || lower.includes("interest") || lower.includes("income")) return "dividend";
  return "other";
}

/**
 * Parse a date string in M/D/YYYY or MM/DD/YYYY format to a Date object.
 * Returns null for invalid dates.
 */
function parseTradeDate(raw: string): Date | null {
  const trimmed = raw.trim();
  const d = new Date(trimmed);
  return Number.isNaN(d.getTime()) ? null : d;
}

/**
 * Compute rich behavioral analytics from historical trade activity.
 * These metrics power the AI optimization agent's behavioral profiling.
 */
export function computeTradingBehavior(
  trades: TradeRecord[],
): TradingBehaviorStats {
  if (trades.length === 0) {
    return {
      totalBuys: 0,
      totalSells: 0,
      totalCapitalDeployed: 0,
      totalSaleProceeds: 0,
      tradesPerMonth: 0,
      monthlyActivity: [],
      avgHoldingDays: null,
      washSaleRiskSymbols: [],
      mostTradedSymbols: [],
      totalDividendIncome: 0,
    };
  }

  let totalBuys = 0;
  let totalSells = 0;
  let totalCapitalDeployed = 0;
  let totalSaleProceeds = 0;
  let totalDividendIncome = 0;

  // Monthly buckets: key = "YYYY-MM"
  const monthMap = new Map<string, { buys: number; sells: number; dividends: number }>();
  // Symbol → list of buy dates for holding period + wash sale analysis
  const buyDatesBySymbol = new Map<string, Date[]>();
  const sellDatesBySymbol = new Map<string, Date[]>();
  const symbolTradeCounts = new Map<string, number>();

  for (const trade of trades) {
    const type = classifyAction(trade.action);
    const tradeDate = parseTradeDate(trade.runDate);
    const monthKey = tradeDate
      ? `${tradeDate.getFullYear()}-${String(tradeDate.getMonth() + 1).padStart(2, "0")}`
      : "Unknown";

    if (!monthMap.has(monthKey)) {
      monthMap.set(monthKey, { buys: 0, sells: 0, dividends: 0 });
    }
    const bucket = monthMap.get(monthKey)!;

    if (type === "buy") {
      totalBuys++;
      totalCapitalDeployed += Math.abs(trade.amount);
      bucket.buys++;
      if (trade.symbol && tradeDate) {
        const existing = buyDatesBySymbol.get(trade.symbol) ?? [];
        existing.push(tradeDate);
        buyDatesBySymbol.set(trade.symbol, existing);
      }
    } else if (type === "sell") {
      totalSells++;
      totalSaleProceeds += Math.abs(trade.amount);
      bucket.sells++;
      if (trade.symbol && tradeDate) {
        const existing = sellDatesBySymbol.get(trade.symbol) ?? [];
        existing.push(tradeDate);
        sellDatesBySymbol.set(trade.symbol, existing);
      }
    } else if (type === "dividend") {
      totalDividendIncome += Math.abs(trade.amount);
      bucket.dividends++;
    }

    if (trade.symbol && type !== "other") {
      symbolTradeCounts.set(
        trade.symbol,
        (symbolTradeCounts.get(trade.symbol) ?? 0) + 1,
      );
    }
  }

  // Monthly activity sorted by date
  const monthlyActivity = Array.from(monthMap.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([month, v]) => ({ month, ...v }));

  // Trades per month
  const uniqueMonths = monthlyActivity.length;
  const tradesPerMonth =
    uniqueMonths > 0 ? (totalBuys + totalSells) / uniqueMonths : 0;

  // Average holding period: match first buy → first sell per symbol
  const holdingDays: number[] = [];
  for (const [symbol, buyDates] of buyDatesBySymbol.entries()) {
    const sellDates = sellDatesBySymbol.get(symbol);
    if (!sellDates || sellDates.length === 0) continue;
    const firstBuy = buyDates.sort((a, b) => a.getTime() - b.getTime())[0];
    const firstSell = sellDates.sort((a, b) => a.getTime() - b.getTime())[0];
    if (firstSell > firstBuy) {
      const days = Math.round(
        (firstSell.getTime() - firstBuy.getTime()) / (1000 * 60 * 60 * 24),
      );
      holdingDays.push(days);
    }
  }
  const avgHoldingDays =
    holdingDays.length > 0
      ? Math.round(holdingDays.reduce((s, d) => s + d, 0) / holdingDays.length)
      : null;

  // Wash sale risk: symbol sold then repurchased within 30 days
  const washSaleRiskSymbols: string[] = [];
  for (const [symbol, sellDates] of sellDatesBySymbol.entries()) {
    const buyDates = buyDatesBySymbol.get(symbol);
    if (!buyDates) continue;
    for (const sellDate of sellDates) {
      const hasWashBuy = buyDates.some((buyDate) => {
        const diffDays = Math.abs(
          (buyDate.getTime() - sellDate.getTime()) / (1000 * 60 * 60 * 24),
        );
        // 30-day window before or after the sell (IRS wash sale rule)
        return diffDays <= 30 && buyDate > sellDate;
      });
      if (hasWashBuy && !washSaleRiskSymbols.includes(symbol)) {
        washSaleRiskSymbols.push(symbol);
        break;
      }
    }
  }

  // Top 5 most traded symbols
  const mostTradedSymbols = Array.from(symbolTradeCounts.entries())
    .sort(([, a], [, b]) => b - a)
    .slice(0, 5)
    .map(([symbol, count]) => ({ symbol, count }));

  return {
    totalBuys,
    totalSells,
    totalCapitalDeployed,
    totalSaleProceeds,
    tradesPerMonth: Number(tradesPerMonth.toFixed(1)),
    monthlyActivity,
    avgHoldingDays,
    washSaleRiskSymbols,
    mostTradedSymbols,
    totalDividendIncome,
  };
}
