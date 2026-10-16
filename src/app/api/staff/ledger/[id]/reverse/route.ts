import { CORRECTION_ROLES, reverseEntry, reverseInput } from "@/lib/corrections";
import { handle, readJson, requireStaff } from "@/lib/session";

// Xato yozilgan to'lov yoki qarzni bekor qilish (teskari yozuv bilan; admin va hisobchi)
export const POST = handle(async (req: Request, ctx: { params: Promise<{ id: string }> }) => {
  const staff = await requireStaff(req, CORRECTION_ROLES);
  const { id } = await ctx.params;
  const { reason } = await readJson(req, reverseInput, "Bekor qilish sababini yozing");
  const entry = await reverseEntry(staff, id, reason);
  return Response.json({ id: entry.id });
});
