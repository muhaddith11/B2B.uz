import { beforeEach, describe, expect, it, vi } from "vitest";

// Bazani yolg'on obyekt bilan almashtiramiz: har bir chaqiruv yoziladi
const calls: string[] = [];
let activeStaffLeft = 0;
let brandUsersLeft = 0;
let shopUsersLeft = 1;

function model(name: string, extra: Record<string, unknown> = {}) {
  const rec =
    (op: string, result: unknown = {}) =>
    async (args: unknown) => {
      calls.push(`${name}.${op} ${JSON.stringify(args)}`);
      return result;
    };
  return { updateMany: rec("updateMany"), deleteMany: rec("deleteMany"), delete: rec("delete"), update: rec("update"), create: rec("create"), ...extra };
}

const tx = {
  $executeRaw: async () => 0,
  order: model("order"),
  pushToken: model("pushToken"),
  shopUser: model("shopUser", {
    delete: async (args: unknown) => {
      calls.push(`shopUser.delete ${JSON.stringify(args)}`);
      return { id: "su1", shopId: "s1", avatarUrl: null };
    },
    count: async () => shopUsersLeft,
  }),
  shopLink: model("shopLink"),
  staff: model("staff", {
    update: async (args: unknown) => {
      calls.push(`staff.update ${JSON.stringify(args)}`);
      return { id: "st1", distributorId: "d1" };
    },
    count: async () => activeStaffLeft,
    // Oddiy xodim (admin emas): yagona admin qoidasi integratsiya testida tekshiriladi
    findUnique: async () => ({ role: "AGENT", active: true, distributorId: "d1" }),
    findUniqueOrThrow: async () => ({ avatarUrl: null, distributorId: "d1" }),
  }),
  distributor: model("distributor"),
  brandUser: model("brandUser", {
    delete: async (args: unknown) => {
      calls.push(`brandUser.delete ${JSON.stringify(args)}`);
      return { id: "bu1", brandId: "b1" };
    },
    count: async () => brandUsersLeft,
  }),
  brand: model("brand"),
  auditLog: model("auditLog"),
  otpCode: model("otpCode"),
};

vi.mock("./db", () => ({
  db: {
    $transaction: (fn: (t: typeof tx) => Promise<unknown>) => fn(tx),
    shopUser: { findMany: async () => [{ id: "su1" }] },
    staff: { findMany: async () => [{ id: "st1" }] },
    brandUser: { findMany: async () => [] },
  },
}));

const { deleteAccount, deleteAccountsForPhone } = await import("./account");

beforeEach(() => {
  calls.length = 0;
  activeStaffLeft = 0;
  brandUsersLeft = 0;
  shopUsersLeft = 1;
});

describe("hisobni o'chirish", () => {
  it("do'kon foydalanuvchisi: buyurtmalardagi havola bo'shatiladi, o'zi o'chiriladi", async () => {
    await deleteAccount({ kind: "shop", id: "su1" });
    expect(calls).toEqual([
      'order.updateMany {"where":{"createdByShopUserId":"su1"},"data":{"createdByShopUserId":null}}',
      'pushToken.deleteMany {"where":{"ownerKind":"SHOP_USER","ownerId":"su1"}}',
      'shopUser.delete {"where":{"id":"su1"}}',
      'auditLog.create {"data":{"actor":"shop:su1","action":"account.delete","entity":"shop","entityId":"su1"}}',
    ]);
  });

  it("do'konning oxirgi foydalanuvchisi: faol ulanishlar bloklanadi, javobsiz so'rov va takliflar o'chadi", async () => {
    shopUsersLeft = 0;
    await deleteAccount({ kind: "shop", id: "su1" });
    expect(calls).toContain('shopLink.deleteMany {"where":{"shopId":"s1","status":{"in":["REQUESTED","INVITED"]}}}');
    expect(calls).toContain('shopLink.updateMany {"where":{"shopId":"s1","status":"ACTIVE"},"data":{"status":"BLOCKED"}}');
  });

  it("xodim: shaxsiy ma'lumoti tozalanadi va o'chiriladi; faol xodim qolmasa distribyutor yashiriladi", async () => {
    await deleteAccount({ kind: "staff", id: "st1" });
    expect(calls[0]).toBe(`staff.update {"where":{"id":"st1"},"data":{"name":"O'chirilgan xodim","phone":"","avatarUrl":null,"active":false}}`);
    expect(calls).toContain('distributor.update {"where":{"id":"d1"},"data":{"status":"PENDING"}}');
  });

  it("xodim: boshqa faol xodim bo'lsa distribyutor ochiq qoladi", async () => {
    activeStaffLeft = 2;
    await deleteAccount({ kind: "staff", id: "st1" });
    expect(calls.some((c) => c.startsWith("distributor.update"))).toBe(false);
  });

  it("tovar egasi: oxirgi foydalanuvchi o'chsa, tovar egasi yashiriladi", async () => {
    await deleteAccount({ kind: "brand", id: "bu1" });
    expect(calls).toContain('brandUser.delete {"where":{"id":"bu1"}}');
    expect(calls).toContain('brand.update {"where":{"id":"b1"},"data":{"status":"PENDING"}}');
  });

  it("raqam bo'yicha: barcha hisoblar va SMS kodlar o'chiriladi", async () => {
    activeStaffLeft = 1;
    expect(await deleteAccountsForPhone("+998901234567")).toBe(2);
    expect(calls).toContain('shopUser.delete {"where":{"id":"su1"}}');
    expect(calls.some((c) => c.startsWith("staff.update"))).toBe(true);
    expect(calls.at(-1)).toBe('otpCode.deleteMany {"where":{"phone":"+998901234567"}}');
  });
});
