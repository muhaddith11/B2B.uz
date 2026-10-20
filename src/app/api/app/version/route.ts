import { minAppVersion, STORE_URLS } from "@/lib/app-version";
import { handle } from "@/lib/session";

export const dynamic = "force-dynamic";

// Ilova ochilganda so'raydi (kirishdan oldin ham): o'z versiyasi minVersion dan eski bo'lsa, "Yangilash" ekranini
// ko'rsatadi. Javob CDN'da 5 daqiqa saqlanadi: har ochilishda bazaga bormaydi, admin o'zgartirgani 5 daqiqada yetib boradi
export const GET = handle(async () => {
  return Response.json(
    { minVersion: await minAppVersion(), storeUrl: STORE_URLS },
    { headers: { "cache-control": "public, max-age=0, s-maxage=300" } },
  );
});
