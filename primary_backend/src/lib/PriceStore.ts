import { Decimal } from "@prisma/client/runtime/library";
import { prisma } from "./prisma";

type Quote = {
  buy: number;
  sell: number;
  decimals: number;
  updatedAt?: number;
};

export class PriceStore {
  private static _instance: PriceStore;
  private prices = new Map<string, Quote>();
  private userBalances = new Map<number, number>(); // store balances in memory

  private constructor() {}

  public static getInstance(): PriceStore {
    if (!PriceStore._instance) PriceStore._instance = new PriceStore();
    return PriceStore._instance;
  }

  // Price feed methods
  public set(symbol: string, buy: number, sell: number, decimals: number = 4) {
    this.prices.set(symbol, { buy, sell, decimals, updatedAt: Date.now() });
  }

  public getPrices(symbol: string) {
    return this.prices.get(symbol);
  }

  public getEntries() {
    return [...this.prices.entries()];
  }

  // Balance methods
  public async getUserBalance(userId: number): Promise<number> {
    if (this.userBalances.has(userId)) {
      return this.userBalances.get(userId)!;
    }
    const userData = await prisma.user.findUnique({ where: { id: userId } });
    if (!userData) throw new Error("User not found");
    const balance = parseFloat(userData.usd_balance.toFixed(2));
    this.userBalances.set(userId, balance);
    return balance;
  }

  public async updateBalance(userId: number, balance: number) {
    const rounded = parseFloat(balance.toFixed(2));
    this.userBalances.set(userId, rounded);
    //updating balance in db 
     (async()=>{
      await prisma.user.update({where:{id:userId},data:{
        usd_balance:balance
    }})
  })()
  }
 
 
  
}
