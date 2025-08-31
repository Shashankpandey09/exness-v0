import { Router } from "express";
import z from "zod";
import { Response } from "express";
import { authenticate, AuthenticatedRequest } from "../middleware/Authenticate";
import { PriceStore } from "../lib/PriceStore";
import { calcQuantity } from "../utils/calc";
import { prisma } from "../lib/prisma";
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
    const userId = Number(req.userId);
    const { asset, type, margin, leverage } = req.body;
    if (!userId || !asset || !type || !margin || !leverage) {
      return res.json({ message: "incorrect Inputs" }).status(411);
    }
    const { success } = OPEN_TRADE_SCHEMA.safeParse(req.body);
    if (!success) return res.json({ message: "incorrect Inputs" }).status(411);
    if (type !== "buy" && type !== "sell") {
      return res.status(411).json({ message: "Incorrect inputs" });
    }
    const quote = PriceStore.getInstance().getPrices(asset);
    if (!quote)
      return res.status(411).json({ message: "No price yet for symbol" });

    const balance = await PriceStore.getInstance().getUserBalance(userId);
    if (balance < margin || margin <= 10.0) {
      return res.json({ message: "Not sufficient balance" }).status(400);
    }
    //calc quantity
    const quantity = calcQuantity(
      margin,
      leverage,
      type == "buy"
        ? PriceStore.getInstance().getPrices(asset)!.buy
        : PriceStore.getInstance().getPrices(asset)!.sell
    );
    if (quantity < 0.01 && quantity > 200) {
      return res.json({ message: " quantity not in range" }).status(400);
    }
    //getting assest id
    const Asset: { id: number } | null = await prisma.asset.findUnique({
      where: { symbol: asset },
      select: { id: true },
    });
    if (!Asset)
      return res.json({ message: "Asset does not exist" }).status(400);
    //now opening trade we need to deduct balance and create an order in transactions
    const transactions = await prisma.$transaction(async (ctx) => {
      //opening an order
      await ctx.userTrades.create({
        data: {
          userId: userId,
          assetId: Asset.id,
          type: type,
          margin: margin,
          leverage: leverage,
          openPrice: PriceStore.getInstance().getPrices(asset)!.buy,
          status: "open",
        },
      });
      //deduct balance
      const new_balance = Number(balance.toFixed(4)) - margin;
      const UPDATED_BALANCE = await ctx.user.update({
        where: { id: userId },
        data: { usd_balance: new_balance },
        select: { usd_balance: true },
      });
      return UPDATED_BALANCE;
    });
    return res
      .json({
        message: "Trade opened successfully",
        new_Balance: transactions.usd_balance,
      })
      .status(200);
  }
);
//getting orders which are open
tradesRouter.get(
  "/open",
  authenticate,
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const data = await prisma.userTrades.findMany({
        where: { status: "open" },
      });
      const filteredData = data.map((r) => ({
        orderId: r.id,
        type: r.type,
        margin: r.margin, // decimal is 2, so this means 500$
        leverage: r.leverage, // so the user is trying to buy $5000 of exposure
        openPrice: r.openPrice,
      }));
      return res.json({ trades: filteredData }).status(200);
    } catch (error) {
      console.log(error);
      return res.status(500);
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
      });
      const filteredData = data.map((r) => ({
        orderId: r.id,
        type: r.type,
        margin: r.margin, // decimal is 2, so this means 500$
        leverage: r.leverage, // so the user is trying to buy $5000 of exposure
        openPrice: r.closePrice,
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
  async (req: AuthenticatedRequest, res) => {
    try {
      const id = String(req.params.id);
      const trade = await prisma.userTrades.findUnique({
        where: { id },
        include: { asset: true },
      });
      if (!trade) return res.status(404).json({ message: "Trade not found" });
      if (trade.status !== "open")
        return res.status(411).json({ message: "Already closed" });

      const quote = PriceStore.getInstance().getPrices(trade.asset.symbol);
      if (!quote)
        return res.status(411).json({ message: "No price yet for symbol" });

      // Opposite side for exit:
      const exit = trade.type === "buy" ? quote.sell : quote.buy;

      // qty from margin & leverage & entry price (simple):
      const margin = Number(trade.margin);
      const leverage = Number(trade.leverage);
      const entry = Number(trade.openPrice);
      const qty = calcQuantity(margin, leverage, entry);

      const sign = trade.type === "buy" ? +1 : -1;
      const pnl = sign * (exit - entry) * qty;
      //if pnl is less basically loss is greater than 0.9 percent of margin close the trades
      const Balance = Number(
        await PriceStore.getInstance().getUserBalance(Number(req.userId))
      )
      const new_Balance=Balance+margin+pnl
      await prisma.$transaction(async (ctx) => {
        await ctx.userTrades.update({
          where: { id },
          data: {
            closePrice: exit.toFixed(4),
            pnl: pnl.toFixed(2),
            status: "closed",
          },
        });
        await ctx.user.update({
          where: { id: Number(req.userId) },
          data: { usd_balance: Number(new_Balance) },
        });
      });

      return res
        .json({ ok: true, message: "trade closed successfully " })
        .status(200);
    } catch (e) {
      console.error(e);
      res.status(500).json({ message: "Server error" });
    }
  }
);
