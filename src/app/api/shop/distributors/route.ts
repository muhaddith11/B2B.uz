import { z } from "zod";
import { allCategories, discoverDistributors, discoverQuery, requestLink } from "@/lib/links";
import { handle, HttpError, readJson, requireShopUser } from "@/lib/session";

// Yangi distribyutor topish
export const GET = handle(async (req: Request) => {
  const user = await requireShopUser(req);
  const params = new URL(req.url).searchParams;
  const parsed = discoverQuery.safeParse({ q: params.get("q") ?? undefined, category: params.get("category") ?? undefined });
  if (!parsed.success) throw new HttpError(400, "Qidiruv so'rovi noto'g'ri");
  const [distributors, categories] = await Promise.all([discoverDistributors(user.shop, parsed.data), allCategories()]);
  return Response.json({ district: user.shop.district, categories, distributors });
});

// Ulanish so'rovini yuborish
export const POST = handle(async (req: Request) => {
  const user = await requireShopUser(req);
  if (user.role !== "OWNER") throw new HttpError(403, "Ulanish so'rovini do'kon egasi yuboradi");
  const { distributorId } = await readJson(req, z.object({ distributorId: z.string().min(1) }), "Distribyutor ko'rsatilmagan");
  const link = await requestLink(user.shopId, distributorId);
  return Response.json({ status: link.status });
});
