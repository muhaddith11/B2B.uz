import { z } from "zod";
import { assertBrandsEnabled } from "@/lib/features";
import { proposeAgreement, proposeInput } from "@/lib/brands";
import { handle, readJson, requireStaff } from "@/lib/session";

// Distribyutor tovar egasiga hamkorlik taklif qiladi
export const POST = handle(async (req: Request) => {
  assertBrandsEnabled();
  const staff = await requireStaff(req, ["ADMIN"]);
  const input = await readJson(req, proposeInput.extend({ brandId: z.string().min(1) }));
  const a = await proposeAgreement("DISTRIBUTOR", input.brandId, staff.distributorId, input, `staff:${staff.id}`);
  return Response.json({ id: a.id });
});
