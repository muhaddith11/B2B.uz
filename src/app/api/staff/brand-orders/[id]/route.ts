import { z } from "zod";
import { moveBrandOrder } from "@/lib/brands";
import { handle, readJson, requireStaff } from "@/lib/session";

// Distribyutor: yuborilgan buyurtmani bekor qiladi yoki jo'natilganini qabul qilib oladi
export const POST = handle(async (req: Request, ctx: { params: Promise<{ id: string }> }) => {
  const staff = await requireStaff(req, ["ADMIN"]);
  const { id } = await ctx.params;
  const { to } = await readJson(req, z.object({ to: z.enum(["CANCELLED", "DELIVERED"]) }));
  const o = await moveBrandOrder("DISTRIBUTOR", staff.distributorId, id, to);
  return Response.json({ status: o.status });
});
