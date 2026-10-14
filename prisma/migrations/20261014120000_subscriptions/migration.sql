-- Obuna: distribyutor va do'kon (tashkilot) uchun, qo'shilgan kundan 12 oy tekin

-- CreateEnum
CREATE TYPE "PaymentPurpose" AS ENUM ('DEBT', 'SUBSCRIPTION');

-- AlterTable: avval bo'sh ustun, mavjud tashkilotlarga qo'shilgan kunidan 12 oy, keyin majburiy
ALTER TABLE "Distributor" ADD COLUMN "paidUntil" TIMESTAMP(3),
ADD COLUMN "trialEndsAt" TIMESTAMP(3);
UPDATE "Distributor" SET "trialEndsAt" = "createdAt" + interval '12 months', "paidUntil" = "createdAt" + interval '12 months';
ALTER TABLE "Distributor" ALTER COLUMN "paidUntil" SET NOT NULL,
ALTER COLUMN "trialEndsAt" SET NOT NULL;

ALTER TABLE "Shop" ADD COLUMN "paidUntil" TIMESTAMP(3),
ADD COLUMN "trialEndsAt" TIMESTAMP(3);
UPDATE "Shop" SET "trialEndsAt" = "createdAt" + interval '12 months', "paidUntil" = "createdAt" + interval '12 months';
ALTER TABLE "Shop" ALTER COLUMN "paidUntil" SET NOT NULL,
ALTER COLUMN "trialEndsAt" SET NOT NULL;

-- AlterTable
ALTER TABLE "OnlinePayment" ADD COLUMN     "months" INTEGER,
ADD COLUMN     "purpose" "PaymentPurpose" NOT NULL DEFAULT 'DEBT',
ADD COLUMN     "subscriberDistributorId" TEXT,
ADD COLUMN     "subscriberShopId" TEXT,
ALTER COLUMN "shopLinkId" DROP NOT NULL,
ALTER COLUMN "paymentMethodId" DROP NOT NULL;

-- Qarz to'lovi distribyutor kassasiga bog'langan; obuna to'lovi aynan bitta tashkilotga va oylar soniga
ALTER TABLE "OnlinePayment" ADD CONSTRAINT "OnlinePayment_purpose_check" CHECK (
  ("purpose" = 'DEBT' AND "shopLinkId" IS NOT NULL AND "paymentMethodId" IS NOT NULL AND "subscriberDistributorId" IS NULL AND "subscriberShopId" IS NULL)
  OR ("purpose" = 'SUBSCRIPTION' AND "months" > 0 AND "shopLinkId" IS NULL AND "paymentMethodId" IS NULL AND (("subscriberDistributorId" IS NULL) <> ("subscriberShopId" IS NULL)))
);

-- CreateTable
CREATE TABLE "PlatformSetting" (
    "key" TEXT NOT NULL,
    "value" TEXT NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PlatformSetting_pkey" PRIMARY KEY ("key")
);

-- CreateIndex
CREATE INDEX "OnlinePayment_subscriberDistributorId_idx" ON "OnlinePayment"("subscriberDistributorId");

-- CreateIndex
CREATE INDEX "OnlinePayment_subscriberShopId_idx" ON "OnlinePayment"("subscriberShopId");

-- AddForeignKey
ALTER TABLE "OnlinePayment" ADD CONSTRAINT "OnlinePayment_subscriberDistributorId_fkey" FOREIGN KEY ("subscriberDistributorId") REFERENCES "Distributor"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OnlinePayment" ADD CONSTRAINT "OnlinePayment_subscriberShopId_fkey" FOREIGN KEY ("subscriberShopId") REFERENCES "Shop"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
