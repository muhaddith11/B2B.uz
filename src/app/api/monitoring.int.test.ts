// Monitoring yo'llari: health (uptime), mobil ilova xatolari, kutilmagan API xatosi monitoringga yoziladi
import { afterEach, describe, expect, it, vi } from "vitest";
import { errorResponse } from "@/lib/session";
import { makeWorld, req } from "@/test/factory";
import * as clientErrors from "./client-errors/route";
import * as health from "./health/route";

describe("monitoring", () => {
  afterEach(() => vi.restoreAllMocks());

  it("health: baza ishlasa 200 va versiya, maxfiy ma'lumotsiz", async () => {
    const res = await health.GET();
    expect(res.status).toBe(200);
    expect(res.headers.get("cache-control")).toBe("no-store");
    expect(await res.json()).toMatchObject({ ok: true, db: "ok" });
  });

  it("mobil xato qabul qilinadi va hisobi bilan logga yoziladi; noto'g'ri tana rad etiladi", async () => {
    const log = vi.spyOn(console, "error").mockImplementation(() => {});
    const w = await makeWorld();
    const res = await clientErrors.POST(req("/api/client-errors", { token: w.agent.token, body: { message: "TypeError: x", stack: "at Screen", screen: "/staff/shop/1", fatal: false, platform: "android" } }));
    expect(res.status).toBe(204);
    const line = JSON.parse(String(log.mock.calls.at(-1)?.[0]));
    expect(line).toMatchObject({ level: "error", area: "mobile", screen: "/staff/shop/1", account: `staff:${w.agent.id}` });
    expect((await clientErrors.POST(req("/api/client-errors", { body: { message: "x".repeat(1000) } }))).status).toBe(400);
  });

  it("bitta manzildan daqiqada 20 tadan ortiq hisobot qabul qilinmaydi", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    const headers = { "x-real-ip": `203.0.113.${Math.floor(Math.random() * 250)}` };
    const statuses = [];
    for (let i = 0; i < 22; i++) statuses.push((await clientErrors.POST(req("/api/client-errors", { headers, body: { message: `xato ${i}` } }))).status);
    expect(statuses.filter((s) => s === 204)).toHaveLength(20);
    expect(statuses.slice(-2)).toEqual([429, 429]);
  });

  it("kutilmagan API xatosi: foydalanuvchiga umumiy matn, monitoringga to'liq (yo'l bilan)", async () => {
    const log = vi.spyOn(console, "error").mockImplementation(() => {});
    const res = errorResponse(new Error("baza ulanmadi"), "ru", req("/api/shop/home"));
    expect(res.status).toBe(500);
    expect(await res.json()).toEqual({ error: "Ошибка на сервере" });
    expect(JSON.parse(String(log.mock.calls.at(-1)?.[0]))).toMatchObject({ level: "error", area: "api", msg: "baza ulanmadi", path: "/api/shop/home" });
  });
});
