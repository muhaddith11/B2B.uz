import { describe, expect, it } from "vitest";
import { checkProductionEnv } from "./env-check";

const good = {
  SESSION_SECRET: "a".repeat(40),
  PAYMENT_KEYS_SECRET: "b".repeat(40),
  PUBLIC_URL: "https://captar.uz",
  PLATFORM_ADMIN_PHONES: "+998901234567",
  TEXTUP_EMAIL: "x@y.uz",
  TEXTUP_PASSWORD: "p",
  BLOB_READ_WRITE_TOKEN: "t",
  SENTRY_DSN: "https://k@s/1",
  ALERT_TELEGRAM_BOT_TOKEN: "b",
  ALERT_TELEGRAM_CHAT_ID: "c",
  CRON_SECRET: "c",
  SUPPORT_EMAIL: "help@captar.uz",
};

describe("production sozlamalari", () => {
  it("to'liq sozlangan muhitda xato ham, ogohlantirish ham yo'q", () => {
    expect(checkProductionEnv(good)).toEqual({ errors: [], warnings: [] });
  });

  it("xavfli sozlamalar deployni to'xtatadi; kod darajasida o'chirilganlari faqat ogohlantirish", () => {
    const { errors, warnings } = checkProductionEnv({ ...good, SESSION_SECRET: "qisqa", DEV_AUTH: "1", DEMO_OTP: "1", PUBLIC_URL: "http://localhost:3000" });
    expect(errors).toHaveLength(2);
    expect(warnings).toHaveLength(2);
  });

  it("yetishmayotgan xizmatlar ogohlantirish sifatida", () => {
    const { errors, warnings } = checkProductionEnv({ SESSION_SECRET: good.SESSION_SECRET, PUBLIC_URL: good.PUBLIC_URL });
    expect(errors).toEqual([]);
    expect(warnings.join("\n")).toMatch(/SMS xizmati/);
    expect(warnings.join("\n")).toMatch(/Blob/);
    expect(warnings.join("\n")).toMatch(/SENTRY_DSN/);
    expect(warnings.join("\n")).toMatch(/CRON_SECRET/);
  });
});
