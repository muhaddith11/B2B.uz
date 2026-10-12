import { db } from "@/lib/db";
import { brandSales } from "@/lib/brands";
import { handle, requireBrandUser } from "@/lib/session";

// Tovar egasi: hisob va bosh sahifa raqamlari (oxirgi 30 kunlik savdo distribyutorlar bo'yicha)
export const GET = handle(async (req: Request) => {
  const user = await requireBrandUser(req);
  const brandId = user.brandId;
  const [products, active, incoming, newOrders, sales] = await Promise.all([
    db.brandProduct.count({ where: { brandId, active: true } }),
    db.agreement.count({ where: { brandId, status: "ACTIVE" } }),
    db.agreement.count({ where: { brandId, status: "PROPOSED", initiatedBy: "DISTRIBUTOR" } }),
    db.brandOrder.count({ where: { brandId, status: "SENT" } }),
    brandSales(brandId, 30),
  ]);
  const b = user.brand;
  return Response.json({
    user: { name: user.name, phone: user.phone },
    brand: { id: b.id, name: b.name, status: b.status, categories: b.categories, description: b.description, inn: b.inn },
    counts: { products, activeAgreements: active, incomingProposals: incoming, newOrders },
    sales,
  });
});
