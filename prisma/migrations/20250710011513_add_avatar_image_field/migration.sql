-- AlterTable
ALTER TABLE "users" ADD COLUMN     "avatarImage" TEXT;

-- AddForeignKey
ALTER TABLE "nfts" ADD CONSTRAINT "nfts_contractAddress_fkey" FOREIGN KEY ("contractAddress") REFERENCES "collections"("address") ON DELETE RESTRICT ON UPDATE CASCADE;
