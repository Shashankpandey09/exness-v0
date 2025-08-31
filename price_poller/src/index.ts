import WebSocket from "ws";
import { createClient } from "redis";
//creating client
const poller_Client=createClient()
// Your assets
const assets = ["btcusdt",'solusdt'];

// Build multi-stream URL
const streams = assets.map(a => `${a.toLowerCase()}@aggTrade`).join("/");
const BINANCE_URL = `wss://stream.binance.com:9443/stream?streams=${streams}`;
const state:Record<string,any>={};

const wss = new WebSocket(BINANCE_URL);

wss.on("open", async() => {
  console.log("Connected to Binance multi-stream");
try {
  await poller_Client.connect()
   
} catch (error) {
  console.log('error while opening sockets')
}
});


wss.on("message", async(msg) => {
  const payload = JSON.parse(msg.toString());
  const trade = payload.data;
  console.log(trade)
 // spread
 const spreadPercentage:number=1/100;
const lastPrice = Number(trade.p);
  const lastSize = Number(trade.q);
  const side = trade.m ? "sell" : "buy";

  const bestAsk = lastPrice * (1 + spreadPercentage);
  const bestBid = lastPrice * (1 - spreadPercentage);
 state[trade.s] = {
    symbol:trade.s,
    ts: new Date(trade.T).toISOString(),
    lastPrice,
    lastSize,
    side,
    bestBid: Number(bestBid.toFixed(8)),
    bestAsk: Number(bestAsk.toFixed(8)),
  };
//sending messages to the websocket server 
const messageToSend=JSON.stringify({type:'ticker_update',data:state[trade.s]})
 await poller_Client.publish('ask_bid',messageToSend)
  const dbTrade = {
  time: new Date(trade.T),        // Trade timestamp
  symbol: trade.s,                // Symbol
  price: Number(trade.p),     // Price as number
  size: Number(trade.q),  // Quantity as number
  side: trade['m'].toString()                    // SELL = true, BUY = false
};
await poller_Client.lPush('binanceTrades',JSON.stringify(dbTrade))

});

wss.on("close", async() => {
  console.log("Disconnected. Reconnecting...");
  await poller_Client.quit()
});

wss.on("error", (err) => {
  console.error("Error:", err);
});
