import { db } from "@/lib/db";
import { distributorRegistration, phoneFromToken } from "@/lib/registration";
import { handle, readJson } from "@/lib/session";
import { DAY_SECONDS, signToken } from "@/lib/token";

// Distribyutor o'zi ro'yxatdan o'tadi. Platforma tasdiqlaguncha (status PENDING) do'konlar uni ko'rmaydi.
export const POST = handle(async (req: Request) => {
  const input = await readJson(req, distributorRegistration, "Barcha maydonlarni to'ldiring");
  const phone = phoneFromToken(input.phoneToken);

  const staff = await db.$transaction(async (tx) => {
    const dist = await tx.distributor.create({
      data: { name: input.companyName, inn: input.inn || null, districts: input.districts, categories: input.categories, status: "PENDING" },
    });
    await tx.priceGroup.create({ data: { distributorId: dist.id, name: "Oddiy", isDefault: true } });
    return tx.staff.create({ data: { distributorId: dist.id, name: input.adminName, phone, role: "ADMIN" } });
  });

  const token = signToken({ kind: "staff", staffId: staff.id, exp: Math.floor(Date.now() / 1000) + 30 * DAY_SECONDS });
  return Response.json({ token, role: staff.role });
});
