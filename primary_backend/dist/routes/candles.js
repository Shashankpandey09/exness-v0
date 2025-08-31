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
Object.defineProperty(exports, "__esModule", { value: true });
exports.candlesRouter = void 0;
const express_1 = require("express");
const Authenticate_1 = require("../middleware/Authenticate");
const prisma_1 = require("../lib/prisma");
exports.candlesRouter = (0, express_1.Router)();
exports.candlesRouter.get("/", Authenticate_1.authenticate, (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    //   GET /api/v1/candles?asset=BTC&startTime=unix_timestamp&endTime=unix_timestamp&ts=1m/1w/1d
    try {
        const { asset, startTime, endTime, ts } = req.query;
        if (!asset || !startTime || !endTime || !ts) {
            return res.status(400).json({ error: "Missing query params" });
        }
        const assetStr = String(asset); // e.g. "BTCUSDT"
        const start = Number(startTime); // expected epoch seconds (e.g. 1693500000)
        const end = Number(endTime);
        const bucketInterval = String(ts);
        if (Number.isNaN(start) || Number.isNaN(end)) {
            return res
                .status(400)
                .json({
                error: "startTime and endTime must be numbers (epoch seconds)",
            });
        }
        const result = yield prisma_1.prisma.$queryRawUnsafe(`
    SELECT time_bucket($1, time) AS bucket,
           first(price, time) AS open,
           max(price) AS high,
           min(price) AS low,
           last(price, time) AS close,
           sum(size) AS volume
    FROM trades
      WHERE symbol = $2
      AND time >= to_timestamp($3)
      AND time <  to_timestamp($4)
    GROUP BY bucket,symbol
    ORDER BY bucket;
        `, bucketInterval, assetStr, start, end);
        return res.json({ rows: result }).status(200);
    }
    catch (error) {
        throw new Error("erroe while fetching candles");
    }
}));
