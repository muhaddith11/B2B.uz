-- Do'kon egasi raqamini tasdiqlagan vaqt. Mavjud do'konlar tasdiqlangan deb olinadi: yangi qoida faqat bundan keyin
-- agent qo'shgan do'konlarga qo'llanadi (ishlab turgan savdo to'xtamasin)
ALTER TABLE "Shop" ADD COLUMN "verifiedAt" TIMESTAMP(3);
UPDATE "Shop" SET "verifiedAt" = "createdAt";

-- SMS kod: raqamga hisob bog'langanmi (umumiy soatlik chegara faqat hisobi yo'q raqamlarga)
ALTER TABLE "OtpCode" ADD COLUMN "knownPhone" BOOLEAN NOT NULL DEFAULT false;
CREATE INDEX "OtpCode_knownPhone_createdAt_idx" ON "OtpCode"("knownPhone", "createdAt");
