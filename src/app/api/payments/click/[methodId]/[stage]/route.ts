import { handleClick } from "@/lib/click";
import { reportError } from "@/lib/monitoring";

// Click SHOP API: .../prepare va .../complete (form-urlencoded)
export async function POST(req: Request, ctx: { params: Promise<{ methodId: string; stage: string }> }) {
  const { methodId, stage } = await ctx.params;
  if (stage !== "prepare" && stage !== "complete") return Response.json({ error: -3, error_note: "Action not found" }, { status: 404 });
  const form = await req.formData().catch(() => null);
  const params: Record<string, string> = {};
  form?.forEach((v, k) => {
    if (typeof v === "string") params[k] = v;
  });
  try {
    return Response.json(await handleClick(methodId, stage, params));
  } catch (e) {
    reportError(e, { area: "click", stage, merchantTransId: params.merchant_trans_id }, "fatal");
    return Response.json({ click_trans_id: params.click_trans_id ?? null, merchant_trans_id: params.merchant_trans_id ?? null, error: -8, error_note: "Error in request from click" });
  }
}
