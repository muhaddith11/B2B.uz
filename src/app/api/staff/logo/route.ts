import { db } from "@/lib/db";
import { saveImage } from "@/lib/product-image";
import { handle, requireStaff } from "@/lib/session";

// Distribyutor logosi: do'konchi katalog, buyurtma va qarzlarda ko'radi. Faqat admin
export const POST = handle(async (req: Request) => {
  const staff = await requireStaff(req, ["ADMIN"]);
  const logoUrl = await saveImage(req, "logos");
  await db.distributor.update({ where: { id: staff.distributorId }, data: { logoUrl } });
  await db.auditLog.create({ data: { actor: `staff:${staff.id}`, action: "distributor.logo", entity: "Distributor", entityId: staff.distributorId, after: { logoUrl } } });
  return Response.json({ logoUrl });
});

export const DELETE = handle(async (req: Request) => {
  const staff = await requireStaff(req, ["ADMIN"]);
  await db.distributor.update({ where: { id: staff.distributorId }, data: { logoUrl: null } });
  await db.auditLog.create({ data: { actor: `staff:${staff.id}`, action: "distributor.logo", entity: "Distributor", entityId: staff.distributorId, after: { logoUrl: null } } });
  return Response.json({ ok: true });
});
