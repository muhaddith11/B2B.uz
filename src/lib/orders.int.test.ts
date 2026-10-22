import { describe, expect, it } from "vitest";
import { db } from "./db";
import { addDays } from "./ledger";
import { cancelOrderByShop, changeOrderStatus, createOrder, createOrderForLink } from "./orders";
import { balanceOf, makeLink, makeOrder, makeProduct, makeShop, makeWorld, settle } from "@/test/factory";

const credit = { creditLimit: 1_000_000, creditDays: 14 };

describe("buyurtma yaratish", () => {
  it("narx do'konning narx guruhidan olinadi va qotib qoladi", async () => {
    const w = await makeWorld();
    const vip = await db.priceGroup.create({ data: { distributorId: w.dist.id, name: "VIP" } });
    await db.price.create({ data: { productId: w.product.id, priceGroupId: vip.id, price: 900 } });
    await db.shopLink.update({ where: { id: w.link.id }, data: { priceGroupId: vip.id } });

    const order = await createOrder({ id: w.owner.id, shopId: w.shop.id }, { distributorId: w.dist.id, paymentType: "CASH", items: [{ productId: w.product.id, qty: 10 }] });
    expect(order.status).toBe("SENT");
    expect(order.source).toBe("APP");
    expect(order.total).toBe(9_000);
    expect(order.items[0].price).toBe(900);
  });

  it("agent kiritgan buyurtma do'kon egasi tasdiqlaguncha kutadi", async () => {
    const w = await makeWorld();
    const order = await createOrderForLink(w.link, { staffId: w.agent.id }, { paymentType: "CASH", items: [{ productId: w.product.id, qty: 1 }] });
    expect(order.status).toBe("AWAITING_SHOP");
    expect(order.source).toBe("AGENT");
    expect(order.createdByStaffId).toBe(w.agent.id);
    expect(order.acceptedAt).toBeNull();
  });

  it("noto'g'ri buyurtmalarni rad etadi", async () => {
    const w = await makeWorld();
    const user = { id: w.owner.id, shopId: w.shop.id };
    const order = (productId: string, qty: number) => createOrder(user, { distributorId: w.dist.id, paymentType: "CASH", items: [{ productId, qty }] });

    const boxed = await makeProduct(w.dist.id, w.dist.defaultGroupId, { packSize: 6, minOrderPacks: 2 });
    await expect(order(boxed.id, 7)).rejects.toMatchObject({ status: 400, message: expect.stringContaining("yashik") });
    await expect(order(boxed.id, 6)).rejects.toMatchObject({ status: 400, message: expect.stringContaining("minimal") });
    await expect(order(boxed.id, 12)).resolves.toMatchObject({ total: 12_000 });

    const out = await makeProduct(w.dist.id, w.dist.defaultGroupId, { inStock: false });
    await expect(order(out.id, 1)).rejects.toMatchObject({ status: 400, message: expect.stringContaining("tugagan") });

    const inactive = await makeProduct(w.dist.id, w.dist.defaultGroupId, { active: false });
    await expect(order(inactive.id, 1)).rejects.toMatchObject({ status: 400 });

    const other = await makeWorld();
    await expect(order(other.product.id, 1)).rejects.toMatchObject({ status: 400 });
  });

  it("minimal buyurtma summasini tekshiradi", async () => {
    const w = await makeWorld();
    await db.distributor.update({ where: { id: w.dist.id }, data: { minOrder: 50_000 } });
    const link = await db.shopLink.findUniqueOrThrow({ where: { id: w.link.id }, include: { distributor: true } });
    await expect(createOrderForLink(link, { shopUserId: w.owner.id }, { paymentType: "CASH", items: [{ productId: w.product.id, qty: 10 }] })).rejects.toMatchObject({
      status: 400,
      message: expect.stringContaining("Minimal"),
    });
  });

  it("faol bo'lmagan ulanish orqali buyurtma bo'lmaydi", async () => {
    const w = await makeWorld();
    const shop = await makeShop();
    await makeLink(shop.id, w.dist.id, { status: "BLOCKED" });
    await expect(createOrder({ id: shop.owner.id, shopId: shop.id }, { distributorId: w.dist.id, paymentType: "CASH", items: [{ productId: w.product.id, qty: 1 }] })).rejects.toMatchObject({
      status: 403,
    });
  });
});

describe("nasiya", () => {
  const creditOrder = (w: Awaited<ReturnType<typeof makeWorld>>, qty: number) =>
    createOrderForLink(w.link, { shopUserId: w.owner.id }, { paymentType: "CREDIT", items: [{ productId: w.product.id, qty }] });

  it("nasiya berilmagan bo'lsa rad etadi", async () => {
    const w = await makeWorld();
    await expect(creditOrder(w, 1)).rejects.toMatchObject({ status: 400, message: expect.stringContaining("nasiya bermagan") });
  });

  it("hali topshirilmagan nasiyali buyurtmalar ham limitga kiradi", async () => {
    const w = await makeWorld(credit);
    await creditOrder(w, 700);
    await expect(creditOrder(w, 400)).rejects.toMatchObject({ status: 400, message: expect.stringMatching(/100\s000/) });
    await expect(creditOrder(w, 300)).resolves.toBeTruthy();
  });

  it("bir vaqtda kelgan ikki nasiyali buyurtma birgalikda limitdan oshmaydi", async () => {
    const w = await makeWorld(credit);
    const r = await settle([creditOrder(w, 600), creditOrder(w, 600), creditOrder(w, 600)]);
    expect(r.ok).toHaveLength(1);
    expect(r.errors.every((e) => e.status === 400)).toBe(true);
  });

  it("muddati ko'p o'tgan qarz bo'lsa nasiya yopiladi", async () => {
    const w = await makeWorld({ ...credit, blockAfterDays: 7 });
    const longAgo = addDays(new Date(), -30);
    await db.ledgerEntry.create({ data: { shopLinkId: w.link.id, type: "DEBT", amount: 10_000, date: longAgo, dueDate: addDays(longAgo, 14), createdBy: "test" } });
    await expect(creditOrder(w, 1)).rejects.toMatchObject({ status: 400, message: expect.stringContaining("kun o'tgan") });
  });
});

describe("buyurtma holati va qarz daftari", () => {
  it("naqd buyurtma topshirilganda qarz va to'lov yoziladi, qoldiq 0", async () => {
    const w = await makeWorld();
    const o = await makeOrder(w, { qty: 10 });
    await changeOrderStatus(w.operator, o.id, "ACCEPTED");
    await changeOrderStatus(w.operator, o.id, "IN_DELIVERY", { courierId: w.courier.id });
    const done = await changeOrderStatus(w.courier, o.id, "DELIVERED");

    expect(done.status).toBe("DELIVERED");
    expect(done.deliveredTotal).toBe(10_000);
    expect(done.courierId).toBe(w.courier.id);
    // Har bosqich vaqti yoziladi (ilovadagi buyurtma yo'lida ko'rinadi)
    expect(done.acceptedAt).toBeInstanceOf(Date);
    expect(done.dispatchedAt!.getTime()).toBeGreaterThanOrEqual(done.acceptedAt!.getTime());
    expect(done.deliveredAt!.getTime()).toBeGreaterThanOrEqual(done.dispatchedAt!.getTime());
    const entries = await db.ledgerEntry.findMany({ where: { orderId: o.id }, orderBy: { amount: "desc" } });
    expect(entries.map((e) => [e.type, e.amount, e.channel])).toEqual([
      ["DEBT", 10_000, null],
      ["PAYMENT", -10_000, "CASH"],
    ]);
    expect(await balanceOf(w.link.id)).toBe(0);
  });

  it("nasiyali buyurtmada qarz muddati nasiya kunlari bo'yicha", async () => {
    const w = await makeWorld(credit);
    const o = await makeOrder(w, { status: "IN_DELIVERY", paymentType: "CREDIT", qty: 5 });
    const before = Date.now();
    await changeOrderStatus(w.operator, o.id, "DELIVERED");
    const debt = await db.ledgerEntry.findFirstOrThrow({ where: { orderId: o.id } });
    expect(debt.amount).toBe(5_000);
    expect(debt.dueDate!.getTime() - before).toBeGreaterThanOrEqual(14 * 24 * 3600 * 1000 - 1000);
    expect(await balanceOf(w.link.id)).toBe(5_000);
  });

  it("qisman topshirishda qarz topshirilgan miqdor bo'yicha", async () => {
    const w = await makeWorld(credit);
    const o = await makeOrder(w, { status: "IN_DELIVERY", paymentType: "CREDIT", qty: 10 });
    const done = await changeOrderStatus(w.operator, o.id, "DELIVERED", { delivered: [{ itemId: o.items[0].id, deliveredQty: 4 }] });
    expect(done.deliveredTotal).toBe(4_000);
    expect(await balanceOf(w.link.id)).toBe(4_000);
    expect((await db.orderItem.findUniqueOrThrow({ where: { id: o.items[0].id } })).deliveredQty).toBe(4);
  });

  it("hech narsa topshirilmasa qarz yozilmaydi", async () => {
    const w = await makeWorld();
    const o = await makeOrder(w, { status: "IN_DELIVERY" });
    await changeOrderStatus(w.operator, o.id, "DELIVERED", { delivered: [{ itemId: o.items[0].id, deliveredQty: 0 }] });
    expect(await db.ledgerEntry.count({ where: { orderId: o.id } })).toBe(0);
  });

  it("ruxsat etilmagan o'tishlarni rad etadi", async () => {
    const w = await makeWorld();
    const o = await makeOrder(w);
    await expect(changeOrderStatus(w.operator, o.id, "DELIVERED")).rejects.toMatchObject({ status: 400 });
    await changeOrderStatus(w.operator, o.id, "REJECTED", { rejectReason: "Tovar yo'q" });
    await expect(changeOrderStatus(w.operator, o.id, "ACCEPTED")).rejects.toMatchObject({ status: 400 });
  });

  it("boshqa distribyutor xodimi buyurtmani ko'rmaydi", async () => {
    const w = await makeWorld();
    const other = await makeWorld();
    const o = await makeOrder(w);
    await expect(changeOrderStatus(other.admin, o.id, "ACCEPTED")).rejects.toMatchObject({ status: 404 });
  });

  it("ikki marta bir vaqtda 'topshirildi' bosilsa qarz bir marta yoziladi", async () => {
    const w = await makeWorld();
    const o = await makeOrder(w, { status: "IN_DELIVERY", courierId: w.courier.id });
    const r = await settle([changeOrderStatus(w.courier, o.id, "DELIVERED"), changeOrderStatus(w.operator, o.id, "DELIVERED"), changeOrderStatus(w.courier, o.id, "DELIVERED")]);
    expect(r.ok).toHaveLength(1);
    expect(r.errors.every((e) => e.status === 409 || e.status === 400)).toBe(true);
    expect(await db.ledgerEntry.count({ where: { orderId: o.id, type: "DEBT" } })).toBe(1);
    expect(await db.ledgerEntry.count({ where: { orderId: o.id, type: "PAYMENT" } })).toBe(1);
    expect(await balanceOf(w.link.id)).toBe(0);
  });
});

describe("do'kon bekor qilishi", () => {
  it("faqat yuborilgan buyurtmani bekor qiladi", async () => {
    const w = await makeWorld();
    const o = await makeOrder(w);
    await expect(cancelOrderByShop(w.shop.id, o.id)).resolves.toMatchObject({ status: "CANCELLED" });
    const accepted = await makeOrder(w, { status: "ACCEPTED" });
    await expect(cancelOrderByShop(w.shop.id, accepted.id)).rejects.toMatchObject({ status: 400 });
  });

  it("boshqa do'kon buyurtmasini bekor qila olmaydi", async () => {
    const w = await makeWorld();
    const other = await makeShop();
    const o = await makeOrder(w);
    await expect(cancelOrderByShop(other.id, o.id)).rejects.toMatchObject({ status: 404 });
  });

  it("bekor qilish va qabul qilish bir vaqtda kelsa, bittasi yutadi va holat unga mos", async () => {
    const w = await makeWorld();
    for (let i = 0; i < 5; i++) {
      const o = await makeOrder(w);
      const r = await settle([cancelOrderByShop(w.shop.id, o.id), changeOrderStatus(w.operator, o.id, "ACCEPTED")]);
      expect(r.ok).toHaveLength(1);
      const final = await db.order.findUniqueOrThrow({ where: { id: o.id } });
      const audit = await db.auditLog.findMany({ where: { entityId: o.id } });
      expect(audit).toHaveLength(1);
      expect(audit[0].action).toBe(`order.${final.status}`);
    }
  });
});
