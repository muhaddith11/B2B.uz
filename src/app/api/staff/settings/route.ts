import { z } from "zod";
import { db } from "@/lib/db";
import { handle, readJson, requireStaff } from "@/lib/session";

const list = z.array(z.string().trim().min(1).max(100)).max(50);

// Distribyutor sozlamalari: hududlar, toifalar, minimal buyurtma, yetkazish kunlari
export const PATCH = handle(async (req: Request) => {
  const staff = await requireStaff(req, ["ADMIN"]);
  const input = await readJson(
    req,
    z.object({
      name: z.string().trim().min(2).max(150).optional(),
      inn: z.string().trim().regex(/^\d{9}$/).nullable().optional(),
      districts: list.min(1).optional(),
      categories: list.min(1).optional(),
      minOrder: z.coerce.number().int().min(0).max(1_000_000_000).optional(),
      deliveryDays: list.optional(),
    }),
  );
  await db.distributor.update({ where: { id: staff.distributorId }, data: input });
  await db.auditLog.create({ data: { actor: `staff:${staff.id}`, action: "distributor.settings", entity: "Distributor", entityId: staff.distributorId, after: input } });
  return Response.json({ ok: true });
});
