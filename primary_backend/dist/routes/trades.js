"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.tradesRouter = void 0;
const express_1 = require("express");
const zod_1 = __importDefault(require("zod"));
const Authenticate_1 = require("../middleware/Authenticate");
const PriceStore_1 = require("../lib/PriceStore");
const calc_1 = require("../utils/calc");
const prisma_1 = require("../lib/prisma");
exports.tradesRouter = (0, express_1.Router)();
//routes related to trades will be here
//getting list of open trade and close trades for a user
const OPEN_TRADE_SCHEMA = zod_1.default.object({
    asset: zod_1.default.string("Symbol for asset is missing"),
    type: zod_1.default.string(),
    margin: zod_1.default.number(),
    leverage: zod_1.default.number().min(1).max(10),
});
exports.tradesRouter.post("/open", Authenticate_1.authenticate, (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const userId = Number(req.userId);
    const { asset, type, margin, leverage } = req.body;
    if (!userId || !asset || !type || !margin || !leverage) {
        return res.json({ message: "incorrect Inputs" }).status(411);
    }
    const { success } = OPEN_TRADE_SCHEMA.safeParse(req.body);
    if (!success)
        return res.json({ message: "incorrect Inputs" }).status(411);
    if (type !== "buy" && type !== "sell") {
        return res.status(411).json({ message: "Incorrect inputs" });
    }
    const quote = PriceStore_1.PriceStore.getInstance().getPrices(asset);
    if (!quote)
        return res.status(411).json({ message: "No price yet for symbol" });
    const balance = yield PriceStore_1.PriceStore.getInstance().getUserBalance(userId);
    if (balance < margin || margin <= 10.0) {
        return res.json({ message: "Not sufficient balance" }).status(400);
    }
    //calc quantity
    const quantity = (0, calc_1.calcQuantity)(margin, leverage, type == "buy"
        ? PriceStore_1.PriceStore.getInstance().getPrices(asset).buy
        : PriceStore_1.PriceStore.getInstance().getPrices(asset).sell);
    if (quantity < 0.01 && quantity > 200) {
        return res.json({ message: " quantity not in range" }).status(400);
    }
    //getting assest id
    const Asset = yield prisma_1.prisma.asset.findUnique({
        where: { symbol: asset },
        select: { id: true },
    });
    if (!Asset)
        return res.json({ message: "Asset does not exist" }).status(400);
    //now opening trade we need to deduct balance and create an order in transactions
    const transactions = yield prisma_1.prisma.$transaction((ctx) => __awaiter(void 0, void 0, void 0, function* () {
        //opening an order
        yield ctx.userTrades.create({
            data: {
                userId: userId,
                assetId: Asset.id,
                type: type,
                margin: margin,
                leverage: leverage,
                openPrice: PriceStore_1.PriceStore.getInstance().getPrices(asset).buy,
                status: "open",
            },
        });
        //deduct balance
        const new_balance = Number(balance.toFixed(4)) - margin;
        const UPDATED_BALANCE = yield ctx.user.update({
            where: { id: userId },
            data: { usd_balance: new_balance },
            select: { usd_balance: true },
        });
        return UPDATED_BALANCE;
    }));
    return res
        .json({
        message: "Trade opened successfully",
        new_Balance: transactions.usd_balance,
    })
        .status(200);
}));
//getting orders which are open
exports.tradesRouter.get("/open", Authenticate_1.authenticate, (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const data = yield prisma_1.prisma.userTrades.findMany({
            where: { status: "open" },
            include: { asset: { select: { symbol: true } } },
        });
        const filteredData = data.map((r) => ({
            orderId: r.id,
            type: r.type,
            margin: r.margin, // decimal is 2, so this means 500$
            leverage: r.leverage, // so the user is trying to buy $5000 of exposure
            openPrice: r.openPrice,
            symbol: r.asset.symbol
        }));
        return res.json({ trades: filteredData }).status(200);
    }
    catch (error) {
        console.log(error);
        return res.status(500);
    }
}));
//getting existing closed orders
exports.tradesRouter.get("/closed", Authenticate_1.authenticate, (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const data = yield prisma_1.prisma.userTrades.findMany({
            where: { status: "closed" },
            include: { asset: { select: { symbol: true } } },
        });
        const filteredData = data.map((r) => ({
            orderId: r.id,
            type: r.type,
            margin: r.margin, // decimal is 2, so this means 500$
            leverage: r.leverage, // so the user is trying to buy $5000 of exposure
            openPrice: r.closePrice,
            symbol: r.asset.symbol
        }));
        return res.json({ trades: filteredData }).status(200);
    }
    catch (error) {
        console.log("error while getting closed trades", error);
        return res.status(500);
    }
}));
exports.tradesRouter.post("/:id/close", Authenticate_1.authenticate, (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const id = String(req.params.id);
        const trade = yield prisma_1.prisma.userTrades.findUnique({
            where: { id },
            include: { asset: true },
        });
        if (!trade)
            return res.status(404).json({ message: "Trade not found" });
        if (trade.status !== "open")
            return res.status(411).json({ message: "Already closed" });
        const quote = PriceStore_1.PriceStore.getInstance().getPrices(trade.asset.symbol);
        if (!quote)
            return res.status(411).json({ message: "No price yet for symbol" });
        // Opposite side for exit:
        const exit = trade.type === "buy" ? quote.sell : quote.buy;
        // qty from margin & leverage & entry price (simple):
        const margin = Number(trade.margin);
        const leverage = Number(trade.leverage);
        const entry = Number(trade.openPrice);
        const qty = (0, calc_1.calcQuantity)(margin, leverage, entry);
        const sign = trade.type === "buy" ? +1 : -1;
        const pnl = sign * (exit - entry) * qty;
        //if pnl is less basically loss is greater than 0.9 percent of margin close the trades
        const Balance = Number(yield PriceStore_1.PriceStore.getInstance().getUserBalance(Number(req.userId)));
        const new_Balance = Balance + margin + pnl;
        yield prisma_1.prisma.$transaction((ctx) => __awaiter(void 0, void 0, void 0, function* () {
            yield ctx.userTrades.update({
                where: { id },
                data: {
                    closePrice: exit.toFixed(4),
                    pnl: pnl.toFixed(2),
                    status: "closed",
                },
            });
            yield ctx.user.update({
                where: { id: Number(req.userId) },
                data: { usd_balance: Number(new_Balance) },
            });
        }));
        return res
            .json({ ok: true, message: "trade closed successfully " })
            .status(200);
    }
    catch (e) {
        console.error(e);
        res.status(500).json({ message: "Server error" });
    }
}));
