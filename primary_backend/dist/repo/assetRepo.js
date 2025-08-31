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
exports.listAssets = listAssets;
exports.UpdateAssets = UpdateAssets;
//assets repo work is to update the db with every two second 
const prisma_1 = require("../lib/prisma");
function listAssets() {
    return __awaiter(this, void 0, void 0, function* () {
        return yield prisma_1.prisma.asset.findMany({
            orderBy: { symbol: 'asc' }
        });
    });
}
function UpdateAssets(_a) {
    return __awaiter(this, arguments, void 0, function* ({ symbol, decimals, buy, sell }) {
        yield prisma_1.prisma.asset.upsert({
            where: { symbol },
            update: { buyPrice: buy.toFixed(4), sellPrice: sell.toFixed(4) },
            create: {
                symbol,
                decimals,
                buyPrice: buy,
                sellPrice: sell
            }
        });
    });
}
