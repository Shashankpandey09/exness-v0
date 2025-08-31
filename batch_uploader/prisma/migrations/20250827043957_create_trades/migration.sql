-- CreateTable
CREATE TABLE "public"."trades" (
    "time" TIMESTAMPTZ NOT NULL,
    "symbol" TEXT NOT NULL,
    "price" DECIMAL(18,8) NOT NULL,
    "size" DECIMAL(18,8) NOT NULL,
    "side" TEXT,
    "exchange_id" TEXT,

    CONSTRAINT "trades_pkey" PRIMARY KEY ("symbol","time")
);
