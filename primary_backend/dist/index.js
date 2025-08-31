"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const marketFeed_1 = require("./services/marketFeed");
const assetSnapshotter_1 = require("./services/assetSnapshotter");
const user_1 = require("./routes/user");
const trades_1 = require("./routes/trades");
const assets_1 = require("./routes/assets");
const candles_1 = require("./routes/candles");
const PORT = 3000;
const app = (0, express_1.default)();
app.use((0, cors_1.default)());
app.use(express_1.default.json());
(0, marketFeed_1.startMarketFeed)();
//starting snap shot 
(0, assetSnapshotter_1.StartAssetSnapshotter)();
app.use('/api/v1/user', user_1.userRouter);
app.use('/api/v1/trade', trades_1.tradesRouter);
app.use('/api/v1/assets', assets_1.assetRouter);
app.use('/api/v1/candles', candles_1.candlesRouter);
app.listen(PORT, () => console.log(`server started listening at port ${PORT}`));
