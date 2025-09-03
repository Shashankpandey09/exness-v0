type Trade = {
  tradeId: string;
  type: string; // buy/sell
  margin: number;
  openPrice: number;
  status: string; // open/closed
  leverage:number;
  userId:number
};

export class TradeStoreManager {
  private static trade_instance: TradeStoreManager;
  private OpenTrades = new Map<string, Trade[]>();

  private constructor() {}

  public static getInstance() {
    if (!TradeStoreManager.trade_instance) {
      TradeStoreManager.trade_instance = new TradeStoreManager();
    }
    return TradeStoreManager.trade_instance;
  }

  public addOpenTrade(symbol: string, tradeId: string, type: string, margin: number, openPrice: number, status: string,leverage:number,userId:number) {
    const trades = this.OpenTrades.get(symbol) || [];
    trades.push({ tradeId, type, margin, openPrice, status,leverage,userId });
    this.OpenTrades.set(symbol, trades);
  }

  public closeTrade(symbol: string, tradeId: string) {
    const trades = this.OpenTrades.get(symbol) || [];
    if (trades.length === 0) return;
    const newTrades = trades.filter((t) => t.tradeId !== tradeId);
    this.OpenTrades.set(symbol, newTrades);
  }

  public getTrades(symbol: string): Trade[] {
    return this.OpenTrades.get(symbol) || [];
  }
  public GetOpenTrades(){
    return this.OpenTrades
  }
}
