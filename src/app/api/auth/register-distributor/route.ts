import { db } from "@/lib/db";
import { distributorRegistration, lockRegistration, phoneFromToken } from "@/lib/registration";
import { handle, readJson } from "@/lib/session";
import { boundedTrial } from "@/lib/subscription";
import { DAY_SECONDS, signToken } from "@/lib/token";

// Distribyutor o'zi ro'yxatdan o'tadi. Platforma tasdiqlaguncha (status PENDING) do'konlar uni ko'rmaydi.
export const POST = handle(async (req: Request) => {
  const input = await readJson(req, distributorRegistration, "Barcha maydonlarni to'ldiring");
  const phone = phoneFromToken(input.phoneToken);

  const staff = await db.$transaction(async (tx) => {
    // Ikki marta bosilsa ham bitta distribyutor: shu raqamli admin va shu nomli kompaniya bo'lsa, o'sha qaytadi
    await lockRegistration(tx, phone);
    const existing = await tx.staff.findFirst({
      where: { phone, role: "ADMIN", active: true, distributor: { name: { equals: input.companyName, mode: "insensitive" } } },
    });
    if (existing) return existing;
    // Shu raqam admin bo'lgan boshqa distribyutorlar: yangi kompaniya ochib tekin davrni cho'zib bo'lmaydi (boundedTrial)
    const others = await tx.distributor.findMany({ where: { staff: { some: { phone, role: "ADMIN", active: true } } }, select: { trialEndsAt: true } });
    const dist = await tx.distributor.create({
      data: { name: input.companyName, inn: input.inn || null, districts: input.districts, categories: input.categories, status: "PENDING", ...boundedTrial(others.map((d) => d.trialEndsAt)) },
    });
    await tx.priceGroup.create({ data: { distributorId: dist.id, name: "Oddiy", isDefault: true } });
    return tx.staff.create({ data: { distributorId: dist.id, name: input.adminName, phone, role: "ADMIN" } });
  });

  const token = signToken({ kind: "staff", staffId: staff.id, exp: Math.floor(Date.now() / 1000) + 30 * DAY_SECONDS });
  return Response.json({ token, role: staff.role });
});
