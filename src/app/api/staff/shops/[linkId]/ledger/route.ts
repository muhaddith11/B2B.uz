import { readPage } from "@/lib/paging";
import { handle, requireStaff } from "@/lib/session";
import { ledgerPage, staffLink } from "@/lib/staff-data";

// Do'kon qarz daftarining keyingi sahifalari (kartada birinchi 100 ta yozuv). Ruxsat kartaniki bilan bir xil (linkScope)
export const GET = handle(async (req: Request, ctx: { params: Promise<{ linkId: string }> }) => {
  const staff = await requireStaff(req);
  const { linkId } = await ctx.params;
  const link = await staffLink(staff, linkId);
  return Response.json(await ledgerPage(link.id, readPage(new URL(req.url), 100)));
});
