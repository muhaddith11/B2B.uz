import { deleteAccount } from "@/lib/account";
import { bearerPayload, handle, HttpError, requireBrandUser, requireShopUser, requireStaff } from "@/lib/session";

// Mobil ilova: hozir kirgan hisobni o'chirish
export const POST = handle(async (req: Request) => {
  const kind = bearerPayload(req)?.kind;
  if (kind === "shop") await deleteAccount({ kind, id: (await requireShopUser(req)).id });
  else if (kind === "staff") await deleteAccount({ kind, id: (await requireStaff(req)).id });
  else if (kind === "brand") await deleteAccount({ kind, id: (await requireBrandUser(req)).id });
  else throw new HttpError(401, "Kirish kerak");
  return Response.json({ ok: true });
});
