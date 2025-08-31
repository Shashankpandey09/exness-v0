-- CreateTable
CREATE TABLE "public"."User" (
    "id" SERIAL NOT NULL,
    "username" TEXT NOT NULL,
    "password" TEXT NOT NULL,
    "usd_balance" DECIMAL(18,2) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."trades" (
    "time" TIMESTAMPTZ(6) NOT NULL,
    "symbol" TEXT NOT NULL,
    "price" DECIMAL(18,8) NOT NULL,
    "size" DECIMAL(18,8) NOT NULL,
    "side" TEXT,
    "exchange_id" TEXT,

    CONSTRAINT "trades_pkey" PRIMARY KEY ("symbol","time")
);

-- CreateTable
CREATE TABLE "public"."Asset" (
    "id" SERIAL NOT NULL,
    "symbol" TEXT NOT NULL,
    "buyPrice" DECIMAL(18,4) NOT NULL,
    "sellPrice" DECIMAL(18,4) NOT NULL,
    "decimals" INTEGER NOT NULL,

    CONSTRAINT "Asset_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."UserTrades" (
    "id" TEXT NOT NULL,
    "userId" INTEGER NOT NULL,
    "assetId" INTEGER NOT NULL,
    "type" TEXT NOT NULL,
    "margin" DECIMAL(18,2) NOT NULL,
    "leverage" INTEGER NOT NULL,
    "openPrice" DECIMAL(18,4) NOT NULL,
    "closePrice" DECIMAL(18,4),
    "pnl" DECIMAL(18,4),
    "status" TEXT NOT NULL DEFAULT 'open',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "UserTrades_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_username_key" ON "public"."User"("username");

-- CreateIndex
CREATE INDEX "trades_symbol_idx" ON "public"."trades"("symbol");

-- CreateIndex
CREATE UNIQUE INDEX "Asset_symbol_key" ON "public"."Asset"("symbol");

-- AddForeignKey
ALTER TABLE "public"."UserTrades" ADD CONSTRAINT "UserTrades_assetId_fkey" FOREIGN KEY ("assetId") REFERENCES "public"."Asset"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."UserTrades" ADD CONSTRAINT "UserTrades_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
