// Demo ma'lumotlar: 6 ta xayoliy distribyutor (bittasi tekshiruvda), 3 ta tovar egasi, 4 ta do'kon.
// Nomlar o'ylab topilgan, haqiqiy kompaniyalarga aloqasi yo'q.
// Telefonlar (SMS kod bilan kirish, sinov rejimida kod ilovada ko'rinadi):
//   do'konlar: +998 90 000 00 01 … 04
//   distribyutor xodimlari: +998 91 00D 000R  (D: distribyutor 0-5, R: 0 admin, 1 operator, 2 agent, 3 yetkazuvchi, 4 hisobchi)
//   tovar egalari: +998 97 000 00 01 … 03
import { PrismaClient, type StaffRole } from "@prisma/client";
import { encryptSecret } from "../src/lib/crypto";
import { trialPeriod } from "../src/lib/subscription";

const db = new PrismaClient();
const DAY = 24 * 60 * 60 * 1000;
const daysAgo = (n: number) => new Date(Date.now() - n * DAY);
const hoursAgo = (n: number) => new Date(Date.now() - n * 60 * 60 * 1000);

type ProductSeed = [sku: string, name: string, brand: string, category: string, packSize: number, price: number, inStock?: boolean];

const distributors: {
  name: string;
  districts?: string[]; // ko'rsatilmasa Qo'qon shahri
  linked?: boolean; // false: hech bir do'konga ulanmagan
  pending?: boolean; // platforma tekshiruvida
  categories: string[];
  minOrder: number;
  deliveryDays: string[];
  products: ProductSeed[];
}[] = [
  {
    name: "Vodiy Ichimliklari (demo)",
    categories: ["Ichimliklar"],
    minOrder: 300_000,
    deliveryDays: ["Du", "Chor", "Ju"],
    products: [
      ["VI-001", "Gazlangan ichimlik, limon, 1,5 l", "Salqin", "Gazlangan ichimliklar", 6, 9_800],
      ["VI-002", "Gazlangan ichimlik, apelsin, 1,5 l", "Salqin", "Gazlangan ichimliklar", 6, 9_800],
      ["VI-003", "Gazlangan ichimlik, klassik, 0,5 l", "Salqin", "Gazlangan ichimliklar", 12, 5_200],
      ["VI-004", "Ichimlik suvi, gazsiz, 1,5 l", "Tog' bulog'i", "Suv", 6, 3_900],
      ["VI-005", "Ichimlik suvi, gazsiz, 5 l", "Tog' bulog'i", "Suv", 2, 9_500],
      ["VI-006", "Mineral suv, gazli, 0,5 l", "Tog' bulog'i", "Suv", 12, 3_200],
      ["VI-007", "Sharbat, olma, 1 l", "Bog'dan", "Sharbat", 12, 14_500],
      ["VI-008", "Sharbat, shaftoli, 1 l", "Bog'dan", "Sharbat", 12, 14_500, false],
      ["VI-009", "Muzli choy, limonli, 1 l", "Salqin", "Choy", 12, 8_900],
    ],
  },
  {
    name: "Qo'qon Sut Savdo (demo)",
    categories: ["Sut mahsulotlari"],
    minOrder: 200_000,
    deliveryDays: ["Har kuni"],
    products: [
      ["QS-101", "Sut 3,2%, 1 l", "Sutli", "Sut", 10, 12_000],
      ["QS-102", "Sut 2,5%, 0,5 l", "Sutli", "Sut", 20, 6_800],
      ["QS-103", "Qatiq, 0,5 l", "Sutli", "Qatiq va kefir", 20, 7_500],
      ["QS-104", "Kefir 2,5%, 1 l", "Sutli", "Qatiq va kefir", 10, 13_500],
      ["QS-105", "Qaymoq 20%, 400 g", "Sutli", "Qaymoq", 12, 19_000],
      ["QS-106", "Tvorog 9%, 200 g", "Sutli", "Tvorog", 20, 11_500],
      ["QS-107", "Sariyog' 72%, 200 g", "Sutli", "Sariyog'", 20, 24_000],
    ],
  },
  {
    name: "Shirin Savdo (demo)",
    categories: ["Shirinliklar", "Bakaleya"],
    minOrder: 400_000,
    deliveryDays: ["Se", "Pa", "Sha"],
    products: [
      ["SS-201", "Sut shokoladi, 90 g", "Shirin", "Shokolad", 24, 7_500],
      ["SS-202", "Achchiq shokolad, 90 g", "Shirin", "Shokolad", 24, 8_200],
      ["SS-203", "Pechenye, sutli, 300 g", "Nonvoy", "Pechenye", 18, 9_900],
      ["SS-204", "Vafli, yong'oqli, 200 g", "Nonvoy", "Vafli", 24, 8_400],
      ["SS-205", "Karamel konfet, 1 kg", "Shirin", "Konfet", 6, 42_000],
      ["SS-206", "Shakar, 1 kg", "Bakaleya", "Bakaleya", 10, 13_800],
      ["SS-207", "Guruch, 1 kg", "Bakaleya", "Bakaleya", 10, 18_500],
      ["SS-208", "Makaron, 400 g", "Bakaleya", "Bakaleya", 20, 7_200],
    ],
  },
  {
    name: "Toza Uy (demo)",
    districts: ["Qo'qon shahri", "Farg'ona shahri"],
    linked: false,
    categories: ["Gigiyena", "Maishiy kimyo"],
    minOrder: 250_000,
    deliveryDays: ["Du", "Pa"],
    products: [
      ["TU-301", "Kir yuvish kukuni, 3 kg", "Oqlik", "Maishiy kimyo", 4, 52_000],
      ["TU-302", "Idish yuvish vositasi, 500 ml", "Oqlik", "Maishiy kimyo", 20, 11_500],
      ["TU-303", "Atir sovun, 90 g", "Nafis", "Gigiyena", 48, 4_200],
      ["TU-304", "Shampun, 400 ml", "Nafis", "Gigiyena", 12, 23_000],
      ["TU-305", "Tish pastasi, 100 ml", "Nafis", "Gigiyena", 24, 12_800],
      ["TU-306", "Hojatxona qog'ozi, 4 dona", "Yumshoq", "Gigiyena", 12, 14_000],
    ],
  },
  {
    name: "Farg'ona Bakaleya (demo)",
    districts: ["Farg'ona shahri"],
    linked: false,
    categories: ["Bakaleya"],
    minOrder: 500_000,
    deliveryDays: ["Chor", "Sha"],
    products: [
      ["FB-401", "Paxta yog'i, 1 l", "Vodiy yog'i", "Yog'", 12, 21_000],
      ["FB-402", "Un, oliy nav, 2 kg", "Oq bug'doy", "Un", 6, 16_500],
      ["FB-403", "Choy, ko'k, 100 g", "Choyxona", "Choy", 40, 9_800],
      ["FB-404", "Tuz, yodlangan, 1 kg", "Bakaleya", "Bakaleya", 20, 3_500],
      ["FB-405", "Mosh, 1 kg", "Bakaleya", "Bakaleya", 10, 24_000],
    ],
  },
  {
    name: "Andijon Savdo (demo)",
    districts: ["Andijon shahri"],
    linked: false,
    pending: true,
    categories: ["Bakaleya", "Ichimliklar"],
    minOrder: 300_000,
    deliveryDays: ["Du", "Ju"],
    products: [],
  },
];

const shops = [
  { name: "Barakat do'koni", address: "Qo'qon sh., Turon ko'chasi, 12", owner: "Akmal" },
  { name: "Oila market", address: "Qo'qon sh., Navoiy ko'chasi, 45", owner: "Dilnoza" },
  { name: "Mahalla do'koni", address: "Qo'qon sh., Istiqlol ko'chasi, 7", owner: "Rustam" },
  { name: "Yangi do'kon", address: "Qo'qon sh., Amir Temur ko'chasi, 88", owner: "Sardor" },
];

const brands: {
  name: string;
  owner: string;
  pending?: boolean;
  categories: string[];
  description: string;
  products: [name: string, category: string, packSize: number, price: number, retail: number][];
}[] = [
  {
    name: "Bog'dan Sharbatlari (demo)",
    owner: "Bekzod",
    categories: ["Sharbat", "Ichimliklar"],
    description: "Farg'ona vodiysi mevalaridan tabiiy sharbatlar",
    products: [
      ["Sharbat, olma, 1 l", "Sharbat", 12, 12_500, 16_000],
      ["Sharbat, shaftoli, 1 l", "Sharbat", 12, 12_500, 16_000],
      ["Sharbat, uzum, 1 l", "Sharbat", 12, 13_000, 17_000],
      ["Nektar, o'rik, 0,2 l", "Sharbat", 27, 3_200, 4_500],
    ],
  },
  {
    name: "Nafis Kosmetika (demo)",
    owner: "Malika",
    categories: ["Gigiyena"],
    description: "Shampun, sovun va krem ishlab chiqaruvchi",
    products: [
      ["Shampun, o'simlikli, 400 ml", "Gigiyena", 12, 19_000, 27_000],
      ["Atir sovun, 90 g", "Gigiyena", 48, 3_500, 5_000],
      ["Qo'l kremi, 50 ml", "Gigiyena", 24, 15_000, 21_000],
    ],
  },
  { name: "Yangi Brend (demo)", owner: "Javohir", pending: true, categories: ["Shirinliklar"], description: "Hali tekshiruvda", products: [] },
];

async function main() {
  // Takroriy ishga tushirishda toza boshlash uchun (bog'liqlik tartibida)
  await db.message.deleteMany();
  await db.onlinePayment.deleteMany();
  await db.ledgerEntry.updateMany({ data: { reversesId: null } });
  await db.ledgerEntry.deleteMany();
  await db.orderItem.deleteMany();
  await db.order.deleteMany();
  await db.brandOrder.deleteMany();
  await db.agreement.deleteMany();
  await db.price.deleteMany();
  await db.product.deleteMany();
  await db.brandProduct.deleteMany();
  await db.brandUser.deleteMany();
  await db.brand.deleteMany();
  await db.shopLink.deleteMany();
  await db.priceGroup.deleteMany();
  await db.paymentMethod.deleteMany();
  await db.promotion.deleteMany();
  await db.staff.deleteMany();
  await db.distributor.deleteMany();
  await db.shopUser.deleteMany();
  await db.shop.deleteMany();
  await db.auditLog.deleteMany();
  await db.otpCode.deleteMany();
  await db.pushToken.deleteMany();

  const createdShops = [];
  for (const [i, s] of shops.entries()) {
    const shop = await db.shop.create({
      data: {
        name: s.name,
        address: s.address,
        district: "Qo'qon shahri",
        ...trialPeriod(),
        users: { create: { name: s.owner, phone: `+99890000000${i + 1}`, role: "OWNER" } },
      },
      include: { users: true },
    });
    createdShops.push(shop);
  }

  // Tovar egalari va ularning tovarlari
  const brandRows = [];
  for (const [bi, b] of brands.entries()) {
    const brand = await db.brand.create({
      data: {
        name: b.name,
        categories: b.categories,
        description: b.description,
        status: b.pending ? "PENDING" : "ACTIVE",
        users: { create: { name: b.owner, phone: `+99897000000${bi + 1}` } },
        products: { create: b.products.map(([name, category, packSize, price, retailPrice]) => ({ name, category, packSize, price, retailPrice })) },
      },
      include: { products: true },
    });
    brandRows.push(brand);
  }
  const [bogdan, nafis] = brandRows;

  const dists = [];
  for (const [di, d] of distributors.entries()) {
    const dist = await db.distributor.create({
      data: {
        name: d.name,
        ...trialPeriod(),
        districts: d.districts ?? ["Qo'qon shahri"],
        categories: d.categories,
        minOrder: d.minOrder,
        deliveryDays: d.deliveryDays,
        status: d.pending ? "PENDING" : "ACTIVE",
      },
    });

    const staffRoles: [StaffRole, string][] = d.pending
      ? [["ADMIN", "Admin"]]
      : [
          ["ADMIN", "Admin"],
          ["OPERATOR", "Operator"],
          ["AGENT", "Agent"],
          ["COURIER", "Yetkazuvchi"],
          ["ACCOUNTANT", "Hisobchi"],
        ];
    const staff: Partial<Record<StaffRole, string>> = {};
    for (const [ri, [role, title]] of staffRoles.entries()) {
      const s = await db.staff.create({
        data: { distributorId: dist.id, name: `${title} ${di + 1}`, phone: `+9989100${di}000${ri}`, role },
      });
      staff[role] = s.id;
    }

    const basic = await db.priceGroup.create({ data: { distributorId: dist.id, name: "Oddiy", isDefault: true } });
    const big = d.pending ? null : await db.priceGroup.create({ data: { distributorId: dist.id, name: "Katta do'kon" } });

    const productIds: Record<string, string> = {};
    for (const [sku, name, brand, category, packSize, price, inStock = true] of d.products) {
      const p = await db.product.create({
        data: {
          distributorId: dist.id,
          sku,
          name,
          brand,
          category,
          packSize,
          inStock,
          marked: category === "Gazlangan ichimliklar" || category === "Suv",
          prices: {
            create: [{ priceGroupId: basic.id, price }, ...(big ? [{ priceGroupId: big.id, price: Math.round((price * 0.97) / 100) * 100 }] : [])],
          },
        },
      });
      productIds[sku] = p.id;
    }
    dists.push({ dist, staff, productIds, basic, big });

    if (d.linked === false) {
      // Mahalla do'koni ilovada topib, ulanishni so'ragan: panelda tasdiqlashni kutmoqda
      if (di === 3) {
        await db.shopLink.create({ data: { shopId: createdShops[2].id, distributorId: dist.id, status: "REQUESTED", source: "SEARCH" } });
      }
      continue;
    }

    // Dastlabki 3 ta distribyutor 3 ta do'kon bilan ishlaydi; 4-do'kon hech kimga ulanmagan (yangi do'kon)
    for (const [si, shop] of createdShops.slice(0, 3).entries()) {
      const link = await db.shopLink.create({
        data: {
          shopId: shop.id,
          distributorId: dist.id,
          status: "ACTIVE",
          priceGroupId: si === 1 ? big!.id : basic.id,
          creditLimit: si === 2 ? 0 : 3_000_000,
          creditDays: 14,
          agentId: staff.AGENT,
          source: "AGENT",
        },
      });

      // Tarix: bitta topshirilgan nasiyali buyurtma va qisman to'lov
      if (si < 2) {
        const [sku0, , , , pack0, price0] = d.products[0];
        const qty = pack0 * 4;
        const deliveredAt = daysAgo(si === 0 ? 19 : 4);
        const order = await db.order.create({
          data: {
            shopLinkId: link.id,
            status: "DELIVERED",
            paymentType: "CREDIT",
            total: qty * price0,
            deliveredTotal: qty * price0,
            createdByStaffId: staff.AGENT,
            source: "AGENT",
            courierId: staff.COURIER,
            createdAt: daysAgo(si === 0 ? 20 : 5),
            // Holat bosqichlari vaqti (ilovadagi buyurtma yo'li)
            acceptedAt: daysAgo(si === 0 ? 20 : 5),
            dispatchedAt: deliveredAt,
            deliveredAt,
            items: { create: { productId: productIds[sku0], qty, deliveredQty: qty, price: price0 } },
          },
        });
        await db.order.update({ where: { id: order.id }, data: { updatedAt: deliveredAt } });
        await db.ledgerEntry.create({
          data: { shopLinkId: link.id, type: "DEBT", amount: qty * price0, date: deliveredAt, dueDate: new Date(deliveredAt.getTime() + 14 * DAY), orderId: order.id, createdBy: "system" },
        });
        if (si === 0) {
          await db.ledgerEntry.create({
            data: { shopLinkId: link.id, type: "PAYMENT", amount: -Math.round((qty * price0) / 2), date: daysAgo(10), channel: "CASH", createdBy: `staff:${staff.OPERATOR}` },
          });
        }
      }

      // Xodim ekranlari uchun turli holatdagi buyurtmalar
      if (di === 0 && si === 0) {
        await db.order.create({
          data: {
            shopLinkId: link.id,
            status: "SENT",
            paymentType: "CASH",
            total: 6 * 9_800 * 6,
            source: "APP",
            createdByShopUserId: shop.users[0].id,
            createdAt: daysAgo(0),
            items: { create: { productId: productIds["VI-001"], qty: 36, price: 9_800 } },
          },
        });
        await db.order.create({
          data: {
            shopLinkId: link.id,
            status: "IN_DELIVERY",
            paymentType: "CREDIT",
            total: 24 * 3_900 + 12 * 8_900,
            source: "AGENT",
            createdByStaffId: staff.AGENT,
            courierId: staff.COURIER,
            createdAt: daysAgo(1),
            acceptedAt: daysAgo(1),
            dispatchedAt: hoursAgo(2),
            items: {
              create: [
                { productId: productIds["VI-004"], qty: 24, price: 3_900 },
                { productId: productIds["VI-009"], qty: 12, price: 8_900 },
              ],
            },
          },
        });
      }
      if (di === 0 && si === 1) {
        // Tovar egasi statistikasi uchun: Bog'dan sharbatlari sotilgan
        const sum = 24 * 14_100 + 12 * 14_100;
        const juiceOrder = await db.order.create({
          data: {
            shopLinkId: link.id,
            status: "DELIVERED",
            paymentType: "CASH",
            total: sum,
            deliveredTotal: sum,
            source: "APP",
            courierId: staff.COURIER,
            createdAt: daysAgo(3),
            acceptedAt: daysAgo(3),
            dispatchedAt: daysAgo(2),
            deliveredAt: daysAgo(2),
            items: {
              create: [
                { productId: productIds["VI-007"], qty: 24, deliveredQty: 24, price: 14_100 },
                { productId: productIds["VI-008"], qty: 12, deliveredQty: 12, price: 14_100 },
              ],
            },
          },
        });
        await db.order.update({ where: { id: juiceOrder.id }, data: { updatedAt: daysAgo(2) } });
      }
      if (di === 1 && si === 0) {
        // Hisobchi tasdiqlashi uchun chekli to'lov
        await db.ledgerEntry.create({
          data: { shopLinkId: link.id, type: "PAYMENT", amount: -200_000, status: "PENDING", channel: "CARD_RECEIPT", createdBy: "system", note: "Kartadan o'tkazdim" },
        });
      }
      if (di === 2 && si === 1) {
        await db.order.create({
          data: {
            shopLinkId: link.id,
            status: "ACCEPTED",
            paymentType: "TRANSFER",
            total: 10 * 13_800 * 4,
            source: "APP",
            createdByShopUserId: shop.users[0].id,
            createdAt: daysAgo(1),
            acceptedAt: hoursAgo(5),
            items: { create: { productId: productIds["SS-206"], qty: 40, price: 13_800 } },
          },
        });
      }
    }
  }

  // To'lov usullari. Payme va Click kalitlari faqat sinov uchun.
  const [vodiy, sut, , tozaUy] = dists;
  await db.paymentMethod.createMany({
    data: [
      { distributorId: vodiy.dist.id, type: "BANK_ACCOUNT", number: "20208000000000000001", holder: vodiy.dist.name, bankMfo: "00000", inn: "300000001", isPrimary: true },
      { distributorId: vodiy.dist.id, type: "CARD", number: "8600000000000001", holder: "VODIY ICHIMLIKLARI" },
      { distributorId: vodiy.dist.id, type: "PAYME", merchantId: "demo-payme-kassa", secretKeyEnc: encryptSecret("demo-payme-key") },
      { distributorId: sut.dist.id, type: "CARD", number: "9860000000000002", holder: "QOQON SUT SAVDO", isPrimary: true },
      { distributorId: sut.dist.id, type: "CLICK", merchantId: "1111", serviceId: "2222", secretKeyEnc: encryptSecret("demo-click-key") },
    ],
  });

  // Bog'dan Sharbatlari: Vodiy Ichimliklari bilan faol kelishuv, sharbatlar shu kelishuv orqali katalogda
  const agreement = await db.agreement.create({
    data: {
      brandId: bogdan.id,
      distributorId: vodiy.dist.id,
      status: "ACTIVE",
      initiatedBy: "BRAND",
      districts: ["Qo'qon shahri"],
      discountPercent: 5,
      terms: "Oyiga kamida 50 yashik, to'lov jo'natishdan keyin 10 kun ichida",
      createdAt: daysAgo(40),
      respondedAt: daysAgo(39),
    },
  });
  const bp = (name: string) => bogdan.products.find((p) => p.name === name)!.id;
  await db.product.update({ where: { id: vodiy.productIds["VI-007"] }, data: { brandProductId: bp("Sharbat, olma, 1 l") } });
  await db.product.update({ where: { id: vodiy.productIds["VI-008"] }, data: { brandProductId: bp("Sharbat, shaftoli, 1 l") } });
  await db.brandOrder.create({
    data: {
      agreementId: agreement.id,
      brandId: bogdan.id,
      distributorId: vodiy.dist.id,
      status: "DELIVERED",
      total: 120 * 11_875,
      createdAt: daysAgo(30),
      items: { create: { brandProductId: bp("Sharbat, olma, 1 l"), qty: 120, price: 11_875 } },
    },
  });
  await db.brandOrder.create({
    data: {
      agreementId: agreement.id,
      brandId: bogdan.id,
      distributorId: vodiy.dist.id,
      status: "SENT",
      total: 60 * 12_350,
      note: "Seshanbagacha kerak",
      items: { create: { brandProductId: bp("Sharbat, uzum, 1 l"), qty: 60, price: 12_350 } },
    },
  });

  // Nafis Kosmetika Toza Uy'ga hamkorlik taklif qilgan: distribyutor javobini kutmoqda
  await db.agreement.create({
    data: { brandId: nafis.id, distributorId: tozaUy.dist.id, status: "PROPOSED", initiatedBy: "BRAND", districts: ["Qo'qon shahri", "Farg'ona shahri"], discountPercent: 10, terms: "Birinchi buyurtmaga qo'shimcha 3% chegirma" },
  });

  console.log("Demo ma'lumotlar yozildi.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => db.$disconnect());
