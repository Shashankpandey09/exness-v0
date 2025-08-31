import { Router } from "express";
import { listAssets } from "../repo/assetRepo";
export const assetRouter=Router();
import { Request,Response } from "express";

assetRouter.get('/',async(req:Request,res:Response)=>{
const rows=await listAssets();
res.json({
    assets:rows.map(r=>({
        Symbol:r.symbol,
        buyPrice:r.buyPrice,
        sellPrice:r.sellPrice,
        decimals:r.decimals
    }))
})
return;
})