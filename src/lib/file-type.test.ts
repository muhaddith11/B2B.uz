import { describe, expect, it } from "vitest";
import { sniffType } from "./file-type";

const bytes = (...parts: (number[] | string)[]) => new Uint8Array(Buffer.concat(parts.map((p) => (typeof p === "string" ? Buffer.from(p) : Buffer.from(p)))));

describe("fayl turi baytlardan", () => {
  it("rasm va PDF turlarini taniydi", () => {
    expect(sniffType(bytes([0xff, 0xd8, 0xff, 0xe0], "...."))).toBe("image/jpeg");
    expect(sniffType(bytes([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a], "...."))).toBe("image/png");
    expect(sniffType(bytes("RIFF", [1, 2, 3, 4], "WEBPVP8 "))).toBe("image/webp");
    expect(sniffType(bytes([0, 0, 0, 0x18], "ftypheic", "...."))).toBe("image/heic");
    expect(sniffType(bytes([0, 0, 0, 0x18], "ftypmif1", "...."))).toBe("image/heic");
    expect(sniffType(bytes("%PDF-1.7\n"))).toBe("application/pdf");
  });

  it("boshqa fayllarni (HTML, SVG, dastur, video) rad etadi", () => {
    expect(sniffType(bytes("<html><script>alert(1)</script>"))).toBeNull();
    expect(sniffType(bytes('<svg xmlns="http://www.w3.org/2000/svg">'))).toBeNull();
    expect(sniffType(bytes("MZ", [0x90, 0]))).toBeNull();
    expect(sniffType(bytes([0, 0, 0, 0x18], "ftypmp42", "...."))).toBeNull();
    expect(sniffType(bytes([0xff, 0xd8]))).toBeNull();
    expect(sniffType(new Uint8Array())).toBeNull();
  });
});
