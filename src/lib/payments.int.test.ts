import { describe, expect, it } from "vitest";
import { db } from "./db";
import { createOnlinePayment, recordPayment, reviewPayment, submitReceipt } from "./payments";
import { balanceOf, makeOrder, makeWorld, settle, uid } from "@/test/factory";

function receiptForm(distributorId: string, bytes: Uint8Array<ArrayBuffer>, amount = 50_000) {
  const f = new FormData();
  f.set("distributorId", distributorId);
  f.set("amount", String(amount));
  f.set("receipt", new File([bytes], "chek.png", { type: "image/png" }));
  return f;
}
const randomBytes = () => new TextEncoder().encode(`chek-${uid()}`);

describe("naqd va o'tkazma to'lov", () => {
  it("qarzni kamaytiradi", async () => {
    const w = await makeWorld();
    await db.ledgerEntry.create({ data: { shopLinkId: w.link.id, type: "DEBT", amount: 80_000, createdBy: "test" } });
    await recordPayment(w.accountant, { linkId: w.link.id, amount: 30_000, channel: "CASH" });
    expect(await balanceOf(w.link.id)).toBe(50_000);
  });

  it("bir kalit bilan takror yuborilsa bir marta yoziladi", async () => {
    const w = await makeWorld();
    const input = { linkId: w.link.id, amount: 7_000, channel: "CASH" as const, clientKey: `k-${uid()}` };
    const r = await settle([recordPayment(w.admin, input), recordPayment(w.admin, input), recordPayment(w.admin, input)]);
    expect(r.ok).toHaveLength(3);
    expect(new Set(r.ok.map((e) => e.id)).size).toBe(1);
    expect(await balanceOf(w.link.id)).toBe(-7_000);
    // Shu kalit boshqa summa bilan: xato, yangi yozuv yo'q
    await expect(recordPayment(w.admin, { ...input, amount: 8_000 })).rejects.toMatchObject({ status: 409 });
    // Kalit xodimga bog'langan: boshqa xodim shu kalit bilan alohida to'lov yozadi
    await recordPayment(w.accountant, input);
    expect(await balanceOf(w.link.id)).toBe(-14_000);
  });

  it("agent faqat o'z do'konidan, yetkazuvchi faqat o'zi yetkazgan do'kondan to'lov oladi", async () => {
    const w = await makeWorld();
    const input = { linkId: w.link.id, amount: 1_000, channel: "CASH" as const };
    await expect(recordPayment(w.agent, input)).rejects.toMatchObject({ status: 404 });
    await expect(recordPayment(w.courier, input)).rejects.toMatchObject({ status: 404 });

    await db.shopLink.update({ where: { id: w.link.id }, data: { agentId: w.agent.id } });
    await makeOrder(w, { status: "IN_DELIVERY", courierId: w.courier.id });
    await expect(recordPayment(w.agent, input)).resolves.toBeTruthy();
    await expect(recordPayment(w.courier, input)).resolves.toBeTruthy();
  });

  it("boshqa distribyutor do'koniga yozib bo'lmaydi", async () => {
    const w = await makeWorld();
    const other = await makeWorld();
    await expect(recordPayment(other.admin, { linkId: w.link.id, amount: 1_000, channel: "CASH" })).rejects.toMatchObject({ status: 404 });
  });
});

describe("chek bilan to'lov", () => {
  it("tasdiqlangunga qadar qoldiqqa kirmaydi, tasdiqlangach kiradi", async () => {
    const w = await makeWorld();
    const entry = await submitReceipt({ id: w.owner.id, shopId: w.shop.id }, receiptForm(w.dist.id, randomBytes()));
    expect(entry.status).toBe("PENDING");
    expect(await balanceOf(w.link.id)).toBe(0);
    await reviewPayment(w.accountant, entry.id, "confirm");
    expect(await balanceOf(w.link.id)).toBe(-50_000);
  });

  it("bir xil chekni ikki marta yuborib bo'lmaydi va takroriy fayl saqlanmaydi", async () => {
    const w = await makeWorld();
    const user = { id: w.owner.id, shopId: w.shop.id };
    const bytes = randomBytes();
    const r = await settle([submitReceipt(user, receiptForm(w.dist.id, bytes)), submitReceipt(user, receiptForm(w.dist.id, bytes))]);
    expect(r.ok).toHaveLength(1);
    expect(r.errors[0]).toMatchObject({ status: 400 });

    const files = await db.storedFile.count();
    await expect(submitReceipt(user, receiptForm(w.dist.id, bytes))).rejects.toMatchObject({ status: 400 });
    expect(await db.storedFile.count()).toBe(files);
  });

  it("rad etilgan chekni qayta yuborish mumkin", async () => {
    const w = await makeWorld();
    const user = { id: w.owner.id, shopId: w.shop.id };
    const bytes = randomBytes();
    const first = await submitReceipt(user, receiptForm(w.dist.id, bytes));
    await reviewPayment(w.accountant, first.id, "reject", "Summa mos emas");
    expect((await db.ledgerEntry.findUniqueOrThrow({ where: { id: first.id } })).note).toContain("Summa mos emas");
    await expect(submitReceipt(user, receiptForm(w.dist.id, bytes))).resolves.toMatchObject({ status: "PENDING" });
  });

  it("tasdiqlash va rad etish bir vaqtda kelsa, faqat bitta qaror qoladi", async () => {
    const w = await makeWorld();
    const entry = await submitReceipt({ id: w.owner.id, shopId: w.shop.id }, receiptForm(w.dist.id, randomBytes()));
    const r = await settle([reviewPayment(w.admin, entry.id, "confirm"), reviewPayment(w.accountant, entry.id, "reject", "x")]);
    expect(r.ok).toHaveLength(1);
    expect(r.errors[0]).toMatchObject({ status: 409 });
    expect(await db.auditLog.count({ where: { entityId: entry.id } })).toBe(1);
    const final = await db.ledgerEntry.findUniqueOrThrow({ where: { id: entry.id } });
    expect(final.status).toBe(r.ok[0].status);
  });

  it("boshqa distribyutor chekni ko'rib chiqa olmaydi", async () => {
    const w = await makeWorld();
    const other = await makeWorld();
    const entry = await submitReceipt({ id: w.owner.id, shopId: w.shop.id }, receiptForm(w.dist.id, randomBytes()));
    await expect(reviewPayment(other.admin, entry.id, "confirm")).rejects.toMatchObject({ status: 404 });
  });

  it("noto'g'ri fayl va summani rad etadi", async () => {
    const w = await makeWorld();
    const user = { id: w.owner.id, shopId: w.shop.id };
    const bad = receiptForm(w.dist.id, randomBytes());
    bad.set("receipt", new File([randomBytes()], "a.exe", { type: "application/x-msdownload" }));
    await expect(submitReceipt(user, bad)).rejects.toMatchObject({ status: 400 });
    await expect(submitReceipt(user, receiptForm(w.dist.id, randomBytes(), 0))).rejects.toMatchObject({ status: 400 });
  });
});

describe("onlayn to'lov havolasi", () => {
  it("kassa ulanmagan bo'lsa rad etadi, ulangan bo'lsa Payme havolasini beradi", async () => {
    const w = await makeWorld();
    const shop = { shopId: w.shop.id };
    await expect(createOnlinePayment(shop, { distributorId: w.dist.id, amount: 10_000, provider: "PAYME" })).rejects.toMatchObject({ status: 400 });

    await db.paymentMethod.create({ data: { distributorId: w.dist.id, type: "PAYME", merchantId: "merchant-1", secretKeyEnc: "x" } });
    const res = await createOnlinePayment(shop, { distributorId: w.dist.id, amount: 10_000, provider: "PAYME" });
    const params = Buffer.from(res.url.split("/").pop()!, "base64").toString();
    expect(params).toContain(`ac.order_id=${res.id}`);
    expect(params).toContain("a=1000000");
  });
});
