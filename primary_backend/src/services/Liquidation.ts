import { PriceStore } from "../lib/PriceStore";
import { TradeStoreManager } from "../lib/TradesStore";
import { calcQuantity } from "../utils/calc";

export function liquidation() {
  setInterval(() => {
    const OpenTrades = TradeStoreManager.getInstance().GetOpenTrades();

    for (const [symbol, trades] of OpenTrades) {
      if (trades.length === 0) continue;

      const quote = PriceStore.getInstance().getPrices(symbol);
      if (!quote) continue;

      trades.forEach(async(trade) => {
        const { type, margin, openPrice, leverage } = trade;

        // Calculate quantity
        const quantity = calcQuantity(margin, leverage, openPrice);

        // Sign for direction
        const sign = type === "buy" ? +1 : -1;

        // Current exit price
        const exit = type === "buy" ? quote.sell : quote.buy;

        // PnL
        const pnl = sign * (exit - openPrice) * quantity;

        // Liquidation condition: loss >= 90% of margin
        if (pnl <= -0.9 * margin) {
          TradeStoreManager.getInstance().closeTrade(symbol, trade.tradeId);

          // ⚠️ TODO: update balance here also!
        const balance=await PriceStore.getInstance().getUserBalance(trade.userId)
        const new_balance=balance+margin+pnl 
      PriceStore.getInstance().updateBalance(trade.userId,new_balance)         
        }
      });
    }
  }, 100); // safer than 10ms
}
