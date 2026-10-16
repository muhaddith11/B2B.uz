import { describe, expect, it } from "vitest";
import { fetchRemoteImage, imageTypeOf, isPublicAddress } from "./remote-image";

describe("isPublicAddress", () => {
  it("ichki tarmoq, localhost va maxsus manzillarni rad etadi", () => {
    for (const ip of ["127.0.0.1", "10.1.2.3", "172.16.0.5", "192.168.1.10", "169.254.169.254", "100.64.0.1", "0.0.0.0", "::1", "fd00::1", "fe80::1", "::ffff:127.0.0.1", "nomi.uz"]) {
      expect(isPublicAddress(ip), ip).toBe(false);
    }
  });
  it("internetdagi manzilni o'tkazadi", () => {
    for (const ip of ["8.8.8.8", "93.184.215.14", "2a00:1450:4001:82a::200e", "::ffff:8.8.8.8"]) expect(isPublicAddress(ip), ip).toBe(true);
  });
});

describe("imageTypeOf", () => {
  it("turini fayl boshidagi baytlardan aniqlaydi", () => {
    expect(imageTypeOf(Buffer.from([0xff, 0xd8, 0xff, 0xe0]))).toBe("image/jpeg");
    expect(imageTypeOf(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))).toBe("image/png");
    expect(imageTypeOf(Buffer.from("RIFF\0\0\0\0WEBPVP8 ", "latin1"))).toBe("image/webp");
    expect(imageTypeOf(Buffer.from("<html><script>alert(1)</script>"))).toBeNull();
  });
});

describe("fetchRemoteImage", () => {
  it("tarmoqqa chiqmasdan xavfli havolalarni rad etadi", async () => {
    await expect(fetchRemoteImage("http://example.com/r.jpg")).rejects.toThrow("https");
    await expect(fetchRemoteImage("https://example.com:8443/r.jpg")).rejects.toThrow("443");
    await expect(fetchRemoteImage("https://user:pass@example.com/r.jpg")).rejects.toThrow("login");
    await expect(fetchRemoteImage("https://127.0.0.1/r.jpg")).rejects.toThrow("ichki");
    await expect(fetchRemoteImage("https://[::1]/r.jpg")).rejects.toThrow("ichki");
    // Nom localhost'ga ko'rsatsa ham ulanish paytida to'xtatiladi
    await expect(fetchRemoteImage("https://localhost/r.jpg")).rejects.toThrow("ichki");
  });
});
