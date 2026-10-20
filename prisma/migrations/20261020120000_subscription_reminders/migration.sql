-- CreateEnum
CREATE TYPE "ReminderStage" AS ENUM ('SOON', 'GRACE', 'EXPIRED');

-- CreateTable
CREATE TABLE "SubscriptionReminder" (
    "id" TEXT NOT NULL,
    "orgKind" TEXT NOT NULL,
    "orgId" TEXT NOT NULL,
    "stage" "ReminderStage" NOT NULL,
    "paidUntil" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SubscriptionReminder_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "SubscriptionReminder_orgKind_orgId_stage_paidUntil_key" ON "SubscriptionReminder"("orgKind", "orgId", "stage", "paidUntil");
