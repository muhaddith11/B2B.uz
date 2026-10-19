import { createHmac } from "node:crypto";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { keyedHash, signToken, verifyToken } from "./token";

const OLD = "eski-kalit-0123456789abcdef0123456789abcdef";
const NEW = "yangi-kalit-0123456789abcdef0123456789abcdef";
const exp = () => Math.floor(Date.now() / 1000) + 3600;

describe("token", () => {
  beforeEach(() => {
    vi.stubEnv("SESSION_SECRET", OLD);
    vi.stubEnv("SESSION_SECRET_PREVIOUS", "");
  });
  afterEach(() => vi.unstubAllEnvs());

  it("faqat o'z joyida (aud) qabul qilinadi: panel cookie'si ilovada, ilova tokeni panelda ishlamaydi", () => {
    const app = signToken({ kind: "staff", staffId: "s1", exp: exp() });
    const panel = signToken({ kind: "staff", staffId: "s1", exp: exp() }, "panel");
    expect(verifyToken(app, "app")).toMatchObject({ kind: "staff", aud: "app" });
    expect(verifyToken(app, "panel")).toBeNull();
    expect(verifyToken(panel, "panel")).toMatchObject({ kind: "staff", aud: "panel" });
    expect(verifyToken(panel, "app")).toBeNull();
    expect(verifyToken(signToken({ kind: "admin", phone: "+998901234567", exp: exp() }, "admin"), "obuna")).toBeNull();
  });

  it("eski (aud'siz) token ilova tokeni hisoblanadi: chiqarilgan ilovalar qayta kirishi shart emas", () => {
    const legacyData = Buffer.from(JSON.stringify({ kind: "shop", shopUserId: "u1", exp: exp(), iat: Date.now() })).toString("base64url");
    const sig = signToken({ kind: "shop", shopUserId: "x", exp: 0 }).split(".")[1];
    expect(verifyToken(`${legacyData}.${sig}`)).toBeNull(); // boshqa ma'lumotning imzosi o'tmaydi
    const legacy = `${legacyData}.${createHmac("sha256", OLD).update(legacyData).digest("base64url")}`;
    expect(verifyToken(legacy, "app")).toMatchObject({ kind: "shop", shopUserId: "u1" });
    expect(verifyToken(legacy, "panel")).toBeNull();
  });

  it("kalit almashtirilganda eski kalit bilan imzolangan token SESSION_SECRET_PREVIOUS orqali ishlayveradi", () => {
    const issued = signToken({ kind: "shop", shopUserId: "u1", exp: exp() });
    vi.stubEnv("SESSION_SECRET", NEW);
    expect(verifyToken(issued)).toBeNull();
    vi.stubEnv("SESSION_SECRET_PREVIOUS", OLD);
    expect(verifyToken(issued)).toMatchObject({ shopUserId: "u1" });
    // Yangi tokenlar yangi kalit bilan
    const fresh = signToken({ kind: "shop", shopUserId: "u2", exp: exp() });
    vi.stubEnv("SESSION_SECRET_PREVIOUS", "");
    expect(verifyToken(fresh)).toMatchObject({ shopUserId: "u2" });
  });

  it("muddati o'tgan, buzilgan yoki soxta imzoli token qabul qilinmaydi", () => {
    expect(verifyToken(signToken({ kind: "shop", shopUserId: "u1", exp: Math.floor(Date.now() / 1000) - 1 }))).toBeNull();
    const [data, sig] = signToken({ kind: "shop", shopUserId: "u1", exp: exp() }).split(".");
    const forged = Buffer.from(JSON.stringify({ ...JSON.parse(Buffer.from(data, "base64url").toString()), shopUserId: "boshqa" })).toString("base64url");
    expect(verifyToken(`${forged}.${sig}`)).toBeNull();
    expect(verifyToken("bitta-qism")).toBeNull();
    expect(verifyToken(null)).toBeNull();
  });

  it("kalitli xesh imzo kalitidan ajratilgan va barqaror", () => {
    expect(keyedHash("otp:+998901234567:123456")).toBe(keyedHash("otp:+998901234567:123456"));
    expect(keyedHash("a")).not.toBe(keyedHash("b"));
    expect(keyedHash("a")).not.toBe(createHmac("sha256", OLD).update("a").digest("hex"));
  });
});
