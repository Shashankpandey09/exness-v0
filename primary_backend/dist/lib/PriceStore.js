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
exports.PriceStore = void 0;
const prisma_1 = require("./prisma");
class PriceStore {
    // private userBalance:number
    constructor() {
        this.prices = new Map();
        // this.userBalance=5000
    }
    static getInstance() {
        if (!PriceStore._instance)
            PriceStore._instance = new PriceStore();
        return PriceStore._instance;
    }
    set(symbol, buy, sell, decimals = 4) {
        this.prices.set(symbol, { buy, sell, decimals, updatedAt: Date.now() });
    }
    getPrices(symbol) {
        return this.prices.get(symbol);
    }
    getEntries() {
        return [...this.prices.entries()];
    }
    getUserBalance(userId) {
        return __awaiter(this, void 0, void 0, function* () {
            const userData = yield prisma_1.prisma.user.findUnique({ where: { id: userId } });
            //   this.userBalance=Number(userData!.usd_balance.toFixed(2))
            return userData.usd_balance;
        });
    }
    UpdateBalance(balance) {
        return __awaiter(this, void 0, void 0, function* () {
            // return this.userBalance
        });
    }
}
exports.PriceStore = PriceStore;
