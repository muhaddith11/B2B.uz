import { describe, expect, it } from "vitest";
import { db } from "@/lib/db";
import { trialPeriod } from "@/lib/subscription";
import { verifyToken } from "@/lib/token";
import { phone, req, tokens, uid } from "@/test/factory";
import * as otpRequest from "./otp/request/route";
import * as otpVerify from "./otp/verify/route";
import * as registerBrand from "./register-brand/route";
import * as registerDistributor from "./register-distributor/route";
import * as registerShop from "./register/route";

const shopBody = (phoneToken: string, shopName = `Do'kon ${uid()}`) => ({ phoneToken, shopName, address: "Bunyodkor ko'chasi 5", district: "Chilonzor", ownerName: "Ega" });

describe("ro'yxatdan o'tish", () => {
  it("do'kon: ikki marta bosilsa bitta do'kon, boshqa nom bilan ikkinchisi ochiladi", async () => {
    const p = phone();
    const body = shopBody(tokens.phone(p));
    const results = await Promise.all([1, 2, 3].map(() => registerShop.POST(req("/api/auth/register", { body }))));
    expect(results.map((r) => r.status)).toEqual([200, 200, 200]);
    const ids = await Promise.all(results.map(async (r) => (verifyToken(((await r.json()) as { token: string }).token) as { shopUserId: string }).shopUserId));
    expect(new Set(ids).size).toBe(1);

    await registerShop.POST(req("/api/auth/register", { body: shopBody(tokens.phone(p), `Ikkinchi ${uid()}`) }));
    expect(await db.shopUser.count({ where: { phone: p } })).toBe(2);
  });

  it("do'kon: tasdiqlanmagan raqam bilan ro'yxatdan o'tib bo'lmaydi", async () => {
    expect((await registerShop.POST(req("/api/auth/register", { body: shopBody("soxta.token") }))).status).toBe(401);
    // Boshqa turdagi token (masalan, xodim tokeni) ham o'tmaydi
    expect((await registerShop.POST(req("/api/auth/register", { body: shopBody(tokens.staff("x")) }))).status).toBe(401);
  });

  it("distribyutor: ikki marta bosilsa bitta distribyutor", async () => {
    const p = phone();
    const body = { phoneToken: tokens.phone(p), companyName: `Kompaniya ${uid()}`, districts: ["Chilonzor"], categories: ["Ichimlik"], adminName: "Admin" };
    const results = await Promise.all([1, 2].map(() => registerDistributor.POST(req("/api/auth/register-distributor", { body }))));
    expect(results.map((r) => r.status)).toEqual([200, 200]);
    expect(await db.distributor.count({ where: { name: body.companyName } })).toBe(1);
    expect(await db.staff.findFirstOrThrow({ where: { phone: p } })).toMatchObject({ role: "ADMIN" });
    expect((await db.distributor.findFirstOrThrow({ where: { name: body.companyName } })).status).toBe("PENDING");
  });

  it("tovar egasi: ikki marta bosilsa bitta brend", async () => {
    const p = phone();
    const body = { phoneToken: tokens.phone(p), brandName: `Brend ${uid()}`, categories: ["Ichimlik"], contactName: "Ega" };
    await Promise.all([1, 2].map(() => registerBrand.POST(req("/api/auth/register-brand", { body }))));
    expect(await db.brand.count({ where: { name: body.brandName } })).toBe(1);
  });
});

describe("SMS kod bilan kirish", () => {
  it("kod so'raladi, tekshiriladi va raqamdagi hisoblar qaytadi", async () => {
    const p = phone();
    await db.shop.create({ data: { name: "Mening do'konim", address: "Manzil 1", district: "Chilonzor", ...trialPeriod(), users: { create: { name: "Ega", phone: p } } } });
    const sent = await otpRequest.POST(req("/api/auth/otp/request", { body: { phone: p }, headers: { "x-real-ip": `10.${uid()}` } }));
    expect(sent.status).toBe(200);
    // Sinov rejimida SMS xizmati yo'q: kod javobda qaytadi
    const { devCode } = (await sent.json()) as { devCode: string };
    expect(devCode).toMatch(/^\d{6}$/);

    const wrongCode = devCode === "000000" ? "111111" : "000000";
    expect((await otpVerify.POST(req("/api/auth/otp/verify", { body: { phone: p, code: wrongCode } }))).status).toBe(400);

    const ok = await otpVerify.POST(req("/api/auth/otp/verify", { body: { phone: p, code: devCode } }));
    expect(ok.status).toBe(200);
    const body = (await ok.json()) as { accounts: { kind: string; title: string; token: string }[]; phoneToken: string };
    expect(body.accounts).toHaveLength(1);
    expect(body.accounts[0]).toMatchObject({ kind: "shop", title: "Mening do'konim" });
    expect(verifyToken(body.accounts[0].token)).toMatchObject({ kind: "shop" });
    expect(verifyToken(body.phoneToken)).toMatchObject({ kind: "phone", phone: p });

    // Kod ikkinchi marta ishlamaydi
    expect((await otpVerify.POST(req("/api/auth/otp/verify", { body: { phone: p, code: devCode } }))).status).toBe(400);
  });

  it("IP manzil yoziladi va bitta IP'dan cheklanadi", async () => {
    const ip = `10.${uid()}`;
    const res = await otpRequest.POST(req("/api/auth/otp/request", { body: { phone: phone() }, headers: { "x-forwarded-for": `${ip}, 1.1.1.1` } }));
    expect(res.status).toBe(200);
    expect(await db.otpCode.count({ where: { ip } })).toBe(1);
  });

  it("noto'g'ri raqamni rad etadi", async () => {
    expect((await otpRequest.POST(req("/api/auth/otp/request", { body: { phone: "+7 900 000 00 00" } }))).status).toBe(400);
  });
});
