import { db } from "@/lib/db";
import { handle, requireStaff } from "@/lib/session";

// Xodim va distribyutor haqida: ekranlar rolga qarab chiziladi
export const GET = handle(async (req: Request) => {
  const staff = await requireStaff(req);
  const [couriers, priceGroups, agents] = await Promise.all([
    db.staff.findMany({ where: { distributorId: staff.distributorId, role: "COURIER", active: true }, select: { id: true, name: true }, orderBy: { name: "asc" } }),
    db.priceGroup.findMany({ where: { distributorId: staff.distributorId }, select: { id: true, name: true, isDefault: true }, orderBy: [{ isDefault: "desc" }, { name: "asc" }] }),
    db.staff.findMany({ where: { distributorId: staff.distributorId, role: "AGENT", active: true }, select: { id: true, name: true }, orderBy: { name: "asc" } }),
  ]);
  const d = staff.distributor;
  return Response.json({
    staff: { id: staff.id, name: staff.name, phone: staff.phone, role: staff.role },
    distributor: { id: d.id, name: d.name, status: d.status, districts: d.districts, categories: d.categories, minOrder: d.minOrder, deliveryDays: d.deliveryDays, inn: d.inn },
    couriers,
    agents,
    priceGroups,
  });
});
