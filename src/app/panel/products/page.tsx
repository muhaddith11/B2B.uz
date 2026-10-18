import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { formatSom } from "@/lib/money";
import { getStaff } from "@/lib/session";
import { BulkImages } from "./bulk-images";
import { ImageCell } from "./image-cell";
import { UploadForm } from "./upload-form";
import { panelT } from "../panel-lang";

export const dynamic = "force-dynamic";
// Prays-list qo'llash: tashqi rasmlarni yuklab olish va minglab tovarni yozish standart vaqtdan ko'proq olishi mumkin
export const maxDuration = 180;

// Tovarlar, Excel prays-list va tovar rasmlari
export default async function PanelProducts() {
  const staff = await getStaff();
  if (!staff) redirect("/panel");
  const { lang, t } = await panelT();
  const def = await db.priceGroup.findFirst({ where: { distributorId: staff.distributorId, isDefault: true } });
  const products = await db.product.findMany({
    where: { distributorId: staff.distributorId },
    include: { prices: { where: { priceGroupId: def?.id ?? "" } }, brandProduct: { select: { brand: { select: { name: true } } } } },
    orderBy: [{ active: "desc" }, { category: "asc" }, { name: "asc" }],
  });

  const canEdit = ["ADMIN", "OPERATOR"].includes(staff.role);

  return (
    <div className="grid gap-4">
      <h1 className="text-2xl font-semibold">{t("Tovarlar")}</h1>
      {canEdit && <UploadForm lang={lang} />}
      {canEdit && <BulkImages lang={lang} />}
      <table className="w-full overflow-hidden rounded-xl border border-line bg-card text-sm">
        <thead className="bg-bg text-left text-hint">
          <tr>
            <th className="px-3 py-2 font-medium">{t("Rasm")}</th>
            <th className="px-3 py-2 font-medium">{t("Artikul")}</th>
            <th className="px-3 py-2 font-medium">{t("Tovar")}</th>
            <th className="px-3 py-2 font-medium">{t("Toifa")}</th>
            <th className="px-3 py-2 text-right font-medium">{t("Yashikda")}</th>
            <th className="px-3 py-2 text-right font-medium">{t("Narx ({group})", { group: def?.name ?? t("asosiy") })}</th>
            <th className="px-3 py-2 font-medium">{t("Holat")}</th>
          </tr>
        </thead>
        <tbody>
          {products.map((p) => (
            <tr key={p.id} className={`border-t border-line ${p.active ? "" : "text-hint"}`}>
              <td className="px-3 py-2">
                {canEdit ? (
                  <ImageCell productId={p.id} imageUrl={p.imageUrl} name={p.name} lang={lang} />
                ) : (
                  p.imageUrl && (
                    // eslint-disable-next-line @next/next/no-img-element -- rasm /api/files dan, o'lchami kichik
                    <img src={p.imageUrl} alt="" className="size-11 rounded-lg border border-line object-cover" />
                  )
                )}
              </td>
              <td className="px-3 py-2 text-hint">{p.sku}</td>
              <td className="px-3 py-2">
                {p.name}
                {p.brandProduct && <span className="ml-2 text-xs text-accent-ink">{t("{brand} kelishuvi", { brand: p.brandProduct.brand.name })}</span>}
              </td>
              <td className="px-3 py-2">{p.category}</td>
              <td className="px-3 py-2 text-right">{p.packSize}</td>
              <td className="px-3 py-2 text-right">{p.prices[0] ? formatSom(p.prices[0].price) : "—"}</td>
              <td className="px-3 py-2">
                <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${!p.active ? "bg-field text-hint" : p.inStock ? "bg-ok-soft text-ok" : "bg-danger-soft text-danger"}`}>
                  {!p.active ? t("nofaol") : p.inStock ? t("bor") : t("tugagan")}
                </span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
