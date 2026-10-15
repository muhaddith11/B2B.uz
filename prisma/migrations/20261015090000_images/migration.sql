-- Rasmlar: distribyutor va tovar egasi logosi, do'kon surati, har bir foydalanuvchining avatari
ALTER TABLE "Distributor" ADD COLUMN "logoUrl" TEXT;
ALTER TABLE "Shop" ADD COLUMN "imageUrl" TEXT;
ALTER TABLE "Brand" ADD COLUMN "logoUrl" TEXT;
ALTER TABLE "Staff" ADD COLUMN "avatarUrl" TEXT;
ALTER TABLE "ShopUser" ADD COLUMN "avatarUrl" TEXT;
ALTER TABLE "BrandUser" ADD COLUMN "avatarUrl" TEXT;
