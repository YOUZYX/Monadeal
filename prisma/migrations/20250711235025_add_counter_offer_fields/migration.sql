-- CreateEnum
CREATE TYPE "CounterOfferStatus" AS ENUM ('PENDING', 'ACCEPTED', 'DECLINED');

-- AlterTable
ALTER TABLE "deals" ADD COLUMN     "counterOfferAt" TIMESTAMP(3),
ADD COLUMN     "counterOfferBy" TEXT,
ADD COLUMN     "counterOfferPrice" TEXT,
ADD COLUMN     "counterOfferStatus" "CounterOfferStatus";

-- CreateIndex
CREATE INDEX "deals_counterOfferStatus_idx" ON "deals"("counterOfferStatus");
