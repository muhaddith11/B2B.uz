import { z } from "zod";
import { proposeAgreement, proposeInput } from "@/lib/brands";
import { db } from "@/lib/db";
import { handle, readJson, requireBrandUser } from "@/lib/session";

export const GET = handle(async (req: Request) => {
  const user = await requireBrandUser(req);
  const agreements = await db.agreement.findMany({
    where: { brandId: user.brandId },
    include: { distributor: { select: { id: true, name: true, districts: true } } },
    orderBy: [{ createdAt: "desc" }],
  });
  return Response.json({
    agreements: agreements.map((a) => ({
      id: a.id,
      status: a.status,
      initiatedBy: a.initiatedBy,
      districts: a.districts,
      discountPercent: a.discountPercent,
      terms: a.terms,
      createdAt: a.createdAt,
      distributor: a.distributor,
    })),
  });
});

// Tovar egasi distribyutorga hamkorlik taklif qiladi
export const POST = handle(async (req: Request) => {
  const user = await requireBrandUser(req);
  const input = await readJson(req, proposeInput.extend({ distributorId: z.string().min(1) }));
  const a = await proposeAgreement("BRAND", user.brandId, input.distributorId, input, `brand:${user.id}`);
  return Response.json({ id: a.id });
});
