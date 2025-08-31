import { PriceStore } from "../lib/PriceStore";
import { UpdateAssets } from "../repo/assetRepo";

export const StartAssetSnapshotter = (intervalMs = 2000) => {
  setInterval(async () => {
    try {
      const entries = PriceStore.getInstance().getEntries();
      const tasks = entries.map(([symbol, q]) => {
        const fresh = Date.now() - q.updatedAt! < intervalMs * 2;
        if (!fresh || !symbol) return null;
        const { decimals, buy, sell } = q;
        return UpdateAssets({ symbol, decimals, buy, sell });
      });
      await Promise.all(tasks);
    } catch (error) {
      console.error("snapshot error:", error);
    }
  }, intervalMs);
};
