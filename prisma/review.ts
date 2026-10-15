// App Store va Google Play tekshiruvchilari uchun demo hisoblar: bitta raqam (REVIEW_PHONE) uchta hisobga bog'lanadi,
// kirishda ilova qaysi biri bilan kirishni so'raydi: do'kon, distribyutor (admin) va tovar egasi.
// Kod SMS'siz, har doim REVIEW_CODE (src/lib/otp.ts). Ishlatish: REVIEW_PHONE va REVIEW_CODE ni .env ga yozib, keyin
//   npm run db:review
// Vercel'da har deployda `--if-configured` bilan ishlaydi (vercel-build): ikkalasi yozilmagan bo'lsa jim o'tadi,
// xato bo'lsa deployni to'xtatmaydi. Qayta ishga tushirilsa hech narsa o'zgarmaydi (bu raqamda biror hisob bo'lsa to'xtaydi).
// Boshqa ma'lumotlarga tegmaydi.
import { PrismaClient } from "@prisma/client";
import { normalizePhone } from "../src/lib/phone";
import { trialPeriod } from "../src/lib/subscription";

const db = new PrismaClient();
const ifConfigured = process.argv.includes("--if-configured");
const DAY = 24 * 60 * 60 * 1000;
const daysAgo = (n: number) => new Date(Date.now() - n * DAY);

const PRODUCTS: [sku: string, name: string, brand: string, category: string, packSize: number, price: number][] = [
  ["D-001", "Gazlangan ichimlik, limon, 1,5 l", "Demo Salqin", "Ichimliklar", 6, 9_800],
  ["D-002", "Gazlangan ichimlik, apelsin, 1,5 l", "Demo Salqin", "Ichimliklar", 6, 9_800],
  ["D-003", "Ichimlik suvi, gazsiz, 1,5 l", "Demo Buloq", "Suv", 6, 3_900],
  ["D-004", "Sharbat, olma, 1 l", "Demo Bog'", "Sharbat", 12, 14_500],
  ["D-005", "Sut 3,2%, 1 l", "Demo Sut", "Sut mahsulotlari", 10, 12_000],
  ["D-006", "Qatiq, 0,5 l", "Demo Sut", "Sut mahsulotlari", 20, 7_500],
  ["D-007", "Pechenye, sutli, 300 g", "Demo Non", "Shirinliklar", 18, 9_900],
  ["D-008", "Muzli choy, limonli, 1 l", "Demo Salqin", "Ichimliklar", 12, 8_900],
];

async function main() {
  const phone = normalizePhone(process.env.REVIEW_PHONE ?? "");
  const codeOk = /^\d{6}$/.test(process.env.REVIEW_CODE ?? "");
  if (ifConfigured && (!phone || !codeOk)) {
    console.log("Demo hisoblar: REVIEW_PHONE yoki REVIEW_CODE yozilmagan, o'tkazib yuborildi.");
    return;
  }
  if (!phone) throw new Error("REVIEW_PHONE yozilmagan yoki noto'g'ri (+998XXXXXXXXX)");
  if (!codeOk) throw new Error("REVIEW_CODE 6 xonali raqam bo'lsin");

  const existing =
    (await db.shopUser.findFirst({ where: { phone } })) ??
    (await db.staff.findFirst({ where: { phone } })) ??
    (await db.brandUser.findFirst({ where: { phone } }));
  if (existing) {
    console.log(`${phone} raqamida hisob allaqachon bor. Demo hisoblar o'zgartirilmadi.`);
    return;
  }

  await db.$transaction(async (tx) => {
    const dist = await tx.distributor.create({
      data: {
        name: "Captar Demo Distribyutor",
        districts: ["Toshkent shahri"],
        categories: ["Ichimliklar", "Sut mahsulotlari", "Shirinliklar"],
        minOrder: 200_000,
        deliveryDays: ["Du", "Chor", "Ju"],
        status: "ACTIVE",
        ...trialPeriod(),
        staff: { create: { name: "Demo admin", phone, role: "ADMIN" } },
        paymentMethods: { create: { type: "CARD", number: "8600000000000000", holder: "CAPTAR DEMO", isPrimary: true } },
      },
      include: { staff: true },
    });
    const group = await tx.priceGroup.create({ data: { distributorId: dist.id, name: "Asosiy", isDefault: true } });
    const products = [];
    for (const [sku, name, brand, category, packSize, price] of PRODUCTS) {
      products.push(
        await tx.product.create({
          data: { distributorId: dist.id, sku, name, brand, category, packSize, prices: { create: { priceGroupId: group.id, price } } },
          include: { prices: true },
        }),
      );
    }

    const shop = await tx.shop.create({
      data: {
        name: "Captar Demo Do'kon",
        address: "Toshkent shahri, Amir Temur ko'chasi, 1",
        district: "Toshkent shahri",
        ...trialPeriod(),
        users: { create: { name: "Demo do'konchi", phone, role: "OWNER" } },
      },
      include: { users: true },
    });
    const link = await tx.shopLink.create({
      data: { shopId: shop.id, distributorId: dist.id, status: "ACTIVE", priceGroupId: group.id, creditLimit: 2_000_000, creditDays: 14, source: "AGENT" },
    });

    // Topshirilgan buyurtma (qarz daftarida ko'rinadi) va yangi buyurtma (distribyutor qabul qiladi)
    const [p1, p2, p3] = products;
    const deliveredAt = daysAgo(3);
    const delivered = await tx.order.create({
      data: {
        shopLinkId: link.id,
        paymentType: "CREDIT",
        status: "DELIVERED",
        total: 12 * p1.prices[0].price + 12 * p3.prices[0].price,
        deliveredTotal: 12 * p1.prices[0].price + 12 * p3.prices[0].price,
        source: "APP",
        createdByShopUserId: shop.users[0].id,
        createdAt: daysAgo(4),
        acceptedAt: daysAgo(4),
        dispatchedAt: deliveredAt,
        deliveredAt,
        items: {
          create: [
            { productId: p1.id, qty: 12, deliveredQty: 12, price: p1.prices[0].price },
            { productId: p3.id, qty: 12, deliveredQty: 12, price: p3.prices[0].price },
          ],
        },
      },
    });
    await tx.ledgerEntry.create({
      data: {
        shopLinkId: link.id,
        type: "DEBT",
        amount: delivered.total,
        date: deliveredAt,
        dueDate: new Date(deliveredAt.getTime() + 14 * DAY),
        orderId: delivered.id,
        createdBy: "system",
      },
    });
    await tx.order.create({
      data: {
        shopLinkId: link.id,
        paymentType: "CASH",
        status: "SENT",
        total: 30 * p2.prices[0].price,
        source: "APP",
        createdByShopUserId: shop.users[0].id,
        items: { create: { productId: p2.id, qty: 30, price: p2.prices[0].price } },
      },
    });

    const brand = await tx.brand.create({
      data: {
        name: "Captar Demo Brend",
        categories: ["Sharbat"],
        description: "Demo tovar egasi (ishlab chiqaruvchi)",
        status: "ACTIVE",
        users: { create: { name: "Demo tovar egasi", phone } },
        products: {
          create: [
            { name: "Sharbat, olma, 1 l", category: "Sharbat", packSize: 12, price: 11_000, retailPrice: 15_000 },
            { name: "Sharbat, o'rik, 1 l", category: "Sharbat", packSize: 12, price: 11_500, retailPrice: 15_500 },
          ],
        },
      },
    });
    await tx.agreement.create({
      data: { brandId: brand.id, distributorId: dist.id, status: "ACTIVE", initiatedBy: "BRAND", districts: dist.districts, discountPercent: 5, respondedAt: new Date() },
    });
  });

  console.log(`Tayyor: ${phone} raqamiga demo do'kon, distribyutor (admin) va tovar egasi bog'landi. Kod: REVIEW_CODE.`);
}

main()
  .catch((e) => {
    console.error("Demo hisoblar yaratilmadi:", e);
    process.exit(ifConfigured ? 0 : 1);
  })
  .finally(() => db.$disconnect());
