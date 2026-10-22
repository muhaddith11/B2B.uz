-- Distribyutor xodimi kiritgan buyurtma do'kon egasi tasdiqlaguncha jo'natilmaydi
ALTER TYPE "OrderStatus" ADD VALUE IF NOT EXISTS 'AWAITING_SHOP' BEFORE 'SENT';

-- Platforma tasdig'i olib tashlandi: tekshiruv kutayotgan distribyutorlar faol bo'ladi.
-- Admini qolmagan (hisobini o'chirgan) kompaniya to'xtatilganicha qoladi
UPDATE "Distributor" d
SET status = 'ACTIVE'
WHERE d.status = 'PENDING'
  AND EXISTS (SELECT 1 FROM "Staff" s WHERE s."distributorId" = d.id AND s.role = 'ADMIN' AND s.active);

-- Yangi distribyutor ro'yxatdan o'tishi bilan faol
ALTER TABLE "Distributor" ALTER COLUMN "status" SET DEFAULT 'ACTIVE';
