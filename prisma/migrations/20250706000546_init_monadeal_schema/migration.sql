-- CreateEnum
CREATE TYPE "DealType" AS ENUM ('BUY', 'SELL', 'SWAP');

-- CreateEnum
CREATE TYPE "DealStatus" AS ENUM ('PENDING', 'AWAITING_BUYER', 'AWAITING_SELLER', 'LOCKED_IN_ESCROW', 'COMPLETED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "MessageType" AS ENUM ('TEXT', 'SYSTEM', 'DEAL_UPDATE', 'IMAGE', 'NFT_PREVIEW');

-- CreateEnum
CREATE TYPE "NotificationType" AS ENUM ('DEAL_CREATED', 'DEAL_ACCEPTED', 'DEAL_COMPLETED', 'DEAL_CANCELLED', 'MESSAGE_RECEIVED', 'DEPOSIT_MADE', 'SYSTEM_ANNOUNCEMENT');

-- CreateTable
CREATE TABLE "users" (
    "id" TEXT NOT NULL,
    "address" TEXT NOT NULL,
    "ensName" TEXT,
    "avatar" TEXT,
    "username" TEXT,
    "bio" TEXT,
    "isOnline" BOOLEAN NOT NULL DEFAULT false,
    "lastSeen" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "deals" (
    "id" TEXT NOT NULL,
    "type" "DealType" NOT NULL,
    "status" "DealStatus" NOT NULL DEFAULT 'PENDING',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "expiresAt" TIMESTAMP(3),
    "creatorAddress" TEXT NOT NULL,
    "counterpartyAddress" TEXT,
    "nftContractAddress" TEXT NOT NULL,
    "nftTokenId" TEXT NOT NULL,
    "price" TEXT,
    "swapNftContract" TEXT,
    "swapTokenId" TEXT,
    "escrowContractAddress" TEXT,
    "transactionHash" TEXT,
    "completedAt" TIMESTAMP(3),
    "cancelledAt" TIMESTAMP(3),
    "creatorDeposited" BOOLEAN NOT NULL DEFAULT false,
    "counterpartyDeposited" BOOLEAN NOT NULL DEFAULT false,
    "title" TEXT,
    "description" TEXT,

    CONSTRAINT "deals_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "nfts" (
    "contractAddress" TEXT NOT NULL,
    "tokenId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "image" TEXT,
    "imageUrl" TEXT,
    "animationUrl" TEXT,
    "externalUrl" TEXT,
    "collectionName" TEXT,
    "collectionSlug" TEXT,
    "metadata" JSONB,
    "owner" TEXT,
    "lastSalePrice" TEXT,
    "floorPrice" TEXT,
    "rarity" TEXT,
    "traits" JSONB,
    "isValidated" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "nfts_pkey" PRIMARY KEY ("contractAddress","tokenId")
);

-- CreateTable
CREATE TABLE "messages" (
    "id" TEXT NOT NULL,
    "dealId" TEXT NOT NULL,
    "senderAddress" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "type" "MessageType" NOT NULL DEFAULT 'TEXT',
    "isRead" BOOLEAN NOT NULL DEFAULT false,
    "editedAt" TIMESTAMP(3),
    "replyToId" TEXT,

    CONSTRAINT "messages_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "notifications" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "dealId" TEXT,
    "type" "NotificationType" NOT NULL,
    "title" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "data" JSONB,
    "isRead" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "notifications_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "platform_analytics" (
    "id" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "totalUsers" INTEGER NOT NULL DEFAULT 0,
    "activeUsers" INTEGER NOT NULL DEFAULT 0,
    "totalDeals" INTEGER NOT NULL DEFAULT 0,
    "completedDeals" INTEGER NOT NULL DEFAULT 0,
    "cancelledDeals" INTEGER NOT NULL DEFAULT 0,
    "totalVolume" TEXT NOT NULL DEFAULT '0',
    "averageDealValue" TEXT NOT NULL DEFAULT '0',
    "topCollection" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "platform_analytics_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "collections" (
    "id" TEXT NOT NULL,
    "address" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "description" TEXT,
    "image" TEXT,
    "externalUrl" TEXT,
    "floorPrice" TEXT,
    "totalVolume" TEXT NOT NULL DEFAULT '0',
    "totalSales" INTEGER NOT NULL DEFAULT 0,
    "isVerified" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "collections_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_address_key" ON "users"("address");

-- CreateIndex
CREATE INDEX "users_address_idx" ON "users"("address");

-- CreateIndex
CREATE INDEX "users_isOnline_idx" ON "users"("isOnline");

-- CreateIndex
CREATE INDEX "deals_creatorAddress_idx" ON "deals"("creatorAddress");

-- CreateIndex
CREATE INDEX "deals_counterpartyAddress_idx" ON "deals"("counterpartyAddress");

-- CreateIndex
CREATE INDEX "deals_status_idx" ON "deals"("status");

-- CreateIndex
CREATE INDEX "deals_type_idx" ON "deals"("type");

-- CreateIndex
CREATE INDEX "deals_createdAt_idx" ON "deals"("createdAt");

-- CreateIndex
CREATE INDEX "deals_nftContractAddress_nftTokenId_idx" ON "deals"("nftContractAddress", "nftTokenId");

-- CreateIndex
CREATE INDEX "nfts_contractAddress_idx" ON "nfts"("contractAddress");

-- CreateIndex
CREATE INDEX "nfts_owner_idx" ON "nfts"("owner");

-- CreateIndex
CREATE INDEX "nfts_collectionSlug_idx" ON "nfts"("collectionSlug");

-- CreateIndex
CREATE INDEX "nfts_isValidated_idx" ON "nfts"("isValidated");

-- CreateIndex
CREATE INDEX "messages_dealId_idx" ON "messages"("dealId");

-- CreateIndex
CREATE INDEX "messages_senderAddress_idx" ON "messages"("senderAddress");

-- CreateIndex
CREATE INDEX "messages_timestamp_idx" ON "messages"("timestamp");

-- CreateIndex
CREATE INDEX "messages_type_idx" ON "messages"("type");

-- CreateIndex
CREATE INDEX "notifications_userId_idx" ON "notifications"("userId");

-- CreateIndex
CREATE INDEX "notifications_isRead_idx" ON "notifications"("isRead");

-- CreateIndex
CREATE INDEX "notifications_createdAt_idx" ON "notifications"("createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "platform_analytics_date_key" ON "platform_analytics"("date");

-- CreateIndex
CREATE INDEX "platform_analytics_date_idx" ON "platform_analytics"("date");

-- CreateIndex
CREATE UNIQUE INDEX "collections_address_key" ON "collections"("address");

-- CreateIndex
CREATE UNIQUE INDEX "collections_slug_key" ON "collections"("slug");

-- CreateIndex
CREATE INDEX "collections_address_idx" ON "collections"("address");

-- CreateIndex
CREATE INDEX "collections_slug_idx" ON "collections"("slug");

-- CreateIndex
CREATE INDEX "collections_isVerified_idx" ON "collections"("isVerified");

-- CreateIndex
CREATE INDEX "collections_totalVolume_idx" ON "collections"("totalVolume");

-- AddForeignKey
ALTER TABLE "deals" ADD CONSTRAINT "deals_creatorAddress_fkey" FOREIGN KEY ("creatorAddress") REFERENCES "users"("address") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "deals" ADD CONSTRAINT "deals_counterpartyAddress_fkey" FOREIGN KEY ("counterpartyAddress") REFERENCES "users"("address") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "deals" ADD CONSTRAINT "deals_nftContractAddress_nftTokenId_fkey" FOREIGN KEY ("nftContractAddress", "nftTokenId") REFERENCES "nfts"("contractAddress", "tokenId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "deals" ADD CONSTRAINT "deals_swapNftContract_swapTokenId_fkey" FOREIGN KEY ("swapNftContract", "swapTokenId") REFERENCES "nfts"("contractAddress", "tokenId") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "messages" ADD CONSTRAINT "messages_dealId_fkey" FOREIGN KEY ("dealId") REFERENCES "deals"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "messages" ADD CONSTRAINT "messages_senderAddress_fkey" FOREIGN KEY ("senderAddress") REFERENCES "users"("address") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "messages" ADD CONSTRAINT "messages_replyToId_fkey" FOREIGN KEY ("replyToId") REFERENCES "messages"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("address") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_dealId_fkey" FOREIGN KEY ("dealId") REFERENCES "deals"("id") ON DELETE SET NULL ON UPDATE CASCADE;
