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
const redis_1 = require("redis");
const prisma_1 = require("./lib/prisma");
require("dotenv/config");
// make sure your prisma client is imported
const prisma = (0, prisma_1.getPrismaClient)();
const batch_client = (0, redis_1.createClient)({ url: 'redis://localhost:6379' });
function startBatching() {
    return __awaiter(this, void 0, void 0, function* () {
        yield batch_client.connect();
        batch_client.on('error', (err) => console.log('Redis Client Error', err));
        while (true) {
            try {
                let data = [];
                while (data.length < 100) {
                    const res = yield batch_client.brPop('binanceTrades', 0);
                    data.push(JSON.parse(res.element));
                }
                // insert batch into DB
                yield prisma.trade.createMany({
                    data: data,
                    skipDuplicates: true
                });
                console.log(`Inserted batch of ${data.length} trades`);
                data = [];
            }
            catch (err) {
                console.error("Error processing batch:", err);
            }
        }
    });
}
startBatching();
