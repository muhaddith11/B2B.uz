import { handlePlatformPayme } from "@/lib/payme";

// Platformaning Payme kassasi (obuna to'lovlari). Javob har doim HTTP 200, xato JSON-RPC "error" ichida.
export async function POST(req: Request) {
  const body = await req.json().catch(() => null);
  if (body === null) return Response.json({ id: null, error: { code: -32700, message: { uz: "JSON xato", ru: "Ошибка парсинга JSON", en: "Parse error" } } });
  return Response.json(await handlePlatformPayme(req.headers.get("authorization"), body));
}
