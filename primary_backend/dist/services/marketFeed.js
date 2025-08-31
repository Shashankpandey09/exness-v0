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
exports.startMarketFeed = startMarketFeed;
const redis_1 = require("redis");
const PriceStore_1 = require("../lib/PriceStore");
const backend_redClient = (0, redis_1.createClient)();
function startMarketFeed() {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            yield backend_redClient.connect();
            console.log('primary backend redis client connected');
            //basically start feeding backend in memory store 
            //first get message from the pubsub by subscribing to the pubsub
            yield backend_redClient.subscribe('ask_bid', (data) => {
                const parsedData = JSON.parse(data);
                //need symbol best bid price buy price 
                const { symbol, bestAsk, bestBid } = parsedData.data;
                PriceStore_1.PriceStore.getInstance().set(symbol, bestAsk, bestBid);
            });
        }
        catch (error) {
            console.log('error occurred while connecting to redis client', error);
            throw Error;
        }
    });
}
// }const messageToSend=JSON.stringify({type:'ticker_update',data:state[trade.s]})
// symbol:trade.s,
// ts: new Date(trade.T).toISOString(),
// lastPrice,
// lastSize,
// side,
// bestBid: Number(bestBid.toFixed(8)),
// bestAsk: Number(bestAsk.toFixed(8)),
