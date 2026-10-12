import { handlePayme } from "@/lib/payme";

// Payme Merchant API so'rovlari. Javob har doim HTTP 200, xato JSON-RPC "error" ichida.
export async function POST(req: Request, ctx: { params: Promise<{ methodId: string }> }) {
  const { methodId } = await ctx.params;
  const body = await req.json().catch(() => null);
  if (body === null) return Response.json({ id: null, error: { code: -32700, message: { uz: "JSON xato", ru: "Ошибка парсинга JSON", en: "Parse error" } } });
  return Response.json(await handlePayme(methodId, req.headers.get("authorization"), body));
}
