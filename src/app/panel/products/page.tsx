import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { formatSom } from "@/lib/money";
import { getStaff } from "@/lib/session";
import { UploadForm } from "./upload-form";

export const dynamic = "force-dynamic";

// Tovarlar va Excel prays-list yuklash
export default async function PanelProducts() {
  const staff = await getStaff();
  if (!staff) redirect("/panel");
  const def = await db.priceGroup.findFirst({ where: { distributorId: staff.distributorId, isDefault: true } });
  const products = await db.product.findMany({
    where: { distributorId: staff.distributorId },
    include: { prices: { where: { priceGroupId: def?.id ?? "" } }, brandProduct: { select: { brand: { select: { name: true } } } } },
    orderBy: [{ active: "desc" }, { category: "asc" }, { name: "asc" }],
  });

  return (
    <div className="grid gap-4">
      <h1 className="text-2xl font-semibold">Tovarlar</h1>
      {["ADMIN", "OPERATOR"].includes(staff.role) && <UploadForm />}
      <table className="w-full overflow-hidden rounded-xl border border-gray-200 bg-white text-sm">
        <thead className="bg-gray-50 text-left text-gray-500">
          <tr>
            <th className="px-3 py-2 font-medium">Artikul</th>
            <th className="px-3 py-2 font-medium">Tovar</th>
            <th className="px-3 py-2 font-medium">Toifa</th>
            <th className="px-3 py-2 text-right font-medium">Yashikda</th>
            <th className="px-3 py-2 text-right font-medium">Narx ({def?.name ?? "asosiy"})</th>
            <th className="px-3 py-2 font-medium">Holat</th>
          </tr>
        </thead>
        <tbody>
          {products.map((p) => (
            <tr key={p.id} className={`border-t border-gray-100 ${p.active ? "" : "text-gray-400"}`}>
              <td className="px-3 py-2 text-gray-500">{p.sku}</td>
              <td className="px-3 py-2">
                {p.name}
                {p.brandProduct && <span className="ml-2 text-xs text-blue-600">{p.brandProduct.brand.name} kelishuvi</span>}
              </td>
              <td className="px-3 py-2">{p.category}</td>
              <td className="px-3 py-2 text-right">{p.packSize}</td>
              <td className="px-3 py-2 text-right">{p.prices[0] ? formatSom(p.prices[0].price) : "—"}</td>
              <td className="px-3 py-2">{!p.active ? "nofaol" : p.inStock ? "bor" : "tugagan"}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
