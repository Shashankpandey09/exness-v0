import { prisma } from "./prisma";
type Quote={buy:number,sell:number;decimals:number,updatedAt?:number}
export class PriceStore{
    private static _instance:PriceStore;
    private prices=new Map<string,Quote>();
    // private userBalance:number

    private constructor(){
        // this.userBalance=5000
    }
    public static getInstance():PriceStore{
        if(!PriceStore._instance)PriceStore._instance=new PriceStore();
        return PriceStore._instance;
    }
    public set(symbol:string,buy:number,sell:number,decimals:number=4){
        this.prices.set(symbol,{buy,sell,decimals,updatedAt:Date.now()})
    }
    public getPrices(symbol:string){
        return this.prices.get(symbol);
    }
    public getEntries(){
        return [...this.prices.entries()]
    }
    public async getUserBalance(userId:number){
       const userData=await prisma.user.findUnique({where:{id:userId}})
    //   this.userBalance=Number(userData!.usd_balance.toFixed(2))
       return userData!.usd_balance
    }
    public async UpdateBalance(balance:number){
        // return this.userBalance
    }
}