import { z } from "zod";
import { db } from "@/lib/db";
import { removePushTokens } from "@/lib/push";
import { handle, readJson, requireAccount } from "@/lib/session";

const input = z.object({
  // Shu qurilmaning Expo push tokeni: chiqilgandan keyin bu telefonga hisob bildirishnomalari bormaydi
  pushToken: z.string().max(200).optional(),
  // Barcha qurilmalardan chiqish: shu hisobning hamma tokenlari (boshqa telefonlar, panel) bekor bo'ladi
  everywhere: z.boolean().optional(),
});

// Mobil ilovadan chiqish
export const POST = handle(async (req: Request) => {
  const { pushToken, everywhere } = await readJson(req, input);
  const account = await requireAccount(req);
  if (everywhere) {
    const data = { sessionsValidAfter: new Date() };
    if (account.kind === "shop") await db.shopUser.update({ where: { id: account.id }, data });
    else if (account.kind === "staff") await db.staff.update({ where: { id: account.id }, data });
    else await db.brandUser.update({ where: { id: account.id }, data });
    await removePushTokens(account);
    await db.auditLog.create({ data: { actor: `${account.kind}:${account.id}`, action: "sessions.revoked", entity: account.kind, entityId: account.id } });
  } else if (pushToken) {
    await removePushTokens(account, pushToken);
  }
  return Response.json({ ok: true });
});
