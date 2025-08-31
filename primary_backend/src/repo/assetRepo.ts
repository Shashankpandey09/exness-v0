
//assets repo work is to update the db with every two second 
import { prisma } from "../lib/prisma";

export async function listAssets(){
   return await prisma.asset.findMany({
        orderBy:{symbol:'asc'}
    })
}
export async function UpdateAssets({symbol,decimals,buy,sell}:{symbol:string,decimals:number,buy:number,sell:number}){
   await prisma.asset.upsert({
    where:{symbol},
  update: { buyPrice: buy.toFixed(4), sellPrice: sell.toFixed(4) },
   create:{
    symbol,
    decimals,
    buyPrice:buy,
    sellPrice:sell
   }
   })
}