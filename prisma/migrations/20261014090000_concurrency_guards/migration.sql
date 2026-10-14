-- AlterTable
ALTER TABLE "LedgerEntry" ADD COLUMN "clientKey" TEXT;

-- AlterTable
ALTER TABLE "OtpCode" ADD COLUMN "ip" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "LedgerEntry_clientKey_key" ON "LedgerEntry"("clientKey");

-- CreateIndex
CREATE INDEX "OtpCode_ip_createdAt_idx" ON "OtpCode"("ip", "createdAt");

-- CreateIndex
CREATE INDEX "OtpCode_createdAt_idx" ON "OtpCode"("createdAt");
