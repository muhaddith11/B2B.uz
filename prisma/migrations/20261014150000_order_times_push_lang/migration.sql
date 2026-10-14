-- Telegram Mini App olib tashlandi: do'konlar va xodimlar faqat mobil ilova (SMS kod) orqali kiradi
ALTER TABLE "Staff" DROP COLUMN "telegramId";
ALTER TABLE "ShopUser" DROP COLUMN "telegramId";

-- Buyurtma holati bosqichlari vaqti (ilovadagi buyurtma yo'lida ko'rinadi)
ALTER TABLE "Order" ADD COLUMN "acceptedAt" TIMESTAMP(3),
ADD COLUMN "dispatchedAt" TIMESTAMP(3),
ADD COLUMN "deliveredAt" TIMESTAMP(3);

-- Mavjud buyurtmalar uchun vaqtni amallar jurnalidan tiklash
UPDATE "Order" o SET "acceptedAt" = a.t
FROM (SELECT "entityId", MIN("createdAt") AS t FROM "AuditLog" WHERE "entity" = 'Order' AND "action" = 'order.ACCEPTED' GROUP BY "entityId") a
WHERE a."entityId" = o."id";
UPDATE "Order" o SET "dispatchedAt" = a.t
FROM (SELECT "entityId", MIN("createdAt") AS t FROM "AuditLog" WHERE "entity" = 'Order' AND "action" = 'order.IN_DELIVERY' GROUP BY "entityId") a
WHERE a."entityId" = o."id";
UPDATE "Order" o SET "deliveredAt" = a.t
FROM (SELECT "entityId", MIN("createdAt") AS t FROM "AuditLog" WHERE "entity" = 'Order' AND "action" = 'order.DELIVERED' GROUP BY "entityId") a
WHERE a."entityId" = o."id";
-- Agent olgan buyurtma yaratilganda darhol qabul qilingan bo'ladi
UPDATE "Order" SET "acceptedAt" = "createdAt" WHERE "acceptedAt" IS NULL AND "source" = 'AGENT';

-- Push bildirishnoma tili (ilovada tanlangan)
ALTER TABLE "PushToken" ADD COLUMN "lang" TEXT NOT NULL DEFAULT 'uz';
