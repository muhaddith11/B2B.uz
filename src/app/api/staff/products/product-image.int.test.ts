// Tovar rasmi: xodim yuklaydi, katalogda hamma ko'radi (token kerak emas), boshqa distribyutor tovariga yuklab bo'lmaydi
import { describe, expect, it } from "vitest";
import { db } from "@/lib/db";
import { ctx, fileBytes, makeWorld } from "@/test/factory";
import * as file from "../../files/[folder]/[name]/route";
import * as image from "./[id]/image/route";

function upload(token: string, type = "image/png") {
  const form = new FormData();
  form.set("image", new File([fileBytes(type)], "tovar.png", { type }));
  return new Request("http://test.local/api/staff/products/x/image", { method: "POST", headers: { authorization: `Bearer ${token}` }, body: form });
}

describe("tovar rasmi", () => {
  it("operator yuklaydi, rasm hammaga ochiq, olib tashlansa yopiladi", async () => {
    const w = await makeWorld();
    const res = await image.POST(upload(w.operator.token), ctx({ id: w.product.id }));
    expect(res.status).toBe(200);
    const { imageUrl } = (await res.json()) as { imageUrl: string };
    expect(imageUrl).toMatch(/^\/api\/files\/products\/[a-f0-9]{32}\.png$/);
    expect((await db.product.findUniqueOrThrow({ where: { id: w.product.id } })).imageUrl).toBe(imageUrl);

    const [, , , folder, name] = imageUrl.split("/");
    const shown = await file.GET(new Request(`http://test.local${imageUrl}`), ctx({ folder, name }));
    expect(shown.status).toBe(200);
    expect(shown.headers.get("cache-control")).toContain("public");

    const removed = await image.DELETE(new Request("http://test.local/x", { method: "DELETE", headers: { authorization: `Bearer ${w.operator.token}` } }), ctx({ id: w.product.id }));
    expect(removed.status).toBe(200);
    expect((await file.GET(new Request(`http://test.local${imageUrl}`), ctx({ folder, name }))).status).toBe(404);
  });

  it("faqat rasm, faqat o'z tovari va faqat admin/operator", async () => {
    const w = await makeWorld();
    const other = await makeWorld();
    expect((await image.POST(upload(w.operator.token, "application/pdf"), ctx({ id: w.product.id }))).status).toBe(400);
    expect((await image.POST(upload(w.operator.token), ctx({ id: other.product.id }))).status).toBe(404);
    expect((await image.POST(upload(w.agent.token), ctx({ id: w.product.id }))).status).toBe(403);
  });
});
