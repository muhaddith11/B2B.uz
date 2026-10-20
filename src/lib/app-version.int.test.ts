import { describe, expect, it } from "vitest";
import { db } from "./db";
import { DEFAULT_MIN_VERSION, minAppVersion, setMinAppVersion, STORE_URLS } from "./app-version";
import * as versionRoute from "@/app/api/app/version/route";

describe("majburiy yangilash: eng kichik versiya", () => {
  it("admin belgilaydi, ilova kirishsiz o'qiydi; noto'g'ri versiya saqlanmaydi", async () => {
    const before = await minAppVersion();
    try {
      await setMinAppVersion("1.1.0", "test");
      const res = await versionRoute.GET();
      expect(res.status).toBe(200);
      expect(await res.json()).toEqual({ minVersion: "1.1.0", storeUrl: STORE_URLS });
      // CDN'da qisqa muddat saqlanadi: har ochilishda bazaga bormasin
      expect(res.headers.get("cache-control")).toContain("s-maxage=");

      for (const bad of ["1.1", "v1.1.0", "1.1.0-beta", ""]) {
        await expect(setMinAppVersion(bad, "test")).rejects.toMatchObject({ status: 400 });
      }
      expect(await minAppVersion()).toBe("1.1.0");
      expect(await db.auditLog.findFirst({ where: { action: "app.minVersion" }, orderBy: { createdAt: "desc" } })).toMatchObject({ after: { version: "1.1.0" } });
    } finally {
      await setMinAppVersion(before, "test");
    }
  });

  it("bazada yaroqsiz qiymat bo'lsa hech kim to'xtatilmaydi", async () => {
    const before = await minAppVersion();
    try {
      await db.platformSetting.upsert({ where: { key: "app.minVersion" }, create: { key: "app.minVersion", value: "buzuq" }, update: { value: "buzuq" } });
      expect(await minAppVersion()).toBe(DEFAULT_MIN_VERSION);
    } finally {
      await setMinAppVersion(before, "test");
    }
  });
});
