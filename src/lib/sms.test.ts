import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { exposeCode, resetSmsSessions, sendSms, smsConfigured } from "./sms";

const jwt = (exp: number) => `x.${Buffer.from(JSON.stringify({ exp })).toString("base64url")}.y`;

describe("TextUP orqali SMS", () => {
  const calls: { url: string; init: RequestInit }[] = [];
  let sendStatuses: number[] = [];

  beforeEach(() => {
    calls.length = 0;
    sendStatuses = [200];
    resetSmsSessions();
    vi.stubEnv("TEXTUP_EMAIL", "test@example.com");
    vi.stubEnv("TEXTUP_PASSWORD", "parol");
    vi.stubEnv("TEXTUP_NICKNAME_ID", "");
    vi.stubGlobal("fetch", async (url: string, init: RequestInit) => {
      calls.push({ url, init });
      if (url.endsWith("/login")) {
        return Response.json({ accessToken: jwt(Math.floor(Date.now() / 1000) + 3600), user: { id: "user-1" } });
      }
      return Response.json({ smsId: "sms-1" }, { status: sendStatuses.shift() ?? 200 });
    });
  });
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
  });

  it("login qilib, OTP'ni hujjatdagi shaklda yuboradi va tokenni qayta ishlatadi", async () => {
    await sendSms("+998901234567", "Kod: 123456");
    await sendSms("+998901234568", "Kod: 654321");
    expect(calls.map((c) => c.url)).toEqual([
      "https://api-auth.textup.uz/v1/login",
      "https://sms-api.textup.uz/v1/send",
      "https://sms-api.textup.uz/v1/send",
    ]);
    expect(JSON.parse(String(calls[0].init.body))).toEqual({ email: "test@example.com", password: "parol" });
    expect(new Headers(calls[1].init.headers).get("authorization")).toMatch(/^Bearer x\./);
    expect(JSON.parse(String(calls[1].init.body))).toEqual({ message: "Kod: 123456", userId: "user-1", recipients: ["+998901234567"], name: "Kirish kodi", isOtp: true });
  });

  it("alfa-nom berilgan bo'lsa, nicknameId qo'shadi", async () => {
    vi.stubEnv("TEXTUP_NICKNAME_ID", "nick-1");
    await sendSms("+998901234567", "Kod");
    expect(JSON.parse(String(calls[1].init.body)).nicknameId).toBe("nick-1");
  });

  it("token eskirsa (401), qayta login qilib yana yuboradi", async () => {
    sendStatuses = [401, 200];
    await sendSms("+998901234567", "Kod");
    expect(calls.map((c) => c.url.split("/").pop())).toEqual(["login", "send", "login", "send"]);
  });

  it("yuborilmasa xato beradi", async () => {
    sendStatuses = [400];
    await expect(sendSms("+998901234567", "Kod")).rejects.toThrow(/TextUP SMS: 400/);
  });

  it("SMS xizmati sozlangan bo'lsa, kod hech qachon javobda qaytmaydi", () => {
    vi.stubEnv("DEMO_OTP", "1");
    expect(smsConfigured()).toBe(true);
    expect(exposeCode()).toBe(false);
  });
});
