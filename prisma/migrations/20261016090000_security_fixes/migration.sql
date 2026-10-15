-- Xavfsizlik tuzatishlari: do'konni taklif bilan ulash (INVITED), "barcha qurilmalardan chiqish" va rasm so'rovlari uchun indekslar

-- AlterEnum
ALTER TYPE "LinkStatus" ADD VALUE 'INVITED';

-- AlterTable
ALTER TABLE "BrandUser" ADD COLUMN     "sessionsValidAfter" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "ShopUser" ADD COLUMN     "sessionsValidAfter" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "Staff" ADD COLUMN     "sessionsValidAfter" TIMESTAMP(3);

-- CreateIndex
CREATE INDEX "Brand_logoUrl_idx" ON "Brand"("logoUrl");

-- CreateIndex
CREATE INDEX "BrandProduct_imageUrl_idx" ON "BrandProduct"("imageUrl");

-- CreateIndex
CREATE INDEX "BrandUser_avatarUrl_idx" ON "BrandUser"("avatarUrl");

-- CreateIndex
CREATE INDEX "Distributor_logoUrl_idx" ON "Distributor"("logoUrl");

-- CreateIndex
CREATE INDEX "Product_imageUrl_idx" ON "Product"("imageUrl");

-- CreateIndex
CREATE INDEX "Shop_imageUrl_idx" ON "Shop"("imageUrl");

-- CreateIndex
CREATE INDEX "ShopUser_avatarUrl_idx" ON "ShopUser"("avatarUrl");

-- CreateIndex
CREATE INDEX "Staff_avatarUrl_idx" ON "Staff"("avatarUrl");

