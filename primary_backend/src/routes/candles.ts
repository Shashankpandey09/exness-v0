import { Router, Response } from "express";
import { authenticate, AuthenticatedRequest } from "../middleware/Authenticate";
import { prisma } from "../lib/prisma";
export const candlesRouter = Router();
candlesRouter.get(
  "/",
  authenticate,
  async (req: AuthenticatedRequest, res: Response) => {
    //   GET /api/v1/candles?asset=BTC&startTime=unix_timestamp&endTime=unix_timestamp&ts=1m/1w/1d
    try {
      const { asset, startTime, endTime, ts } = req.query;
      if (!asset || !startTime || !endTime || !ts) {
        return res.status(400).json({ error: "Missing query params" });
      }
      const assetStr = String(asset); // e.g. "BTCUSDT"
      const start = Number(startTime); // expected epoch seconds (e.g. 1693500000)
      const end = Number(endTime);
      const bucketInterval = String(ts);
      if (Number.isNaN(start) || Number.isNaN(end)) {
        return res
          .status(400)
          .json({
            error: "startTime and endTime must be numbers (epoch seconds)",
          });
      }
      const result = await prisma.$queryRawUnsafe(
        `
    SELECT time_bucket($1, time) AS bucket,
           first(price, time) AS open,
           max(price) AS high,
           min(price) AS low,
           last(price, time) AS close,
           sum(size) AS volume
    FROM trades
      WHERE symbol = $2
      AND time >= to_timestamp($3)
      AND time <  to_timestamp($4)
    GROUP BY bucket,symbol
    ORDER BY bucket;
        `,
        bucketInterval,
        assetStr,
        start,
        end
      );
      return res.json({ rows: result }).status(200);
    } catch (error) {
      throw new Error("erroe while fetching candles");
    }
  }
);
