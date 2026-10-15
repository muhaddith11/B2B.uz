import { z } from "zod";
import { db } from "@/lib/db";
import { normalizePhone } from "@/lib/phone";
import { handle, HttpError, readJson, requireStaff } from "@/lib/session";

// Xodimlar: admin agent, yetkazuvchi, operator va hisobchilarni qo'shadi. Ular shu raqam bilan SMS orqali kiradi.
export const GET = handle(async (req: Request) => {
  const staff = await requireStaff(req, ["ADMIN"]);
  const team = await db.staff.findMany({ where: { distributorId: staff.distributorId }, orderBy: [{ active: "desc" }, { role: "asc" }, { name: "asc" }] });
  return Response.json({ team: team.map((s) => ({ id: s.id, name: s.name, avatarUrl: s.avatarUrl, phone: s.phone, role: s.role, active: s.active, me: s.id === staff.id })) });
});

const ROLES = ["ADMIN", "OPERATOR", "ACCOUNTANT", "AGENT", "COURIER"] as const;

export const POST = handle(async (req: Request) => {
  const staff = await requireStaff(req, ["ADMIN"]);
  const input = await readJson(req, z.object({ name: z.string().trim().min(2).max(100), phone: z.string(), role: z.enum(ROLES) }), "Ism, telefon va rolni kiriting");
  const phone = normalizePhone(input.phone);
  if (!phone) throw new HttpError(400, "Telefon raqami +998 XX XXX XX XX ko'rinishida bo'lsin");
  const created = await db.$transaction(async (tx) => {
    // Jamoa o'zgarishlari navbat bilan: ikki marta bosilsa bir raqamli xodim ikki marta qo'shilmaydi
    await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${`team:${staff.distributorId}`}))`;
    if (await tx.staff.findFirst({ where: { distributorId: staff.distributorId, phone, active: true } })) throw new HttpError(400, "Bu raqamli xodim allaqachon bor");
    const s = await tx.staff.create({ data: { distributorId: staff.distributorId, name: input.name, phone, role: input.role } });
    await tx.auditLog.create({ data: { actor: `staff:${staff.id}`, action: "staff.created", entity: "Staff", entityId: s.id, after: { role: input.role } } });
    return s;
  });
  return Response.json({ id: created.id });
});
