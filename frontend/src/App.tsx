import "./App.css";
import { useEffect, useState } from "react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

type PriceBar = {
  date: string;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
};

type StockHistory = {
  symbol: string;
  company_name: string;
  currency: string;
  source: string;
  bars: PriceBar[];
};

function App() {

    const [apiStatus, setApiStatus] = useState("Checking backend...");
    const [stock, setStock] = useState<StockHistory | null>(null);
    const [stockError, setStockError] = useState("");
    const [searchInput, setSearchInput] = useState("AAPL");
    const [selectedSymbol, setSelectedSymbol] = useState("AAPL");

  useEffect(() => {
    const controller = new AbortController();

    async function checkBackend() {
      try {
        const response = await fetch("http://127.0.0.1:8000/health", {
          signal: controller.signal,
        });

        if (!response.ok) {
          throw new Error(`HTTP error: ${response.status}`);
        }

        const data = await response.json();

        if (data.status !== "ok") {
          throw new Error("Unexpected health response");
        }

        setApiStatus("Backend connected");
      } catch {
        if (!controller.signal.aborted) {
          setApiStatus("Cannot reach backend");
        }
      }
    }

    checkBackend();

    return () => controller.abort();
  }, []);
  useEffect(() => {
  const controller = new AbortController();

  async function loadStock() {
    setStock(null);
    setStockError("");
    try {
      const response = await fetch(
  `http://127.0.0.1:8000/stocks/${encodeURIComponent(selectedSymbol)}/history`,
  { signal: controller.signal }
);

      if (!response.ok) {
         if (response.status === 404) {
            throw new Error(`Unsupported symbol: ${selectedSymbol}. Try AAPL or MSFT`);
      }

  throw new Error(`Could not load stock data (${response.status})`);
}

      const data: StockHistory = await response.json();

      if (!Array.isArray(data.bars) || data.bars.length === 0) {
        throw new Error("No price history available");
      }

      setStock(data);
    } catch (error) {
      if (!controller.signal.aborted) {
        setStockError(
          error instanceof Error ? error.message : "Could not load stock data"
        );
      }
    }
  }

  loadStock();

  return () => controller.abort();
}, [selectedSymbol]);

const latestBar = stock?.bars[stock.bars.length - 1];

const chartData = (stock?.bars ?? []).map((bar, index, bars) => {
  const window = bars.slice(Math.max(0, index - 29), index + 1);

  return {
    ...bar,
    sma30:
      window.length === 30
        ? window.reduce((sum, item) => sum + item.close, 0) / 30
        : null,
  };
});

const recentBars = stock?.bars.slice(-30) ?? [];

const movingAverage30 =
  recentBars.length === 30
    ? recentBars.reduce((sum, bar) => sum + bar.close, 0) / 30
    : null;

const averageComparison =
  latestBar && movingAverage30 !== null
    ? latestBar.close > movingAverage30
      ? "Above average"
      : latestBar.close < movingAverage30
        ? "Below average"
        : "At average"
    : "Requires 30 trading days";




const previousBar = stock?.bars[stock.bars.length - 2];

const changePercent =
  latestBar && previousBar && previousBar.close > 0
    ? ((latestBar.close - previousBar.close) / previousBar.close) * 100
    : null;
  return (
    <div className="app">
      <nav className="navbar">
        <h1>MarketPulse</h1>

        <form className="search" onSubmit={(event) => {
            event.preventDefault();
            const symbol = searchInput.trim().toUpperCase();

          if (symbol) {
            setSearchInput(symbol);
            setSelectedSymbol(symbol);
           }
          }}
>
  <input
    type="text"
    aria-label="Stock symbol"
    placeholder="Search stock symbol..."
    value={searchInput}
    onChange={(event) => setSearchInput(event.target.value)}
    maxLength={20}
    required
  />
  <button type="submit">Search</button>
</form>
      </nav>

      <main className="dashboard">
        <p role="status">{apiStatus}</p>
        <p> Historical daily prices from Yahoo Finance. Predictions are not available yet.</p>
        <section className="stock-header">
  <div>
    <p className="ticker">{stock?.symbol ?? "—"}</p>
    <h2>{stock?.company_name ?? (stockError ? "Stock unavailable" : "Loading stock...")}
</h2>
    {stockError && <p role="alert">{stockError}</p>}
  </div>

  <div>
    <h2>
      {latestBar
        ? new Intl.NumberFormat("en-US", {
            style: "currency",
            currency: stock?.currency ?? "USD",
          }).format(latestBar.close)
        : "—"}
    </h2>

    <p
      style={{
        color:
          changePercent === null
            ? "inherit"
            : changePercent >= 0
              ? "#22c55e"
              : "#ef4444",
      }}
    >
      {changePercent === null
        ? "—"
        : `${changePercent >= 0 ? "+" : ""}${changePercent.toFixed(2)}%`}
    </p>

    {latestBar && <small>Daily Bar on: {latestBar.date}</small>}
  </div>
</section>

        <section className="chart-card">
  <h3>Daily Closing Price - Past 6 Months</h3>

  {stock ? (
    <div style={{ width: "100%", height: 320, minWidth: 0 }}>
      <ResponsiveContainer width="100%" height="100%">
        <LineChart
          data={chartData}
          margin={{ top: 20, right: 30, bottom: 15, left: 10 }}
        >
          <CartesianGrid stroke="#334155" strokeDasharray="3 3" />

          <XAxis
            dataKey="date"
            stroke="#94a3b8"
            tickFormatter={(date: string) => date.slice(5)}
          />

          <YAxis
            stroke="#94a3b8"
            width={85}
            domain={["dataMin - 1", "dataMax + 1"]}
            tickFormatter={(value: number) => `$${value.toFixed(2)}`}
          />

          <Tooltip
            formatter={(value) =>
              typeof value === "number" ? `$${value.toFixed(2)}` : "-"
            }
            contentStyle={{
              backgroundColor: "#0f172a",
              border: "1px solid #475569",
              borderRadius: 8,
              color: "#f8fafc",
            }}
          />

          <Line
            type="linear"
            dataKey="close"
            name="Closing price (USD)"
            stroke="#38bdf8"
            strokeWidth={3}
            dot={false}
            activeDot={{ r: 7 }}
            isAnimationActive={false}
          />
          <Line
              type="linear"
              dataKey="sma30"
              name="30-day average (USD)"
              stroke="#fbbf24"
              strokeWidth={2}
              dot={false}
              connectNulls={false}
              isAnimationActive={false}
          />

          
        </LineChart>
      </ResponsiveContainer>
    </div>
  ) : (
    <p>
      {stockError
        ? "No chart available for this search."
        : "Loading chart..."}
    </p>
  )}
</section>

        <section className="cards">
  <div className="card">
    <p>RSI</p>
    <h3>—</h3>
    <span>Not calculated yet</span>
  </div>

  <div className="card">
    <p>30-Trading-Day Average</p>
    <h3>
      {movingAverage30 !== null
        ? `$${movingAverage30.toFixed(2)}`
        : "-"}
    </h3>
    <span>{averageComparison}</span>
  </div>

  <div className="card">
    <p>Daily Volume</p>
    <h3>
      {latestBar ? latestBar.volume.toLocaleString("en-US") : "—"}
    </h3>
    <span>
      {latestBar ? `Shares on ${latestBar.date}` : "No data loaded"}
    </span>
  </div>
</section>

        <section className="prediction-card">
  <p>MODEL STATUS</p>
  <h2>Not trained yet</h2>
  <p>
    Predictions will appear after we build and evaluate the model.
  </p>
</section>
      </main>
    </div>
  );
}

export default App;