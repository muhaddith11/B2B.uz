-- Tahlil tuzatishlari: buyurtma takrori kaliti, SMS kodning maqsadi, ishlatilmagan jadvallar olib tashlanadi

-- Ishlatilmagan (hech qayerda yozilmagan) xabarlar va aksiyalar
DROP TABLE "Message";
DROP TABLE "Promotion";
DROP TYPE "SenderType";
DROP TYPE "PromotionType";

-- AlterTable
ALTER TABLE "Order" ADD COLUMN     "clientKey" TEXT;

-- AlterTable
ALTER TABLE "OtpCode" ADD COLUMN     "purpose" TEXT NOT NULL DEFAULT 'login';

-- CreateIndex
CREATE UNIQUE INDEX "Order_clientKey_key" ON "Order"("clientKey");

-- CreateIndex
CREATE INDEX "OtpCode_phone_purpose_createdAt_idx" ON "OtpCode"("phone", "purpose", "createdAt");
