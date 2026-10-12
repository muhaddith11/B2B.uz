import { importBrandProduct, importInput } from "@/lib/brands";
import { handle, readJson, requireStaff } from "@/lib/session";

// Faol kelishuvdagi tovarni o'z katalogiga qo'shish (yoki narxini yangilash)
export const POST = handle(async (req: Request, ctx: { params: Promise<{ id: string }> }) => {
  const staff = await requireStaff(req, ["ADMIN"]);
  const { id } = await ctx.params;
  const input = await readJson(req, importInput, "Sotish narxini kiriting");
  const product = await importBrandProduct(staff, id, input);
  return Response.json({ productId: product.id });
});
