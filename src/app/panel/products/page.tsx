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
      <table className="w-full overflow-hidden rounded-xl border border-line bg-card text-sm">
        <thead className="bg-bg text-left text-hint">
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
            <tr key={p.id} className={`border-t border-line ${p.active ? "" : "text-hint"}`}>
              <td className="px-3 py-2 text-hint">{p.sku}</td>
              <td className="px-3 py-2">
                {p.name}
                {p.brandProduct && <span className="ml-2 text-xs text-accent-ink">{p.brandProduct.brand.name} kelishuvi</span>}
              </td>
              <td className="px-3 py-2">{p.category}</td>
              <td className="px-3 py-2 text-right">{p.packSize}</td>
              <td className="px-3 py-2 text-right">{p.prices[0] ? formatSom(p.prices[0].price) : "—"}</td>
              <td className="px-3 py-2">
                <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${!p.active ? "bg-field text-hint" : p.inStock ? "bg-ok-soft text-ok" : "bg-danger-soft text-danger"}`}>
                  {!p.active ? "nofaol" : p.inStock ? "bor" : "tugagan"}
                </span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
