import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { captureError, parseDsn, parseStack, scrub, sentryEnvelope, shouldAlert } from "./monitoring";

describe("monitoring", () => {
  const calls: { url: string; init: RequestInit }[] = [];
  beforeEach(() => {
    calls.length = 0;
    vi.stubGlobal("fetch", async (url: string, init: RequestInit) => {
      calls.push({ url, init });
      return new Response("{}");
    });
    vi.spyOn(console, "error").mockImplementation(() => {});
    vi.spyOn(console, "warn").mockImplementation(() => {});
  });
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.unstubAllEnvs();
    vi.restoreAllMocks();
  });

  it("maxfiy maydonlar va telefon raqamlari logga chiqmaydi", () => {
    expect(scrub({ area: "api", token: "abc", nested: { secretKey: "x", note: "Bearer eyJ.abc" }, phone: "+998901234567" })).toEqual({
      area: "api",
      token: "[yashirin]",
      nested: { secretKey: "[yashirin]", note: "Bearer [yashirin]" },
      phone: "+99890*******",
    });
  });

  it("DSN dan envelope manzili va sarlavhasi", () => {
    expect(parseDsn("https://abc123@o42.ingest.sentry.io/777")).toEqual({
      url: "https://o42.ingest.sentry.io/api/777/envelope/",
      auth: "Sentry sentry_version=7, sentry_key=abc123, sentry_client=captar/1.0",
      dsn: "https://abc123@o42.ingest.sentry.io/777",
    });
    expect(parseDsn("noto'g'ri")).toBeNull();
    expect(parseDsn("https://o42.ingest.sentry.io/777")).toBeNull();
    expect(parseDsn(undefined)).toBeNull();
  });

  it("stack kadrlari eskisidan yangisiga", () => {
    const frames = parseStack("Error: x\n    at inner (/app/src/lib/a.ts:10:5)\n    at outer (/app/node_modules/b/index.js:3:1)");
    expect(frames).toEqual([
      { function: "outer", filename: "/app/node_modules/b/index.js", lineno: 3, colno: 1, in_app: false },
      { function: "inner", filename: "/app/src/lib/a.ts", lineno: 10, colno: 5, in_app: true },
    ]);
  });

  it("envelope uch qatordan: sarlavha, tur, hodisa", () => {
    const target = parseDsn("https://k@sentry.example/1")!;
    const [head, type, event] = sentryEnvelope(target, new Error("buzildi"), "fatal", { area: "payme", rpcId: 5 }, new Date("2026-10-18T00:00:00Z"))
      .split("\n")
      .map((l) => JSON.parse(l));
    expect(head).toMatchObject({ sent_at: "2026-10-18T00:00:00.000Z", dsn: "https://k@sentry.example/1" });
    expect(head.event_id).toMatch(/^[0-9a-f]{32}$/);
    expect(type).toEqual({ type: "event" });
    expect(event).toMatchObject({ level: "fatal", tags: { area: "payme" }, extra: { rpcId: 5 }, exception: { values: [{ type: "Error", value: "buzildi" }] } });
  });

  it("Sentry va Telegram sozlanganda fatal xato ikkalasiga, oddiy xato faqat Sentry'ga boradi", async () => {
    vi.stubEnv("SENTRY_DSN", "https://k@sentry.example/1");
    vi.stubEnv("ALERT_TELEGRAM_BOT_TOKEN", "bot-token");
    vi.stubEnv("ALERT_TELEGRAM_CHAT_ID", "-100");
    await captureError(new Error(`to'lov yiqildi ${Math.random()}`), { area: "payme" }, "fatal");
    expect(calls.map((c) => new URL(c.url).host).sort()).toEqual(["api.telegram.org", "sentry.example"]);
    calls.length = 0;
    await captureError(new Error("oddiy"), { area: "api" });
    expect(calls.map((c) => new URL(c.url).host)).toEqual(["sentry.example"]);
  });

  it("sozlanmagan bo'lsa tashqariga hech narsa ketmaydi, lekin log yoziladi", async () => {
    vi.stubEnv("SENTRY_DSN", "");
    await captureError(new Error("x"), { area: "api" });
    expect(calls).toHaveLength(0);
    expect(console.error).toHaveBeenCalledWith(expect.stringContaining('"area":"api"'));
  });

  it("kuzatuv xizmati ishlamasa xato tashlanmaydi", async () => {
    vi.stubEnv("SENTRY_DSN", "https://k@sentry.example/1");
    vi.stubGlobal("fetch", async () => {
      throw new Error("tarmoq yo'q");
    });
    await expect(captureError(new Error("x"), { area: "api" })).resolves.toBeUndefined();
  });

  it("bir xil ogohlantirish 10 daqiqada bir marta", () => {
    const key = `test:${Math.random()}`;
    expect(shouldAlert(key, 0)).toBe(true);
    expect(shouldAlert(key, 5 * 60_000)).toBe(false);
    expect(shouldAlert(key, 11 * 60_000)).toBe(true);
  });
});
