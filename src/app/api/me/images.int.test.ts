// Rasmlar: o'z avatari, do'kon surati, distribyutor va tovar egasi logosi. Biriktirilgan rasm hammaga ochiq, olib tashlansa yopiladi
import { randomBytes } from "node:crypto";
import { describe, expect, it } from "vitest";
import { db } from "@/lib/db";
import { ctx, makeWorld, phone, tokens, uid } from "@/test/factory";
import * as brandLogo from "../brand/logo/route";
import * as file from "../files/[folder]/[name]/route";
import * as shopImage from "../shop/image/route";
import * as staffLogo from "../staff/logo/route";
import * as staffShopImage from "../staff/shops/[linkId]/image/route";
import * as avatar from "./avatar/route";

function upload(token: string, type = "image/jpeg") {
  const form = new FormData();
  form.set("image", new File([randomBytes(64)], "rasm.jpg", { type }));
  return new Request("http://test.local/x", { method: "POST", headers: { authorization: `Bearer ${token}` }, body: form });
}
const remove = (token: string) => new Request("http://test.local/x", { method: "DELETE", headers: { authorization: `Bearer ${token}` } });

async function shown(url: string) {
  const [, , , folder, name] = url.split("/");
  return (await file.GET(new Request(`http://test.local${url}`), ctx({ folder, name }))).status;
}

async function makeBrandUser() {
  const brand = await db.brand.create({ data: { name: `Brend ${uid()}`, categories: ["Sharbat"], status: "ACTIVE", users: { create: { name: "Ega", phone: phone() } } }, include: { users: true } });
  return { brand, token: tokens.brand(brand.users[0].id) };
}

describe("rasmlar", () => {
  it("har kim o'z avatarini qo'yadi va olib tashlaydi", async () => {
    const w = await makeWorld();
    const b = await makeBrandUser();
    for (const token of [w.owner.token, w.agent.token, b.token]) {
      const res = await avatar.POST(upload(token));
      expect(res.status).toBe(200);
      const { avatarUrl } = (await res.json()) as { avatarUrl: string };
      expect(avatarUrl).toMatch(/^\/api\/files\/avatars\/[a-f0-9]{32}\.jpg$/);
      expect(await shown(avatarUrl)).toBe(200);
      expect((await avatar.DELETE(remove(token))).status).toBe(200);
      expect(await shown(avatarUrl)).toBe(404);
    }
    expect((await db.staff.findUniqueOrThrow({ where: { id: w.agent.id } })).avatarUrl).toBeNull();
  });

  it("kirmagan yoki o'chirilgan xodim avatar qo'ya olmaydi, faqat rasm", async () => {
    const w = await makeWorld();
    expect((await avatar.POST(new Request("http://test.local/x", { method: "POST", body: new FormData() }))).status).toBe(401);
    await db.staff.update({ where: { id: w.courier.id }, data: { active: false } });
    expect((await avatar.POST(upload(w.courier.token))).status).toBe(401);
    expect((await avatar.POST(upload(w.owner.token, "application/pdf"))).status).toBe(400);
  });

  it("do'kon suratini faqat egasi o'zgartiradi", async () => {
    const w = await makeWorld();
    const seller = await db.shopUser.create({ data: { shopId: w.shop.id, name: "Sotuvchi", phone: phone(), role: "SELLER" } });
    expect((await shopImage.POST(upload(tokens.shop(seller.id)))).status).toBe(403);
    const res = await shopImage.POST(upload(w.owner.token));
    expect(res.status).toBe(200);
    const { imageUrl } = (await res.json()) as { imageUrl: string };
    expect(imageUrl).toMatch(/^\/api\/files\/logos\//);
    expect(await shown(imageUrl)).toBe(200);
    expect((await shopImage.DELETE(remove(w.owner.token))).status).toBe(200);
    expect(await shown(imageUrl)).toBe(404);
  });

  it("xodim do'kon suratini faqat surat yo'q bo'lsa va o'z do'koniga qo'yadi", async () => {
    const w = await makeWorld();
    // Agent faqat o'ziga biriktirilgan do'konni ko'radi
    expect((await staffShopImage.POST(upload(w.agent.token), ctx({ linkId: w.link.id }))).status).toBe(404);
    expect((await staffShopImage.POST(upload(w.courier.token), ctx({ linkId: w.link.id }))).status).toBe(403);
    await db.shopLink.update({ where: { id: w.link.id }, data: { agentId: w.agent.id } });
    const res = await staffShopImage.POST(upload(w.agent.token), ctx({ linkId: w.link.id }));
    expect(res.status).toBe(200);
    const { imageUrl } = (await res.json()) as { imageUrl: string };
    expect((await db.shop.findUniqueOrThrow({ where: { id: w.shop.id } })).imageUrl).toBe(imageUrl);
    // Surat bor: almashtirish faqat egasining ishi
    expect((await staffShopImage.POST(upload(w.admin.token), ctx({ linkId: w.link.id }))).status).toBe(409);
    expect((await db.shop.findUniqueOrThrow({ where: { id: w.shop.id } })).imageUrl).toBe(imageUrl);
  });

  it("distribyutor logosini faqat admin, brend logosini tovar egasi qo'yadi", async () => {
    const w = await makeWorld();
    expect((await staffLogo.POST(upload(w.operator.token))).status).toBe(403);
    const res = await staffLogo.POST(upload(w.admin.token));
    expect(res.status).toBe(200);
    const { logoUrl } = (await res.json()) as { logoUrl: string };
    expect((await db.distributor.findUniqueOrThrow({ where: { id: w.dist.id } })).logoUrl).toBe(logoUrl);
    expect(await shown(logoUrl)).toBe(200);

    const b = await makeBrandUser();
    const br = await brandLogo.POST(upload(b.token));
    expect(br.status).toBe(200);
    const brandUrl = ((await br.json()) as { logoUrl: string }).logoUrl;
    expect((await db.brand.findUniqueOrThrow({ where: { id: b.brand.id } })).logoUrl).toBe(brandUrl);
    expect((await brandLogo.DELETE(remove(b.token))).status).toBe(200);
    expect(await shown(brandUrl)).toBe(404);
  });

  it("biriktirilmagan fayl berilmaydi", async () => {
    expect(await shown(`/api/files/logos/${randomBytes(16).toString("hex")}.jpg`)).toBe(404);
    expect(await shown(`/api/files/avatars/${randomBytes(16).toString("hex")}.jpg`)).toBe(404);
  });
});
