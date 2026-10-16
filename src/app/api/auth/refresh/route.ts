import { handle, requireAccount } from "@/lib/session";
import { DAY_SECONDS, signToken } from "@/lib/token";

// Mobil ilova sessiyasini uzaytirish: ilova ochilganda eski tokenni yangisiga almashtiradi, shunda faol foydalanuvchi
// har 30 kunda SMS kod bilan qayta kirishi shart emas. Faqat hozir ham yaroqli token bilan: o'chirilgan hisob,
// "barcha qurilmalardan chiqish" qilingan yoki muddati o'tgan sessiya uzaytirilmaydi (requireAccount)
export const POST = handle(async (req: Request) => {
  const account = await requireAccount(req);
  const exp = Math.floor(Date.now() / 1000) + 30 * DAY_SECONDS;
  const token =
    account.kind === "shop"
      ? signToken({ kind: "shop", shopUserId: account.id, exp })
      : account.kind === "staff"
        ? signToken({ kind: "staff", staffId: account.id, exp })
        : signToken({ kind: "brand", brandUserId: account.id, exp });
  return Response.json({ token, exp });
});
