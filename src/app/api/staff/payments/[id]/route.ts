import { z } from "zod";
import { reviewPayment } from "@/lib/payments";
import { handle, readJson, requireStaff } from "@/lib/session";

// Chekli to'lovni tasdiqlash yoki rad etish
export const POST = handle(async (req: Request, ctx: { params: Promise<{ id: string }> }) => {
  const staff = await requireStaff(req, ["ADMIN", "ACCOUNTANT"]);
  const { id } = await ctx.params;
  const body = await readJson(req, z.object({ action: z.enum(["confirm", "reject"]), reason: z.string().trim().max(200).optional() }));
  const entry = await reviewPayment(staff, id, body.action, body.reason);
  return Response.json({ status: entry.status });
});
