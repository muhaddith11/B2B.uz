// Panel va admin cookie'lari: faqat o'z joyi uchun berilgan token (aud) va panel rollari.
// Ilova tokeni (Authorization) ham faqat ilova uchun berilgan bo'lsa qabul qilinadi
import { beforeEach, describe, expect, it, vi } from "vitest";
import { makeWorld, req } from "@/test/factory";
import { signToken } from "./token";

const jar = new Map<string, string>();
vi.mock("next/headers", () => ({
  cookies: async () => ({ get: (name: string) => (jar.has(name) ? { name, value: jar.get(name)! } : undefined) }),
}));

const { ADMIN_COOKIE, getAdmin, getStaff, PANEL_COOKIE, requireStaff } = await import("./session");
const exp = () => Math.floor(Date.now() / 1000) + 3600;

describe("panel sessiyasi", () => {
  beforeEach(() => jar.clear());

  it("panel tokeni bilan admin, operator va hisobchi kiradi", async () => {
    const w = await makeWorld();
    for (const s of [w.admin, w.operator, w.accountant]) {
      jar.set(PANEL_COOKIE, signToken({ kind: "staff", staffId: s.id, exp: exp() }, "panel"));
      expect((await getStaff())?.id).toBe(s.id);
    }
  });

  it("agent yoki yetkazuvchi panelga kira olmaydi, hatto panel tokeni bo'lsa ham", async () => {
    const w = await makeWorld();
    for (const s of [w.agent, w.courier]) {
      jar.set(PANEL_COOKIE, signToken({ kind: "staff", staffId: s.id, exp: exp() }, "panel"));
      expect(await getStaff()).toBeNull();
    }
  });

  it("ilova tokeni cookie'ga qo'yilsa panel ochilmaydi; panel tokeni ilova API'sida ishlamaydi", async () => {
    const w = await makeWorld();
    jar.set(PANEL_COOKIE, w.admin.token);
    expect(await getStaff()).toBeNull();
    const panelToken = signToken({ kind: "staff", staffId: w.admin.id, exp: exp() }, "panel");
    await expect(requireStaff(req("/api/staff/me", { token: panelToken }))).rejects.toMatchObject({ status: 401 });
    await expect(requireStaff(req("/api/staff/me", { token: w.admin.token }))).resolves.toMatchObject({ id: w.admin.id });
  });

  it("admin cookie'si faqat admin uchun berilgan token bilan", async () => {
    vi.stubEnv("PLATFORM_ADMIN_PHONES", "+998901112233");
    jar.set(ADMIN_COOKIE, signToken({ kind: "admin", phone: "+998901112233", exp: exp() }, "admin"));
    expect(await getAdmin()).toEqual({ phone: "+998901112233" });
    jar.set(ADMIN_COOKIE, signToken({ kind: "admin", phone: "+998901112233", exp: exp() }));
    expect(await getAdmin()).toBeNull();
    vi.unstubAllEnvs();
  });
});
