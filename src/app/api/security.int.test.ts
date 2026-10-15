// Xavfsizlik tuzatishlari: do'konni faqat roziligi bilan ulash, tasdiqlanmagan distribyutor, chiqish va sessiyalar,
// buyurtma summasi chegarasi, rasm keshi va eski rasmlarni tozalash
import { randomBytes } from "node:crypto";
import { describe, expect, it } from "vitest";
import { db } from "@/lib/db";
import { MAX_LINE_QTY } from "@/lib/money";
import { applyPriceList } from "@/lib/price-list-apply";
import { signToken } from "@/lib/token";
import { ctx, makeDistributor, makeLink, makeOrder, makeProduct, makeShop, makeStaff, makeWorld, phone, req, tokens, uid } from "@/test/factory";
import * as logout from "./auth/logout/route";
import * as brandProductImage from "./brand/products/[id]/image/route";
import * as file from "./files/[folder]/[name]/route";
import * as avatar from "./me/avatar/route";
import * as pushRegister from "./push/register/route";
import * as shopDistributors from "./shop/distributors/route";
import * as shopHome from "./shop/home/route";
import * as shopInvite from "./shop/invites/[linkId]/route";
import * as shopOrders from "./shop/orders/route";
import * as staffOrder from "./staff/orders/[id]/route";
import * as staffOrders from "./staff/orders/route";
import * as staffProductImage from "./staff/products/[id]/image/route";
import * as staffRequests from "./staff/requests/route";
import * as staffShop from "./staff/shops/[linkId]/route";
import * as staffShops from "./staff/shops/route";

const shopBody = (p: string) => ({ shopName: "Kiritilgan nom", address: "Bunyodkor ko'chasi 1", district: "Chilonzor", ownerName: "Ega", phone: p });

function upload(token: string) {
  const form = new FormData();
  form.set("image", new File([randomBytes(64)], "rasm.jpg", { type: "image/jpeg" }));
  return new Request("http://test.local/x", { method: "POST", headers: { authorization: `Bearer ${token}` }, body: form });
}
const removeReq = (token: string) => new Request("http://test.local/x", { method: "DELETE", headers: { authorization: `Bearer ${token}` } });
const stored = (url: string) => db.storedFile.count({ where: { path: url.replace("/api/files/", "") } });

describe("do'konni ulash: faqat egasining roziligi bilan", () => {
  it("tasdiqlanmagan distribyutor do'kon qo'sha olmaydi, buyurtma ololmaydi va qabul qilolmaydi", async () => {
    const dist = await makeDistributor({ status: "PENDING" });
    const admin = await makeStaff(dist.id, "ADMIN");
    const shop = await makeShop();
    expect((await staffShops.POST(req("/api/staff/shops", { token: admin.token, body: shopBody(shop.owner.phone) }))).status).toBe(403);
    expect((await staffShops.POST(req("/api/staff/shops", { token: admin.token, body: shopBody(phone()) }))).status).toBe(403);
    expect(await db.shopLink.count({ where: { distributorId: dist.id } })).toBe(0);

    // Tasdig'i olib qo'yilgan distribyutorning eski ulanishi: savdo to'xtaydi
    const link = await makeLink(shop.id, dist.id);
    const product = await makeProduct(dist.id, dist.defaultGroupId);
    const items = [{ productId: product.id, qty: 1 }];
    expect((await staffOrders.POST(req("/api/staff/orders", { token: admin.token, body: { linkId: link.id, paymentType: "CASH", items } }))).status).toBe(403);
    expect((await shopOrders.POST(req("/api/shop/orders", { token: shop.owner.token, body: { distributorId: dist.id, paymentType: "CASH", items } }))).status).toBe(403);
    const o = await makeOrder({ link, product });
    expect((await staffOrder.POST(req(`/api/staff/orders/${o.id}`, { token: admin.token, body: { to: "ACCEPTED" } }), ctx({ id: o.id }))).status).toBe(403);
    expect((await db.order.findUniqueOrThrow({ where: { id: o.id } })).status).toBe("SENT");
  });

  it("tizimdagi do'kon taklif bo'ladi: egasi tasdiqlamaguncha xodim do'konni ko'rmaydi, buyurtma va qarz yozolmaydi", async () => {
    const w = await makeWorld();
    const other = await makeShop();
    const res = await staffShops.POST(req("/api/staff/shops", { token: w.agent.token, body: shopBody(other.owner.phone) }));
    expect(res.status).toBe(200);
    const { linkId, invited } = (await res.json()) as { linkId: string; invited: boolean };
    expect(invited).toBe(true);
    expect((await db.shopLink.findUniqueOrThrow({ where: { id: linkId } })).status).toBe("INVITED");
    // Kiritilgan nom do'konning haqiqiy nomini o'zgartirmaydi
    expect((await db.shop.findUniqueOrThrow({ where: { id: other.id } })).name).toBe(other.name);

    expect((await staffShop.GET(req(`/api/staff/shops/${linkId}`, { token: w.admin.token }), ctx({ linkId }))).status).toBe(404);
    const items = [{ productId: w.product.id, qty: 1 }];
    expect((await staffOrders.POST(req("/api/staff/orders", { token: w.agent.token, body: { linkId, paymentType: "CREDIT", items } }))).status).toBe(404);
    const patch = new Request(`http://test.local/api/staff/shops/${linkId}`, {
      method: "PATCH",
      headers: { authorization: `Bearer ${w.admin.token}`, "content-type": "application/json" },
      body: JSON.stringify({ status: "ACTIVE" }),
    });
    expect((await staffShop.PATCH(patch, ctx({ linkId }))).status).toBe(400);
    // Takroriy taklif yo'q
    expect((await staffShops.POST(req("/api/staff/shops", { token: w.operator.token, body: shopBody(other.owner.phone) }))).status).toBe(400);

    // Admin javob kutilayotgan taklifni ko'radi: faqat o'zi kiritgan raqam, do'kon nomi emas
    const reqs = (await (await staffRequests.GET(req("/api/staff/requests", { token: w.admin.token }))).json()) as { invited: { linkId: string; phone: string }[] };
    expect(reqs.invited).toContainEqual(expect.objectContaining({ linkId, phone: other.owner.phone }));
    expect(JSON.stringify(reqs.invited)).not.toContain(other.name);

    // Do'kon taklifni ko'radi; sotuvchi javob bera olmaydi, egasi qabul qiladi
    const home = (await (await shopHome.GET(req("/api/shop/home", { token: other.owner.token }))).json()) as { invites: { linkId: string; name: string }[] };
    expect(home.invites).toEqual([expect.objectContaining({ linkId, name: w.dist.name })]);
    const seller = await db.shopUser.create({ data: { shopId: other.id, name: "Sotuvchi", phone: phone(), role: "SELLER" } });
    const answer = (token: string, action: string) => shopInvite.POST(req(`/api/shop/invites/${linkId}`, { token, body: { action } }), ctx({ linkId }));
    expect((await answer(tokens.shop(seller.id), "accept")).status).toBe(403);
    // Begona do'kon egasi boshqa do'konning taklifiga javob bera olmaydi
    expect((await answer(w.owner.token, "accept")).status).toBe(404);
    expect((await answer(other.owner.token, "accept")).status).toBe(200);
    expect((await answer(other.owner.token, "accept")).status).toBe(404);

    expect((await db.shopLink.findUniqueOrThrow({ where: { id: linkId } })).status).toBe("ACTIVE");
    expect((await staffShop.GET(req(`/api/staff/shops/${linkId}`, { token: w.admin.token }), ctx({ linkId }))).status).toBe(200);
    expect((await staffOrders.POST(req("/api/staff/orders", { token: w.agent.token, body: { linkId, paymentType: "CASH", items } }))).status).toBe(200);
  });

  it("rad etilgan taklif o'chadi; do'konning o'zi ulanishni so'rasa taklif qabul bo'ladi", async () => {
    const w = await makeWorld();
    const other = await makeShop();
    const invite = async () => ((await (await staffShops.POST(req("/api/staff/shops", { token: w.agent.token, body: shopBody(other.owner.phone) }))).json()) as { linkId: string }).linkId;

    const first = await invite();
    expect((await shopInvite.POST(req(`/api/shop/invites/${first}`, { token: other.owner.token, body: { action: "reject" } }), ctx({ linkId: first }))).status).toBe(200);
    expect(await db.shopLink.count({ where: { id: first } })).toBe(0);

    const second = await invite();
    const r = await shopDistributors.POST(req("/api/shop/distributors", { token: other.owner.token, body: { distributorId: w.dist.id } }));
    expect(r.status).toBe(200);
    expect(((await r.json()) as { status: string }).status).toBe("ACTIVE");
    expect((await db.shopLink.findUniqueOrThrow({ where: { id: second } })).status).toBe("ACTIVE");
  });

  it("yangi raqam: do'kon yaratiladi va darhol ulanadi (agent do'konning o'zida)", async () => {
    const w = await makeWorld();
    const res = await staffShops.POST(req("/api/staff/shops", { token: w.agent.token, body: shopBody(phone()) }));
    const { linkId, invited } = (await res.json()) as { linkId: string; invited: boolean };
    expect(invited).toBe(false);
    expect((await db.shopLink.findUniqueOrThrow({ where: { id: linkId } })).status).toBe("ACTIVE");
  });
});

describe("chiqish va sessiyalar", () => {
  const pushToken = () => `ExponentPushToken[${uid()}]`;
  const register = (token: string, device: string) => pushRegister.POST(req("/api/push/register", { token, body: { token: device } }));

  it("chiqishda shu telefonning push tokeni o'chadi; boshqa hisobning tokeniga tegib bo'lmaydi", async () => {
    const w = await makeWorld();
    const [phoneA, phoneB] = [pushToken(), pushToken()];
    expect((await register(w.owner.token, phoneA)).status).toBe(200);
    expect((await register(w.owner.token, phoneB)).status).toBe(200);

    expect((await logout.POST(req("/api/auth/logout", { token: w.owner.token, body: { pushToken: phoneA } }))).status).toBe(200);
    expect((await db.pushToken.findMany({ where: { ownerId: w.owner.id } })).map((t) => t.token)).toEqual([phoneB]);
    // Agent do'kon egasining telefon tokenini o'chira olmaydi
    await logout.POST(req("/api/auth/logout", { token: w.agent.token, body: { pushToken: phoneB } }));
    expect(await db.pushToken.count({ where: { token: phoneB } })).toBe(1);
    // Oddiy chiqish boshqa qurilmadagi sessiyani yopmaydi
    expect((await shopHome.GET(req("/api/shop/home", { token: w.owner.token }))).status).toBe(200);
  });

  it("barcha qurilmalardan chiqish: avval berilgan (eski ilovadagi ham) tokenlar ishlamaydi, yangi kirish ishlaydi", async () => {
    const w = await makeWorld();
    const legacy = signToken({ kind: "shop", shopUserId: w.owner.id, exp: Math.floor(Date.now() / 1000) + 3600, iat: 0 });
    const home = (token: string) => shopHome.GET(req("/api/shop/home", { token }));
    expect((await home(legacy)).status).toBe(200);
    await register(w.owner.token, pushToken());

    expect((await logout.POST(req("/api/auth/logout", { token: w.owner.token, body: { everywhere: true } }))).status).toBe(200);
    expect((await home(w.owner.token)).status).toBe(401);
    expect((await home(legacy)).status).toBe(401);
    expect(await db.pushToken.count({ where: { ownerId: w.owner.id } })).toBe(0);
    expect((await home(tokens.shop(w.owner.id))).status).toBe(200);

    // Xodim ham: eski token bilan buyurtmalar ham, rasmlar ham ochilmaydi
    await logout.POST(req("/api/auth/logout", { token: w.admin.token, body: { everywhere: true } }));
    expect((await staffOrders.GET(req("/api/staff/orders", { token: w.admin.token }))).status).toBe(401);
    expect((await avatar.POST(upload(w.admin.token))).status).toBe(401);
  });
});

describe("buyurtma summasi chegarasi", () => {
  it("bazaga sig'maydigan summa yoki miqdor server xatosi emas, tushunarli rad javobi", async () => {
    const w = await makeWorld();
    const pricey = await makeProduct(w.dist.id, w.dist.defaultGroupId, { price: 5_000 });
    const order = (qty: number) => staffOrders.POST(req("/api/staff/orders", { token: w.operator.token, body: { linkId: w.link.id, paymentType: "CASH", items: [{ productId: pricey.id, qty }] } }));
    const before = await db.order.count({ where: { shopLinkId: w.link.id } });

    expect((await order(MAX_LINE_QTY + 1)).status).toBe(400);
    const tooBig = await order(600_000); // 3 mlrd so'm
    expect(tooBig.status).toBe(400);
    expect(((await tooBig.json()) as { error: string }).error).toMatch(/oshmasin/);
    expect(await db.order.count({ where: { shopLinkId: w.link.id } })).toBe(before);
    expect((await order(100)).status).toBe(200);
  });
});

describe("rasmlar: kesh va eski fayllarni tozalash", () => {
  async function shown(url: string) {
    const [, , , folder, name] = url.split("/");
    return file.GET(new Request(`http://test.local${url}`), ctx({ folder, name }));
  }

  it("almashtirilgan avatar ombordan o'chadi; ochiq rasm CDN'da keshlanadi", async () => {
    const w = await makeWorld();
    const first = ((await (await avatar.POST(upload(w.owner.token))).json()) as { avatarUrl: string }).avatarUrl;
    const res = await shown(first);
    expect(res.status).toBe(200);
    expect(res.headers.get("cache-control")).toContain("s-maxage=");
    const second = ((await (await avatar.POST(upload(w.owner.token))).json()) as { avatarUrl: string }).avatarUrl;
    expect(await stored(first)).toBe(0);
    expect(await stored(second)).toBe(1);
  });

  it("bir nechta joyda ishlatilgan rasm oxirgisi olib tashlanmaguncha qoladi", async () => {
    const w = await makeWorld();
    const brand = await db.brand.create({ data: { name: `Brend ${uid()}`, categories: ["Sharbat"], status: "ACTIVE", users: { create: { name: "Ega", phone: phone() } } }, include: { users: true } });
    const bp = await db.brandProduct.create({ data: { brandId: brand.id, name: "Sharbat", category: "Sharbat", price: 1000 } });
    const brandToken = tokens.brand(brand.users[0].id);
    const url = ((await (await brandProductImage.POST(upload(brandToken), ctx({ id: bp.id }))).json()) as { imageUrl: string }).imageUrl;
    // Distribyutor katalogiga kelishuv orqali o'tgan tovar o'sha rasmni ishlatadi
    await db.product.update({ where: { id: w.product.id }, data: { imageUrl: url } });

    await brandProductImage.POST(upload(brandToken), ctx({ id: bp.id }));
    expect(await stored(url)).toBe(1);
    expect((await shown(url)).status).toBe(200);
    expect((await staffProductImage.DELETE(removeReq(w.operator.token), ctx({ id: w.product.id }))).status).toBe(200);
    expect(await stored(url)).toBe(0);
  });

  it("prays-list: rasm havolasi bo'sh bo'lsa tovar rasmi saqlanadi, havola berilsa almashadi", async () => {
    const w = await makeWorld();
    const url = ((await (await staffProductImage.POST(upload(w.operator.token), ctx({ id: w.product.id }))).json()) as { imageUrl: string }).imageUrl;
    const row = { sku: w.product.sku, name: w.product.name, brand: "Brend", category: "Ichimlik", unit: "dona", packSize: 1, price: 1200, barcode: null, minOrderPacks: 1, inStock: true, extraPrices: {} };

    await applyPriceList(w.admin, [{ ...row, imageUrl: null }]);
    expect((await db.product.findUniqueOrThrow({ where: { id: w.product.id } })).imageUrl).toBe(url);

    await applyPriceList(w.admin, [{ ...row, imageUrl: "https://example.com/rasm.jpg" }]);
    expect((await db.product.findUniqueOrThrow({ where: { id: w.product.id } })).imageUrl).toBe("https://example.com/rasm.jpg");
    expect(await stored(url)).toBe(0);
  });
});
