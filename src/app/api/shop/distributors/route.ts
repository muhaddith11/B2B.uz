import { z } from "zod";
import { allCategories, discoverDistributors, discoverQuery, requestLink } from "@/lib/links";
import { errorResponse, HttpError, requireShopUser } from "@/lib/session";

// Yangi distribyutor topish
export async function GET(req: Request) {
  try {
    const user = await requireShopUser(req);
    const params = new URL(req.url).searchParams;
    const parsed = discoverQuery.safeParse({ q: params.get("q") ?? undefined, category: params.get("category") ?? undefined });
    if (!parsed.success) throw new HttpError(400, "Qidiruv so'rovi noto'g'ri");
    const [distributors, categories] = await Promise.all([discoverDistributors(user.shop, parsed.data), allCategories()]);
    return Response.json({ district: user.shop.district, categories, distributors });
  } catch (e) {
    return errorResponse(e);
  }
}

// Ulanish so'rovini yuborish
export async function POST(req: Request) {
  try {
    const user = await requireShopUser(req);
    if (user.role !== "OWNER") throw new HttpError(403, "Ulanish so'rovini do'kon egasi yuboradi");
    const parsed = z.object({ distributorId: z.string().min(1) }).safeParse(await req.json().catch(() => null));
    if (!parsed.success) throw new HttpError(400, "Distribyutor ko'rsatilmagan");
    const link = await requestLink(user.shopId, parsed.data.distributorId);
    return Response.json({ status: link.status });
  } catch (e) {
    return errorResponse(e);
  }
}
