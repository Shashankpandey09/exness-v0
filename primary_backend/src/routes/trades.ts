import { Router } from "express";
import z from "zod";
import { Response } from "express";
import { authenticate, AuthenticatedRequest } from "../middleware/Authenticate";
import { PriceStore } from "../lib/PriceStore";
import { calcQuantity } from "../utils/calc";
import { prisma } from "../lib/prisma";
import { TradeStoreManager } from "../lib/TradesStore";
export const tradesRouter = Router();
//routes related to trades will be here
//getting list of open trade and close trades for a user
const OPEN_TRADE_SCHEMA = z.object({
  asset: z.string("Symbol for asset is missing"),
  type: z.string(),
  margin: z.number(),
  leverage: z.number().min(1).max(10),
});
tradesRouter.post(
  "/open",
  authenticate,
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const userId = Number(req.userId);
      const { asset, type, margin, leverage } = req.body;

      if (!userId || !asset || !type || !margin || !leverage) {
        return res.status(411).json({ message: "Incorrect inputs" });
      }

      const { success } = OPEN_TRADE_SCHEMA.safeParse(req.body);
      if (!success)
        return res.status(411).json({ message: "Incorrect inputs" });

      if (type !== "buy" && type !== "sell") {
        return res.status(411).json({ message: "Trade type must be buy/sell" });
      }

      const quote = PriceStore.getInstance().getPrices(asset);
      if (!quote)
        return res.status(411).json({ message: "No price yet for symbol" });

      const balance = await PriceStore.getInstance().getUserBalance(userId);
      if (balance < margin || margin <= 10.0) {
        return res.status(400).json({ message: "Not sufficient balance" });
      }

      // Determine entry price
      const entryPrice = type === "buy" ? quote.buy : quote.sell;

      // Calculate quantity
      const quantity = calcQuantity(margin, leverage, entryPrice);
      if (quantity < 0.01 || quantity > 200) {
        return res.status(400).json({ message: "Quantity not in range" });
      }

      // Get asset id
      const Asset = await prisma.asset.findUnique({
        where: { symbol: asset },
        select: { id: true },
      });
      if (!Asset)
        return res.status(400).json({ message: "Asset does not exist" });

      // Create open trade instantly in memory
      const tradeId = crypto.randomUUID();
      TradeStoreManager.getInstance().addOpenTrade(
        asset,
        tradeId,
        type,
        margin,
        entryPrice,
        "open",
        leverage,
        userId
      );

      // Deduct balance in memory
      const new_balance = balance - margin;
      PriceStore.getInstance().updateBalance(userId, new_balance);

      // Respond instantly (low latency)
      res.status(200).json({
        message: "Trade opened successfully (pending persistence)",
        tradeId,
        new_Balance: new_balance, // convert Decimal -> number for response
      });

      // Persist asynchronously in DB
      (async () => {
        try {
          await prisma.$transaction(async (ctx) => {
            await ctx.userTrades.create({
              data: {
                id: tradeId,
                userId,
                assetId: Asset.id,
                type,
                margin,
                leverage,
                openPrice: entryPrice,
                status: "open",
              },
            });

            await ctx.user.update({
              where: { id: userId },
              data: { usd_balance: new_balance },
            });
          });

          console.log(`✅ Trade ${tradeId} persisted to DB.`);
        } catch (err) {
          console.error("❌ Failed to persist trade:", err);
          // optional: mark this trade as "pending-sync" in memory
        }
      })();
    } catch (err) {
      console.error("Error opening trade:", err);
      return res
        .status(500)
        .json({ message: "Server error while opening trade" });
    }
  }
);

//getting existing closed orders
tradesRouter.get(
  "/closed",
  authenticate,
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const data = await prisma.userTrades.findMany({
        where: { status: "closed" },
        include: { asset: { select: { symbol: true } } },
      });
      const filteredData = data.map((r) => ({
        orderId: r.id,
        type: r.type,
        margin: r.margin, // decimal is 2, so this means 500$
        leverage: r.leverage, // so the user is trying to buy $5000 of exposure
        openPrice: r.closePrice,
        symbol: r.asset.symbol,
      }));
      return res.json({ trades: filteredData }).status(200);
    } catch (error) {
      console.log("error while getting closed trades", error);
      return res.status(500);
    }
  }
);
tradesRouter.post(
  "/:id/close",
  authenticate,
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const id = String(req.params.id);
      //user send symbol
      const { symbol } = req.body;
      // Get latest quote
      const quote = PriceStore.getInstance().getPrices(symbol);
      if (!quote)
        return res.status(400).json({ message: "No price yet for symbol" });
      // Fetch trade
      const trade = await prisma.userTrades.findUnique({
        where: { id },
        include: { asset: true },
      });
      if (!trade) return res.status(404).json({ message: "Trade not found" });
      if (trade.status !== "open" || trade.asset.symbol !== symbol) {
        return res
          .status(400)
          .json({
            message:
              trade.status !== "open"
                ? "Trade already closed"
                : "Symbol mismatch",
          });
      }

      // Exit price (opposite side)
      const exit = trade.type === "buy" ? quote.sell : quote.buy;

      // Qty from margin, leverage, entry price
      const margin = Number(trade.margin);
      const leverage = Number(trade.leverage);
      const entry = Number(trade.openPrice);
      const qty = calcQuantity(margin, leverage, entry);

      // PnL calc
      const sign = trade.type === "buy" ? +1 : -1;
      const pnl = sign * (exit - entry) * qty;

      // Current balance
      const balance = await PriceStore.getInstance().getUserBalance(
        Number(req.userId)
      );

      // New balance after trade close
      const newBalance = balance + margin + pnl;

      // ✅ Close trade in memory first (fast UX)
      TradeStoreManager.getInstance().closeTrade(trade.asset.symbol, trade.id);
      PriceStore.getInstance().updateBalance(Number(req.userId), newBalance);

      res.status(200).json({
        ok: true,
        message: "Trade closed successfully",
        pnl: parseFloat(pnl.toFixed(2)),
        balanceAfter: parseFloat(newBalance.toFixed(2)),
      });

      //  Persist asynchronously to DB
      (async () => {
        try {
          await prisma.$transaction(async (ctx) => {
            await ctx.userTrades.update({
              where: { id },
              data: {
                closePrice: parseFloat(exit.toFixed(4)),
                pnl: parseFloat(pnl.toFixed(2)),
                status: "closed",
              },
            });
            await ctx.user.update({
              where: { id: Number(req.userId) },
              data: { usd_balance: parseFloat(newBalance.toFixed(2)) },
            });
          });
          console.log(`✅ Trade ${trade.id} closed + persisted to DB.`);
        } catch (err) {
          console.error("❌ Failed to persist closed trade:", err);
        }
      })();
    } catch (e) {
      console.error("Error closing trade:", e);
      res.status(500).json({ message: "Server error while closing trade" });
    }
  }
);
