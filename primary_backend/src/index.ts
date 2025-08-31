import express from "express";
import cors from "cors";

import { startMarketFeed } from "./services/marketFeed";
import { StartAssetSnapshotter } from "./services/assetSnapshotter";
import { userRouter } from "./routes/user";
import { tradesRouter } from "./routes/trades";
import { assetRouter } from "./routes/assets";
import { candlesRouter } from "./routes/candles";
const PORT:number=3000;
const app=express();
app.use(cors())
app.use(express.json())

startMarketFeed();
//starting snap shot 
StartAssetSnapshotter()
app.use('/api/v1/user',userRouter)
app.use('/api/v1/trade',tradesRouter)
app.use('/api/v1/assets',assetRouter)
app.use('/api/v1/candles',candlesRouter)
app.listen(PORT,()=>console.log(`server started listening at port ${PORT}`))

