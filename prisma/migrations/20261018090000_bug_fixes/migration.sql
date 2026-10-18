-- Xato tuzatishlari: demo tashkilotlar ajratiladi, do'kon egasining tasdig'i, xarid buyurtmasi takrori kaliti,
-- SMS kodning umumiy chegarasi faqat yangi raqamlarga

-- AlterTable
ALTER TABLE "Distributor" ADD COLUMN "demo" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "Brand" ADD COLUMN "demo" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "Shop" ADD COLUMN "demo" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN "confirmedAt" TIMESTAMP(3);

-- Mavjud do'konlar tasdiqlangan hisoblanadi (yangi qoida faqat bundan keyin agent qo'shadigan do'konlarga)
UPDATE "Shop" SET "confirmedAt" = "createdAt";

-- AlterTable
ALTER TABLE "BrandOrder" ADD COLUMN "clientKey" TEXT;

-- AlterTable
ALTER TABLE "OtpCode" ADD COLUMN "newPhone" BOOLEAN NOT NULL DEFAULT false;

-- CreateIndex
CREATE UNIQUE INDEX "BrandOrder_clientKey_key" ON "BrandOrder"("clientKey");
