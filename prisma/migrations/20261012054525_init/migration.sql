-- CreateEnum
CREATE TYPE "DistributorStatus" AS ENUM ('PENDING', 'ACTIVE');

-- CreateEnum
CREATE TYPE "StaffRole" AS ENUM ('ADMIN', 'OPERATOR', 'ACCOUNTANT', 'AGENT', 'COURIER');

-- CreateEnum
CREATE TYPE "ShopUserRole" AS ENUM ('OWNER', 'SELLER');

-- CreateEnum
CREATE TYPE "LinkStatus" AS ENUM ('REQUESTED', 'ACTIVE', 'BLOCKED');

-- CreateEnum
CREATE TYPE "LinkSource" AS ENUM ('AGENT', 'SEARCH', 'PLATFORM');

-- CreateEnum
CREATE TYPE "OrderStatus" AS ENUM ('SENT', 'ACCEPTED', 'REJECTED', 'IN_DELIVERY', 'DELIVERED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "PaymentType" AS ENUM ('CASH', 'TRANSFER', 'CREDIT');

-- CreateEnum
CREATE TYPE "OrderSource" AS ENUM ('APP', 'AGENT');

-- CreateEnum
CREATE TYPE "LedgerType" AS ENUM ('DEBT', 'PAYMENT', 'ADJUSTMENT');

-- CreateEnum
CREATE TYPE "LedgerStatus" AS ENUM ('CONFIRMED', 'PENDING', 'REJECTED');

-- CreateEnum
CREATE TYPE "PaymentChannel" AS ENUM ('CASH', 'CARD_RECEIPT', 'BANK_TRANSFER', 'PAYME', 'CLICK');

-- CreateEnum
CREATE TYPE "PaymentMethodType" AS ENUM ('PAYME', 'CLICK', 'CARD', 'BANK_ACCOUNT');

-- CreateEnum
CREATE TYPE "SenderType" AS ENUM ('SHOP', 'STAFF', 'SYSTEM');

-- CreateEnum
CREATE TYPE "PromotionType" AS ENUM ('PERCENT', 'N_PLUS_ONE');

-- CreateTable
CREATE TABLE "Distributor" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "inn" TEXT,
    "districts" TEXT[],
    "categories" TEXT[],
    "minOrder" INTEGER NOT NULL DEFAULT 0,
    "deliveryDays" TEXT[],
    "status" "DistributorStatus" NOT NULL DEFAULT 'PENDING',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Distributor_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Staff" (
    "id" TEXT NOT NULL,
    "distributorId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "telegramId" BIGINT,
    "role" "StaffRole" NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Staff_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Shop" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "address" TEXT NOT NULL,
    "district" TEXT NOT NULL,
    "lat" DOUBLE PRECISION,
    "lng" DOUBLE PRECISION,
    "inn" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Shop_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ShopUser" (
    "id" TEXT NOT NULL,
    "shopId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "telegramId" BIGINT,
    "role" "ShopUserRole" NOT NULL DEFAULT 'OWNER',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ShopUser_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PriceGroup" (
    "id" TEXT NOT NULL,
    "distributorId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "isDefault" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "PriceGroup_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ShopLink" (
    "id" TEXT NOT NULL,
    "shopId" TEXT NOT NULL,
    "distributorId" TEXT NOT NULL,
    "status" "LinkStatus" NOT NULL DEFAULT 'REQUESTED',
    "priceGroupId" TEXT,
    "creditLimit" INTEGER NOT NULL DEFAULT 0,
    "creditDays" INTEGER NOT NULL DEFAULT 14,
    "blockAfterDays" INTEGER DEFAULT 7,
    "agentId" TEXT,
    "source" "LinkSource" NOT NULL DEFAULT 'AGENT',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ShopLink_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Product" (
    "id" TEXT NOT NULL,
    "distributorId" TEXT NOT NULL,
    "sku" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "brand" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "unit" TEXT NOT NULL DEFAULT 'dona',
    "packSize" INTEGER NOT NULL DEFAULT 1,
    "barcode" TEXT,
    "imageUrl" TEXT,
    "inStock" BOOLEAN NOT NULL DEFAULT true,
    "minOrderPacks" INTEGER NOT NULL DEFAULT 1,
    "marked" BOOLEAN NOT NULL DEFAULT false,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Product_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Price" (
    "id" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "priceGroupId" TEXT NOT NULL,
    "price" INTEGER NOT NULL,
    "validFrom" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Price_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Order" (
    "id" TEXT NOT NULL,
    "number" SERIAL NOT NULL,
    "shopLinkId" TEXT NOT NULL,
    "status" "OrderStatus" NOT NULL DEFAULT 'SENT',
    "paymentType" "PaymentType" NOT NULL,
    "total" INTEGER NOT NULL,
    "deliveredTotal" INTEGER,
    "deliveryDate" TIMESTAMP(3),
    "source" "OrderSource" NOT NULL DEFAULT 'APP',
    "createdByShopUserId" TEXT,
    "createdByStaffId" TEXT,
    "courierId" TEXT,
    "rejectReason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Order_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OrderItem" (
    "id" TEXT NOT NULL,
    "orderId" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "qty" INTEGER NOT NULL,
    "deliveredQty" INTEGER,
    "price" INTEGER NOT NULL,

    CONSTRAINT "OrderItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LedgerEntry" (
    "id" TEXT NOT NULL,
    "shopLinkId" TEXT NOT NULL,
    "type" "LedgerType" NOT NULL,
    "amount" INTEGER NOT NULL,
    "date" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "dueDate" TIMESTAMP(3),
    "orderId" TEXT,
    "status" "LedgerStatus" NOT NULL DEFAULT 'CONFIRMED',
    "channel" "PaymentChannel",
    "paymentMethodId" TEXT,
    "receiptUrl" TEXT,
    "receiptHash" TEXT,
    "providerTxnId" TEXT,
    "createdBy" TEXT NOT NULL,
    "note" TEXT,
    "reversesId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "LedgerEntry_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PaymentMethod" (
    "id" TEXT NOT NULL,
    "distributorId" TEXT NOT NULL,
    "type" "PaymentMethodType" NOT NULL,
    "merchantId" TEXT,
    "secretKeyEnc" TEXT,
    "number" TEXT,
    "holder" TEXT,
    "bankMfo" TEXT,
    "inn" TEXT,
    "isPrimary" BOOLEAN NOT NULL DEFAULT false,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PaymentMethod_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Message" (
    "id" TEXT NOT NULL,
    "shopLinkId" TEXT NOT NULL,
    "senderType" "SenderType" NOT NULL,
    "senderShopUserId" TEXT,
    "senderStaffId" TEXT,
    "text" TEXT,
    "fileUrl" TEXT,
    "orderId" TEXT,
    "ledgerEntryId" TEXT,
    "readAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Message_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Promotion" (
    "id" TEXT NOT NULL,
    "distributorId" TEXT NOT NULL,
    "type" "PromotionType" NOT NULL,
    "title" TEXT NOT NULL,
    "percent" INTEGER,
    "buyQty" INTEGER,
    "freeQty" INTEGER,
    "productIds" TEXT[],
    "startsAt" TIMESTAMP(3) NOT NULL,
    "endsAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Promotion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AuditLog" (
    "id" TEXT NOT NULL,
    "actor" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "entity" TEXT NOT NULL,
    "entityId" TEXT NOT NULL,
    "before" JSONB,
    "after" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AuditLog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Staff_telegramId_key" ON "Staff"("telegramId");

-- CreateIndex
CREATE INDEX "Staff_distributorId_idx" ON "Staff"("distributorId");

-- CreateIndex
CREATE UNIQUE INDEX "ShopUser_telegramId_key" ON "ShopUser"("telegramId");

-- CreateIndex
CREATE INDEX "ShopUser_shopId_idx" ON "ShopUser"("shopId");

-- CreateIndex
CREATE UNIQUE INDEX "PriceGroup_distributorId_name_key" ON "PriceGroup"("distributorId", "name");

-- CreateIndex
CREATE INDEX "ShopLink_distributorId_idx" ON "ShopLink"("distributorId");

-- CreateIndex
CREATE UNIQUE INDEX "ShopLink_shopId_distributorId_key" ON "ShopLink"("shopId", "distributorId");

-- CreateIndex
CREATE INDEX "Product_distributorId_category_idx" ON "Product"("distributorId", "category");

-- CreateIndex
CREATE UNIQUE INDEX "Product_distributorId_sku_key" ON "Product"("distributorId", "sku");

-- CreateIndex
CREATE UNIQUE INDEX "Price_productId_priceGroupId_key" ON "Price"("productId", "priceGroupId");

-- CreateIndex
CREATE UNIQUE INDEX "Order_number_key" ON "Order"("number");

-- CreateIndex
CREATE INDEX "Order_shopLinkId_createdAt_idx" ON "Order"("shopLinkId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "LedgerEntry_providerTxnId_key" ON "LedgerEntry"("providerTxnId");

-- CreateIndex
CREATE UNIQUE INDEX "LedgerEntry_reversesId_key" ON "LedgerEntry"("reversesId");

-- CreateIndex
CREATE INDEX "LedgerEntry_shopLinkId_date_idx" ON "LedgerEntry"("shopLinkId", "date");

-- CreateIndex
CREATE INDEX "LedgerEntry_receiptHash_idx" ON "LedgerEntry"("receiptHash");

-- CreateIndex
CREATE INDEX "PaymentMethod_distributorId_idx" ON "PaymentMethod"("distributorId");

-- CreateIndex
CREATE INDEX "Message_shopLinkId_createdAt_idx" ON "Message"("shopLinkId", "createdAt");

-- CreateIndex
CREATE INDEX "AuditLog_entity_entityId_idx" ON "AuditLog"("entity", "entityId");

-- AddForeignKey
ALTER TABLE "Staff" ADD CONSTRAINT "Staff_distributorId_fkey" FOREIGN KEY ("distributorId") REFERENCES "Distributor"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ShopUser" ADD CONSTRAINT "ShopUser_shopId_fkey" FOREIGN KEY ("shopId") REFERENCES "Shop"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PriceGroup" ADD CONSTRAINT "PriceGroup_distributorId_fkey" FOREIGN KEY ("distributorId") REFERENCES "Distributor"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ShopLink" ADD CONSTRAINT "ShopLink_shopId_fkey" FOREIGN KEY ("shopId") REFERENCES "Shop"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ShopLink" ADD CONSTRAINT "ShopLink_distributorId_fkey" FOREIGN KEY ("distributorId") REFERENCES "Distributor"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ShopLink" ADD CONSTRAINT "ShopLink_priceGroupId_fkey" FOREIGN KEY ("priceGroupId") REFERENCES "PriceGroup"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ShopLink" ADD CONSTRAINT "ShopLink_agentId_fkey" FOREIGN KEY ("agentId") REFERENCES "Staff"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Product" ADD CONSTRAINT "Product_distributorId_fkey" FOREIGN KEY ("distributorId") REFERENCES "Distributor"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Price" ADD CONSTRAINT "Price_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Price" ADD CONSTRAINT "Price_priceGroupId_fkey" FOREIGN KEY ("priceGroupId") REFERENCES "PriceGroup"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Order" ADD CONSTRAINT "Order_shopLinkId_fkey" FOREIGN KEY ("shopLinkId") REFERENCES "ShopLink"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Order" ADD CONSTRAINT "Order_createdByShopUserId_fkey" FOREIGN KEY ("createdByShopUserId") REFERENCES "ShopUser"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Order" ADD CONSTRAINT "Order_createdByStaffId_fkey" FOREIGN KEY ("createdByStaffId") REFERENCES "Staff"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Order" ADD CONSTRAINT "Order_courierId_fkey" FOREIGN KEY ("courierId") REFERENCES "Staff"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OrderItem" ADD CONSTRAINT "OrderItem_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "Order"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OrderItem" ADD CONSTRAINT "OrderItem_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LedgerEntry" ADD CONSTRAINT "LedgerEntry_shopLinkId_fkey" FOREIGN KEY ("shopLinkId") REFERENCES "ShopLink"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LedgerEntry" ADD CONSTRAINT "LedgerEntry_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "Order"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LedgerEntry" ADD CONSTRAINT "LedgerEntry_paymentMethodId_fkey" FOREIGN KEY ("paymentMethodId") REFERENCES "PaymentMethod"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LedgerEntry" ADD CONSTRAINT "LedgerEntry_reversesId_fkey" FOREIGN KEY ("reversesId") REFERENCES "LedgerEntry"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PaymentMethod" ADD CONSTRAINT "PaymentMethod_distributorId_fkey" FOREIGN KEY ("distributorId") REFERENCES "Distributor"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Message" ADD CONSTRAINT "Message_shopLinkId_fkey" FOREIGN KEY ("shopLinkId") REFERENCES "ShopLink"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Message" ADD CONSTRAINT "Message_senderShopUserId_fkey" FOREIGN KEY ("senderShopUserId") REFERENCES "ShopUser"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Message" ADD CONSTRAINT "Message_senderStaffId_fkey" FOREIGN KEY ("senderStaffId") REFERENCES "Staff"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Message" ADD CONSTRAINT "Message_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "Order"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Message" ADD CONSTRAINT "Message_ledgerEntryId_fkey" FOREIGN KEY ("ledgerEntryId") REFERENCES "LedgerEntry"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Promotion" ADD CONSTRAINT "Promotion_distributorId_fkey" FOREIGN KEY ("distributorId") REFERENCES "Distributor"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
