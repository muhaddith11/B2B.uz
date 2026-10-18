// Payme va Click kalitlarini yangi shifrlash kalitiga (PAYMENT_KEYS_SECRET, "v2:") o'tkazish.
// Bir marta, PAYMENT_KEYS_SECRET o'rnatilgandan keyin ishga tushiriladi:
//   npm run keys:reencrypt
// Qayta ishga tushirilsa, allaqachon o'tkazilganlarga tegmaydi. Shundan keyin SESSION_SECRET ni xavfsiz almashtirish mumkin
// (docs/SECURITY.md, "Kalitlarni almashtirish").
import { PrismaClient } from "@prisma/client";
import { decryptSecret, encryptSecret, isLegacySecret } from "../src/lib/crypto";

const db = new PrismaClient();

async function main() {
  if (!process.env.PAYMENT_KEYS_SECRET) throw new Error("Avval PAYMENT_KEYS_SECRET ni o'rnating (kamida 32 tasodifiy belgi)");
  const methods = await db.paymentMethod.findMany({ where: { secretKeyEnc: { not: null } }, select: { id: true, secretKeyEnc: true } });
  let moved = 0;
  for (const m of methods) {
    if (!m.secretKeyEnc || !isLegacySecret(m.secretKeyEnc)) continue;
    const plain = decryptSecret(m.secretKeyEnc);
    // Shart bilan: shu payt admin kalitni ilovadan almashtirgan bo'lsa, yangisi ustiga yozilmaydi
    const res = await db.paymentMethod.updateMany({ where: { id: m.id, secretKeyEnc: m.secretKeyEnc }, data: { secretKeyEnc: encryptSecret(plain) } });
    moved += res.count;
  }
  console.log(`To'lov kalitlari: ${methods.length} ta, yangi kalitga o'tkazildi: ${moved} ta`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  })
  .finally(() => db.$disconnect());
