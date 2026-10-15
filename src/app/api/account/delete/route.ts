import { deleteAccount } from "@/lib/account";
import { handle, requireAccount } from "@/lib/session";

// Mobil ilova: hozir kirgan hisobni o'chirish
export const POST = handle(async (req: Request) => {
  await deleteAccount(await requireAccount(req));
  return Response.json({ ok: true });
});
