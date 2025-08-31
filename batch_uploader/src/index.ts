import { createClient } from "redis";
import { getPrismaClient }  from "./lib/prisma";
import 'dotenv/config'
// make sure your prisma client is imported
const prisma=getPrismaClient()
const batch_client = createClient({ url: 'redis://localhost:6379'});

async function startBatching() {
    await batch_client.connect();
    batch_client.on('error', (err: any) => console.log('Redis Client Error', err));

    while (true) {
        try {
            let data: any[] = [];
            while (data.length < 100) {
                const res = await batch_client.brPop('binanceTrades', 0);
                data.push(JSON.parse(res.element));
            }
            // insert batch into DB
            await prisma.trade.createMany({
                data:data,
                skipDuplicates:true
            })
            
          
            console.log(`Inserted batch of ${data.length} trades`);
            data=[];
        } catch (err) {
            console.error("Error processing batch:", err);
        }
    }
}

startBatching();
