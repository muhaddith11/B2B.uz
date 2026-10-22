import { z } from "zod";
import { assertBrandsEnabled } from "@/lib/features";
import { respondAgreement } from "@/lib/brands";
import { handle, readJson, requireStaff } from "@/lib/session";

export const POST = handle(async (req: Request, ctx: { params: Promise<{ id: string }> }) => {
  assertBrandsEnabled();
  const staff = await requireStaff(req, ["ADMIN"]);
  const { id } = await ctx.params;
  const { action } = await readJson(req, z.object({ action: z.enum(["accept", "reject", "end"]) }));
  const a = await respondAgreement("DISTRIBUTOR", staff.distributorId, id, action, `staff:${staff.id}`);
  return Response.json({ status: a.status });
});
