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
const ws_1 = __importDefault(require("ws"));
const redis_1 = require("redis");
//creating client
const poller_Client = (0, redis_1.createClient)();
// Your assets
const assets = ["btcusdt", 'solusdt'];
// Build multi-stream URL
const streams = assets.map(a => `${a.toLowerCase()}@aggTrade`).join("/");
const BINANCE_URL = `wss://stream.binance.com:9443/stream?streams=${streams}`;
const state = {};
const wss = new ws_1.default(BINANCE_URL);
wss.on("open", () => __awaiter(void 0, void 0, void 0, function* () {
    console.log("Connected to Binance multi-stream");
    try {
        yield poller_Client.connect();
    }
    catch (error) {
        console.log('error while opening sockets');
    }
}));
wss.on("message", (msg) => __awaiter(void 0, void 0, void 0, function* () {
    const payload = JSON.parse(msg.toString());
    const trade = payload.data;
    console.log(trade);
    // spread
    const spreadPercentage = 1 / 100;
    const lastPrice = Number(trade.p);
    const lastSize = Number(trade.q);
    const side = trade.m ? "sell" : "buy";
    const bestAsk = lastPrice * (1 + spreadPercentage);
    const bestBid = lastPrice * (1 - spreadPercentage);
    state[trade.s] = {
        symbol: trade.s,
        ts: new Date(trade.T).toISOString(),
        lastPrice,
        lastSize,
        side,
        bestBid: Number(bestBid.toFixed(8)),
        bestAsk: Number(bestAsk.toFixed(8)),
    };
    //sending messages to the websocket server 
    const messageToSend = JSON.stringify({ type: 'ticker_update', data: state[trade.s] });
    yield poller_Client.publish('ask_bid', messageToSend);
    const dbTrade = {
        time: new Date(trade.T), // Trade timestamp
        symbol: trade.s, // Symbol
        price: Number(trade.p), // Price as number
        size: Number(trade.q), // Quantity as number
        side: trade['m'].toString() // SELL = true, BUY = false
    };
    yield poller_Client.lPush('binanceTrades', JSON.stringify(dbTrade));
}));
wss.on("close", () => __awaiter(void 0, void 0, void 0, function* () {
    console.log("Disconnected. Reconnecting...");
    yield poller_Client.quit();
}));
wss.on("error", (err) => {
    console.error("Error:", err);
});
