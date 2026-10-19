// Blob ombori keyin ulansa: undan oldin bazaga yozilgan fayllar ko'rinaveradi va o'chirilganda bazadan ham ketadi
import { afterEach, describe, expect, it, vi } from "vitest";
import { db } from "./db";
import { fileBytes } from "@/test/factory";

const blob = vi.hoisted(() => ({ store: new Map<string, Buffer>() }));
vi.mock("@vercel/blob", () => ({
  put: async (key: string, data: Buffer) => void blob.store.set(key, data),
  get: async (key: string) => (blob.store.has(key) ? { statusCode: 200, stream: new Blob([new Uint8Array(blob.store.get(key)!)]).stream(), blob: { contentType: "image/png" } } : null),
  del: async (key: string) => void blob.store.delete(key),
}));

const { prepareUpload, readUpload, releaseImage, storeUpload } = await import("./uploads");
const file = (type = "image/png") => new File([fileBytes(type)], "rasm", { type });

describe("fayl ombori", () => {
  afterEach(() => vi.unstubAllEnvs());

  it("Blob ulangandan keyin eski (bazadagi) fayl o'qiladi, yangisi Blob'ga yoziladi", async () => {
    const old = await storeUpload("products", await prepareUpload(file()));
    vi.stubEnv("BLOB_READ_WRITE_TOKEN", "test");
    const [, , , folder, name] = old.url.split("/");
    expect((await readUpload(folder, name))?.type).toBe("image/png");

    const fresh = await storeUpload("products", await prepareUpload(file()));
    expect(blob.store.has(fresh.url.replace("/api/files/", ""))).toBe(true);
    expect(await db.storedFile.count({ where: { path: fresh.url.replace("/api/files/", "") } })).toBe(0);
  });

  it("biriktirilmagan eski rasm o'chirilganda bazadan ham ketadi", async () => {
    const old = await storeUpload("products", await prepareUpload(file()));
    vi.stubEnv("BLOB_READ_WRITE_TOKEN", "test");
    await releaseImage(old.url);
    expect(await db.storedFile.count({ where: { path: old.url.replace("/api/files/", "") } })).toBe(0);
  });

  it("turi baytlardan: e'lon qilingan turga qaramay haqiqiy turi saqlanadi", async () => {
    const saved = await storeUpload("receipts", await prepareUpload(new File([fileBytes("application/pdf")], "chek.jpg", { type: "image/jpeg" })));
    expect(saved.url).toMatch(/\.pdf$/);
    await expect(prepareUpload(new File([new TextEncoder().encode("<svg/>")], "a.png", { type: "image/png" }))).rejects.toMatchObject({ status: 400 });
  });
});
