-- CreateEnum
CREATE TYPE "TransactionType" AS ENUM ('CREATE_DEAL', 'ACCEPT_DEAL', 'DEPOSIT_NFT', 'DEPOSIT_PAYMENT', 'CANCEL_DEAL', 'COMPLETE_DEAL', 'COUNTER_OFFER', 'ACCEPT_COUNTER_OFFER', 'DECLINE_COUNTER_OFFER');

-- CreateEnum
CREATE TYPE "TransactionStatus" AS ENUM ('PENDING', 'CONFIRMED', 'FAILED');

-- CreateTable
CREATE TABLE "transactions" (
    "id" TEXT NOT NULL,
    "dealId" TEXT NOT NULL,
    "userAddress" TEXT NOT NULL,
    "type" "TransactionType" NOT NULL,
    "status" "TransactionStatus" NOT NULL DEFAULT 'PENDING',
    "hash" TEXT NOT NULL,
    "blockNumber" TEXT,
    "gasUsed" TEXT,
    "gasFee" TEXT,
    "amount" TEXT,
    "contractAddress" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "confirmedAt" TIMESTAMP(3),

    CONSTRAINT "transactions_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "transactions_hash_key" ON "transactions"("hash");

-- CreateIndex
CREATE INDEX "transactions_dealId_idx" ON "transactions"("dealId");

-- CreateIndex
CREATE INDEX "transactions_userAddress_idx" ON "transactions"("userAddress");

-- CreateIndex
CREATE INDEX "transactions_type_idx" ON "transactions"("type");

-- CreateIndex
CREATE INDEX "transactions_status_idx" ON "transactions"("status");

-- CreateIndex
CREATE INDEX "transactions_hash_idx" ON "transactions"("hash");

-- CreateIndex
CREATE INDEX "transactions_createdAt_idx" ON "transactions"("createdAt");

-- AddForeignKey
ALTER TABLE "transactions" ADD CONSTRAINT "transactions_dealId_fkey" FOREIGN KEY ("dealId") REFERENCES "deals"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "transactions" ADD CONSTRAINT "transactions_userAddress_fkey" FOREIGN KEY ("userAddress") REFERENCES "users"("address") ON DELETE RESTRICT ON UPDATE CASCADE;
