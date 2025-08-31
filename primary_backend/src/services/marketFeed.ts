
import { createClient } from "redis";
import { PriceStore } from "../lib/PriceStore";
const backend_redClient=createClient();

export async function startMarketFeed(){
    try {
       await backend_redClient.connect();
       console.log('primary backend redis client connected'); 
       //basically start feeding backend in memory store 
       //first get message from the pubsub by subscribing to the pubsub
       await backend_redClient.subscribe('ask_bid',(data)=>{
        const parsedData=JSON.parse(data);
        //need symbol best bid price buy price 
         const {symbol,bestAsk,bestBid}=parsedData.data;
         PriceStore.getInstance().set(symbol,bestAsk,bestBid);
       })
    } catch (error) {
    console.log('error occurred while connecting to redis client',error)
    throw Error        
    }
}
// }const messageToSend=JSON.stringify({type:'ticker_update',data:state[trade.s]})
    // symbol:trade.s,
    // ts: new Date(trade.T).toISOString(),
    // lastPrice,
    // lastSize,
    // side,
    // bestBid: Number(bestBid.toFixed(8)),
    // bestAsk: Number(bestAsk.toFixed(8)),