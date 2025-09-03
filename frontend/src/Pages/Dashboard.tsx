import React, { useEffect, useRef, useState } from "react";
import axios from "axios";
import { store } from "../store/globalStore";

const API_BASE = import.meta.env.VITE_BACKEND_URL ?? "";

// normalize array-like responses
const normalizeToArray = (payload: any): any[] => {
  if (Array.isArray(payload)) return payload;
  if (!payload) return [];
  if (Array.isArray(payload.assets)) return payload.assets;
  if (Array.isArray(payload.data)) return payload.data;
  if (Array.isArray(payload.result)) return payload.result;
  if (Array.isArray(payload.items)) return payload.items;
  if (Array.isArray(payload.trades)) return payload.trades;
  return [];
};

// normalize instruments
const normalizeInstrument = (ins: any) => {
  const symbol = ins.symbol ?? ins.Symbol ?? ins.name ?? ins.ticker ?? "";
  const bid =
    ins.bid ??
    ins.sellPrice ??
    ins.sell_price ??
    ins.sell ??
    ins.bestBid ??
    "";
  const ask =
    ins.ask ?? ins.buyPrice ?? ins.buy_price ?? ins.buy ?? ins.bestAsk ?? "";
  const id = ins.id ?? ins.assetId ?? ins.asset_id ?? undefined;
  return { id, symbol, bid, ask, raw: ins };
};

// normalize trades
const normalizeTrade = (t: any, fallbackSymbol?: string) => {
  return {
    orderId: t.orderId ?? t.id ?? undefined,
    symbol: t.symbol ?? t.Symbol ?? t.asset ?? fallbackSymbol ?? "UNKNOWN",
    type: t.type ?? "buy",
    margin: Number(t.margin ?? 0),
    leverage: t.leverage ?? null,
    openPrice: t.openPrice ?? null,
    raw: t,
  };
};

const Dashboard: React.FC = () => {
  const chartRef = useRef<HTMLDivElement | null>(null);

  const [selectedSymbol, setSelectedSymbol] = useState<string>("BTCUSDT");
  const [type, setType] = useState<"buy" | "sell">("buy");
  const [margin, setMargin] = useState<number>(1);

  const [instruments, setInstruments] = useState<any[]>([
    { symbol: "BTCUSDT", bid: "109,029.94", ask: "109,051.54" },
    { symbol: "SOLUSDT", bid: "24.65", ask: "24.72" },
  ]);
  const [positionsOpen, setPositionsOpen] = useState<any[]>([]);

  const getAuthHeaders = () => {
    const token = store.getState()?.token;
    return token ? { Authorization: `Bearer ${token}` } : {};
  };

  // load instruments + open trades
  useEffect(() => {
    let cancelled = false;

    async function loadInitialData() {
      try {
        const insRes = await axios.get(`${API_BASE}/assets`, {
          headers: { ...getAuthHeaders() },
        });
        console.log("instruments raw response:", insRes.data);

        const list = normalizeToArray(insRes.data);
        const normalized = list.map(normalizeInstrument);
        if (!cancelled && normalized.length) setInstruments(normalized);
      } catch (err) {
        console.warn("Failed to fetch instruments, using fallback list", err);
      }

      try {
        const posRes = await axios.get(`${API_BASE}/trade/open`, {
          headers: { ...getAuthHeaders() },
        });
        console.log("positions raw response:", posRes.data);

        const tradesPayload = posRes.data?.trades ?? posRes.data;
        const tradesArray = normalizeToArray(tradesPayload);
        const normalizedTrades = tradesArray.map((t) =>
          normalizeTrade(t, selectedSymbol)
        );
        if (!cancelled) setPositionsOpen(normalizedTrades);
      } catch (err) {
        console.warn("Failed to fetch positions", err);
      }
    }

    loadInitialData();
    return () => {
      cancelled = true;
    };
  }, []);

  // place order
  async function placeOrder() {
    if (!margin || isNaN(margin) || margin <= 0) {
      alert("Please enter a valid margin (USD) greater than 0");
      return;
    }

    try {
      const res = await axios.post(
        `${API_BASE}/trade/open`,
        { asset: selectedSymbol, type, margin, leverage: 10 },
        { headers: { ...getAuthHeaders() } }
      );

      console.log("placeOrder response:", res.data);

      const tradesArr = Array.isArray(res.data?.trades)
        ? res.data.trades
        : [res.data];
      const newTrades = tradesArr.map((t:any) =>
        normalizeTrade(t, selectedSymbol)
      );
      setPositionsOpen((prev) => [...newTrades, ...prev]);
    } catch (err) {
      console.error("Failed to place order", err);
      alert("Order failed. See console for details.");
    }
  }

  // close order
  async function closePosition(orderId: number | string) {
    const prev = positionsOpen;
    setPositionsOpen((p) => p.filter((x) => x.orderId !== orderId));

    const endpoint = `${API_BASE}/trade/${orderId}/close`;

    try {
      await axios.post(endpoint, {}, { headers: { ...getAuthHeaders() } });
    } catch (err) {
      console.warn(`Close trade failed`, err);
      setPositionsOpen(prev);
      alert("Failed to close position on server.");
    }
  }

  const safeInstruments = Array.isArray(instruments)
    ? instruments.map(normalizeInstrument)
    : [];
  const safePositions = Array.isArray(positionsOpen) ? positionsOpen : [];

  return (
    <div className="min-h-screen bg-black/80 backdrop-blur-sm text-white flex flex-col">
      {/* header */}
      <header className="flex items-center justify-between px-4 py-3 border-b border-white/5">
        <div className="flex items-center gap-3">
          <div className="text-yellow-300 font-bold text-lg">Exness</div>
        </div>
        <div className="flex items-center gap-4">
          <div className="text-sm text-gray-400">Demo</div>
          <div className="text-sm">
            Balance: <span className="font-medium">$921.42</span>
          </div>
          <button className="bg-yellow-400 text-black px-3 py-1 rounded">
            Deposit
          </button>
        </div>
      </header>

      {/* main */}
      <main className="flex-1 p-4">
        <div className="grid grid-cols-12 gap-4">
          {/* instruments */}
          <aside className="col-span-12 md:col-span-2 bg-black/40 backdrop-blur-md border border-white/5 rounded-xl p-3 h-auto md:h-[78vh] overflow-auto">
            <div className="mb-3">
              <input
                aria-label="Search instruments"
                placeholder="Search"
                className="w-full p-2 rounded bg-black/30 placeholder-gray-400 text-sm"
              />
            </div>
            <div className="space-y-2">
              {safeInstruments.map((ins, idx) => (
                <button
                  key={ins.id ?? ins.symbol ?? `ins-${idx}`}
                  onClick={() => setSelectedSymbol(ins.symbol)}
                  className={`w-full text-left p-2 rounded flex justify-between items-center cursor-pointer ${
                    selectedSymbol === ins.symbol ? "bg-black/50" : "bg-transparent"
                  }`}
                >
                  <div className="text-sm">{ins.symbol}</div>
                  <div className="text-right text-xs">
                    <div className="text-green-400">{ins.bid}</div>
                    <div className="text-gray-400">{ins.ask}</div>
                  </div>
                </button>
              ))}
            </div>
          </aside>

          {/* chart + positions */}
          <section className="col-span-12 md:col-span-7 bg-black/40 backdrop-blur-md border border-white/5 rounded-xl p-3 flex flex-col h-auto md:h-[78vh]">
            <div className="flex items-center justify-between mb-3">
              <div className="text-lg font-semibold">{selectedSymbol} • 1m</div>
            </div>
            <div
              ref={chartRef}
              id="tv-chart"
              className="flex-1 bg-black/60 rounded-lg border border-white/6 flex items-center justify-center"
            >
              <div className="text-gray-400 text-sm">
                Chart loading... (install lightweight-charts for full chart)
              </div>
            </div>
            <div className="mt-3 bg-black/50 p-3 rounded">
              <div className="flex items-center justify-between mb-2">
                <div className="text-sm text-gray-300">Open</div>
                <div className="text-sm text-gray-400">
                  {safePositions.length} open
                </div>
              </div>
              <div className="h-28 overflow-auto">
                {safePositions.length === 0 ? (
                  <div className="flex items-center justify-center h-full text-gray-500">
                    No open positions
                  </div>
                ) : (
                  safePositions.map((pos, idx) => (
                    <div
                      key={pos.orderId ?? `pos-${idx}`}
                      className="p-2 border-b border-white/5 flex justify-between items-center"
                    >
                      <div className="text-sm">
                        {pos.symbol} — {pos.type?.toUpperCase?.() ?? pos.type} — $
                        {pos.margin.toFixed(2)}
                        <div className="text-xs text-gray-400">
                          Lev: {pos.leverage ?? "-"} • Price:{" "}
                          {pos.openPrice ?? "-"}
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => closePosition(pos.orderId)}
                          className="text-xs px-2 py-1 bg-black/30 rounded"
                        >
                          Close
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </section>

          {/* order panel */}
          <aside className="col-span-12 md:col-span-3 bg-black/40 backdrop-blur-md border border-white/5 rounded-xl p-3 h-auto md:h-[78vh] flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between mb-3">
                <div className="text-sm font-semibold">{selectedSymbol}</div>
              </div>
              <div className="flex gap-2 mb-3">
                <button
                  onClick={() => setType("sell")}
                  className={`flex-1 py-2 rounded ${
                    type === "sell" ? "bg-red-600" : "bg-black/30"
                  }`}
                >
                  Sell
                </button>
                <button
                  onClick={() => setType("buy")}
                  className={`flex-1 py-2 rounded ${
                    type === "buy" ? "bg-green-600" : "bg-black/30"
                  }`}
                >
                  Buy
                </button>
              </div>
              <div className="mb-3">
                <label className="text-xs text-gray-400">Margin (USD)</label>
                <div className="flex items-center gap-2 mt-1">
                  <button
                    aria-label="decrease"
                    onClick={() =>
                      setMargin((v) => Math.max(0.01, +(v - 1).toFixed(2)))
                    }
                    className="px-2 py-1 bg-black/30 rounded"
                  >
                    -
                  </button>
                  <input
                    aria-label="margin"
                    type="number"
                    placeholder={`${margin}`}
                   
                    value={margin}
                    onChange={(e) => setMargin(Number(e.target.value))}
                    className="w-full p-2 rounded bg-black/30 text-white"
                  />
                  <button
                    aria-label="increase"
                    onClick={() => setMargin((v) => +(v + 1).toFixed(2))}
                    className="px-2 py-1 bg-black/30 rounded"
                  >
                    +
                  </button>
                </div>
              </div>
              <div className="mb-3">
                <button
                  onClick={placeOrder}
                  className="w-full py-3 rounded bg-yellow-400 text-black font-semibold"
                >
                  {type === "buy" ? "Buy" : "Sell"} {selectedSymbol}
                </button>
              </div>
            </div>
            <div className="text-xs text-gray-400">
              <div className="mb-1">
                Margin used: $
                {safePositions
                  .reduce((s, p) => s + (p.margin || 0), 0)
                  .toFixed(2)}
              </div>
              <div>Equity: 921.42 USD — Free Margin: 921.42 USD</div>
            </div>
          </aside>
        </div>
      </main>
    </div>
  );
};

export default Dashboard;
