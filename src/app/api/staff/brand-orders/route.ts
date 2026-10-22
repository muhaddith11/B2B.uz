import { brandOrderInput, createBrandOrder } from "@/lib/brands";
import { assertBrandsEnabled } from "@/lib/features";
import { handle, readJson, requireStaff } from "@/lib/session";

// Tovar egasidan xarid buyurtmasi
export const POST = handle(async (req: Request) => {
  assertBrandsEnabled();
  const staff = await requireStaff(req, ["ADMIN"]);
  const input = await readJson(req, brandOrderInput, "Buyurtma ma'lumotlari noto'g'ri");
  const order = await createBrandOrder(staff, input);
  return Response.json({ id: order.id, number: order.number, total: order.total });
});
