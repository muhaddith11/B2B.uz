import { handlePlatformClick } from "@/lib/click";

// Platformaning Click xizmati (obuna to'lovlari): .../prepare va .../complete (form-urlencoded)
export async function POST(req: Request, ctx: { params: Promise<{ stage: string }> }) {
  const { stage } = await ctx.params;
  if (stage !== "prepare" && stage !== "complete") return Response.json({ error: -3, error_note: "Action not found" }, { status: 404 });
  const form = await req.formData().catch(() => null);
  const params: Record<string, string> = {};
  form?.forEach((v, k) => {
    if (typeof v === "string") params[k] = v;
  });
  try {
    return Response.json(await handlePlatformClick(stage, params));
  } catch (e) {
    console.error("click (obuna):", e);
    return Response.json({ click_trans_id: params.click_trans_id ?? null, merchant_trans_id: params.merchant_trans_id ?? null, error: -8, error_note: "Error in request from click" });
  }
}
