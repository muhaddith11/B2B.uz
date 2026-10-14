import { db } from "@/lib/db";
import { brandRegistration, lockRegistration, phoneFromToken } from "@/lib/registration";
import { handle, readJson } from "@/lib/session";
import { DAY_SECONDS, signToken } from "@/lib/token";

// Tovar egasi o'zi ro'yxatdan o'tadi. Platforma tasdiqlaguncha distribyutorlarga ko'rinmaydi.
export const POST = handle(async (req: Request) => {
  const input = await readJson(req, brandRegistration, "Barcha maydonlarni to'ldiring");
  const phone = phoneFromToken(input.phoneToken);

  const user = await db.$transaction(async (tx) => {
    // Ikki marta bosilsa ham bitta tovar egasi: shu raqamda shu nomli brend bo'lsa, o'sha qaytadi
    await lockRegistration(tx, phone);
    const existing = await tx.brandUser.findFirst({ where: { phone, brand: { name: { equals: input.brandName, mode: "insensitive" } } } });
    return (
      existing ??
      tx.brandUser.create({
        data: {
          name: input.contactName,
          phone,
          brand: { create: { name: input.brandName, inn: input.inn || null, categories: input.categories, description: input.description || null } },
        },
      })
    );
  });

  const token = signToken({ kind: "brand", brandUserId: user.id, exp: Math.floor(Date.now() / 1000) + 30 * DAY_SECONDS });
  return Response.json({ token });
});
