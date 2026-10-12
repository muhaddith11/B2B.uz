-- CreateEnum
CREATE TYPE "BrandStatus" AS ENUM ('PENDING', 'ACTIVE');

-- CreateEnum
CREATE TYPE "AgreementStatus" AS ENUM ('PROPOSED', 'ACTIVE', 'REJECTED', 'ENDED');

-- CreateEnum
CREATE TYPE "AgreementSide" AS ENUM ('BRAND', 'DISTRIBUTOR');

-- CreateEnum
CREATE TYPE "BrandOrderStatus" AS ENUM ('SENT', 'ACCEPTED', 'REJECTED', 'SHIPPED', 'DELIVERED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "OnlinePaymentStatus" AS ENUM ('CREATED', 'PAID', 'CANCELLED');

-- CreateEnum
CREATE TYPE "PushOwner" AS ENUM ('SHOP_USER', 'STAFF', 'BRAND_USER');

-- AlterTable
ALTER TABLE "PaymentMethod" ADD COLUMN     "serviceId" TEXT;

-- AlterTable
ALTER TABLE "Product" ADD COLUMN     "brandProductId" TEXT;

-- CreateTable
CREATE TABLE "Brand" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "inn" TEXT,
    "description" TEXT,
    "categories" TEXT[],
    "status" "BrandStatus" NOT NULL DEFAULT 'PENDING',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Brand_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BrandUser" (
    "id" TEXT NOT NULL,
    "brandId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "BrandUser_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BrandProduct" (
    "id" TEXT NOT NULL,
    "brandId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "unit" TEXT NOT NULL DEFAULT 'dona',
    "packSize" INTEGER NOT NULL DEFAULT 1,
    "barcode" TEXT,
    "imageUrl" TEXT,
    "description" TEXT,
    "price" INTEGER NOT NULL,
    "retailPrice" INTEGER,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "BrandProduct_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Agreement" (
    "id" TEXT NOT NULL,
    "brandId" TEXT NOT NULL,
    "distributorId" TEXT NOT NULL,
    "status" "AgreementStatus" NOT NULL DEFAULT 'PROPOSED',
    "initiatedBy" "AgreementSide" NOT NULL,
    "districts" TEXT[],
    "discountPercent" INTEGER NOT NULL DEFAULT 0,
    "terms" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "respondedAt" TIMESTAMP(3),
    "endedAt" TIMESTAMP(3),

    CONSTRAINT "Agreement_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BrandOrder" (
    "id" TEXT NOT NULL,
    "number" SERIAL NOT NULL,
    "agreementId" TEXT NOT NULL,
    "brandId" TEXT NOT NULL,
    "distributorId" TEXT NOT NULL,
    "status" "BrandOrderStatus" NOT NULL DEFAULT 'SENT',
    "total" INTEGER NOT NULL,
    "note" TEXT,
    "rejectReason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "BrandOrder_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BrandOrderItem" (
    "id" TEXT NOT NULL,
    "orderId" TEXT NOT NULL,
    "brandProductId" TEXT NOT NULL,
    "qty" INTEGER NOT NULL,
    "price" INTEGER NOT NULL,

    CONSTRAINT "BrandOrderItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OnlinePayment" (
    "id" TEXT NOT NULL,
    "number" SERIAL NOT NULL,
    "shopLinkId" TEXT NOT NULL,
    "paymentMethodId" TEXT NOT NULL,
    "provider" "PaymentMethodType" NOT NULL,
    "amount" INTEGER NOT NULL,
    "status" "OnlinePaymentStatus" NOT NULL DEFAULT 'CREATED',
    "providerTxnId" TEXT,
    "providerState" INTEGER,
    "providerCreateTime" BIGINT,
    "performedAt" TIMESTAMP(3),
    "cancelledAt" TIMESTAMP(3),
    "cancelReason" INTEGER,
    "ledgerEntryId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "OnlinePayment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PushToken" (
    "id" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "ownerKind" "PushOwner" NOT NULL,
    "ownerId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PushToken_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "BrandUser_brandId_idx" ON "BrandUser"("brandId");

-- CreateIndex
CREATE INDEX "BrandProduct_brandId_idx" ON "BrandProduct"("brandId");

-- CreateIndex
CREATE INDEX "Agreement_brandId_idx" ON "Agreement"("brandId");

-- CreateIndex
CREATE INDEX "Agreement_distributorId_idx" ON "Agreement"("distributorId");

-- CreateIndex
CREATE UNIQUE INDEX "BrandOrder_number_key" ON "BrandOrder"("number");

-- CreateIndex
CREATE INDEX "BrandOrder_brandId_createdAt_idx" ON "BrandOrder"("brandId", "createdAt");

-- CreateIndex
CREATE INDEX "BrandOrder_distributorId_createdAt_idx" ON "BrandOrder"("distributorId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "OnlinePayment_number_key" ON "OnlinePayment"("number");

-- CreateIndex
CREATE UNIQUE INDEX "OnlinePayment_ledgerEntryId_key" ON "OnlinePayment"("ledgerEntryId");

-- CreateIndex
CREATE INDEX "OnlinePayment_shopLinkId_idx" ON "OnlinePayment"("shopLinkId");

-- CreateIndex
CREATE UNIQUE INDEX "OnlinePayment_provider_providerTxnId_key" ON "OnlinePayment"("provider", "providerTxnId");

-- CreateIndex
CREATE UNIQUE INDEX "PushToken_token_key" ON "PushToken"("token");

-- CreateIndex
CREATE INDEX "PushToken_ownerKind_ownerId_idx" ON "PushToken"("ownerKind", "ownerId");

-- AddForeignKey
ALTER TABLE "Product" ADD CONSTRAINT "Product_brandProductId_fkey" FOREIGN KEY ("brandProductId") REFERENCES "BrandProduct"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BrandUser" ADD CONSTRAINT "BrandUser_brandId_fkey" FOREIGN KEY ("brandId") REFERENCES "Brand"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BrandProduct" ADD CONSTRAINT "BrandProduct_brandId_fkey" FOREIGN KEY ("brandId") REFERENCES "Brand"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Agreement" ADD CONSTRAINT "Agreement_brandId_fkey" FOREIGN KEY ("brandId") REFERENCES "Brand"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Agreement" ADD CONSTRAINT "Agreement_distributorId_fkey" FOREIGN KEY ("distributorId") REFERENCES "Distributor"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BrandOrder" ADD CONSTRAINT "BrandOrder_agreementId_fkey" FOREIGN KEY ("agreementId") REFERENCES "Agreement"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BrandOrder" ADD CONSTRAINT "BrandOrder_brandId_fkey" FOREIGN KEY ("brandId") REFERENCES "Brand"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BrandOrder" ADD CONSTRAINT "BrandOrder_distributorId_fkey" FOREIGN KEY ("distributorId") REFERENCES "Distributor"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BrandOrderItem" ADD CONSTRAINT "BrandOrderItem_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "BrandOrder"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BrandOrderItem" ADD CONSTRAINT "BrandOrderItem_brandProductId_fkey" FOREIGN KEY ("brandProductId") REFERENCES "BrandProduct"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OnlinePayment" ADD CONSTRAINT "OnlinePayment_shopLinkId_fkey" FOREIGN KEY ("shopLinkId") REFERENCES "ShopLink"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OnlinePayment" ADD CONSTRAINT "OnlinePayment_paymentMethodId_fkey" FOREIGN KEY ("paymentMethodId") REFERENCES "PaymentMethod"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
