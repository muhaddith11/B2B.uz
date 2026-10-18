"use server";

import { revalidatePath } from "next/cache";
import { render } from "@/lib/i18n";
import { applyPriceList, previewPriceList } from "@/lib/price-list-apply";
import { getStaff } from "@/lib/session";
import { panelT } from "../panel-lang";

export type PriceListState =
  | { kind: "idle" }
  | { kind: "error"; message: string }
  | {
      kind: "preview" | "applied";
      errors: { row: number; message: string }[];
      count: number;
      added: string[];
      priceChanged: { name: string; oldPrice: number; newPrice: number }[];
      removed: string[];
      deactivated?: number;
      // Prays-listdagi tashqi havoladan olinmagan rasmlar (tovarning o'zi yoziladi, rasmi o'zgarmaydi)
      imageWarnings?: { sku: string; message: string }[];
    };

// Bitta forma: "Tekshirish" faylni o'qib farqni ko'rsatadi, "Qo'llash" o'sha faylni bazaga yozadi
export async function priceListAction(_prev: PriceListState, form: FormData): Promise<PriceListState> {
  const { lang, t } = await panelT();
  const staff = await getStaff();
  if (!staff || !["ADMIN", "OPERATOR"].includes(staff.role)) return { kind: "error", message: t("Ruxsat yo'q") };
  const file = form.get("file");
  if (!(file instanceof File) || file.size === 0) return { kind: "error", message: t("Excel faylni tanlang") };
  if (file.size > 10 * 1024 * 1024) return { kind: "error", message: t("Fayl 10 MB dan katta") };

  let result;
  try {
    result = await previewPriceList(staff.distributorId, await file.arrayBuffer());
  } catch {
    return { kind: "error", message: t("Faylni o'qib bo'lmadi. .xlsx formatidagi Excel fayl yuklang") };
  }
  const summary = {
    errors: result.errors.map((e) => ({ row: e.row, message: render(e.message, lang) })),
    count: result.items.length,
    added: result.diff.added.map((i) => i.name),
    priceChanged: result.diff.priceChanged.map((p) => ({ name: p.name, oldPrice: p.oldPrice, newPrice: p.newPrice })),
    removed: result.diff.removed.map((p) => p.name),
  };
  if (form.get("mode") !== "apply") return { kind: "preview", ...summary };
  if (result.errors.length > 0) return { kind: "preview", ...summary };

  const applied = await applyPriceList(staff, result.items);
  revalidatePath("/panel", "layout");
  return { kind: "applied", ...summary, deactivated: applied.deactivated, imageWarnings: applied.imageWarnings.map((w) => ({ sku: w.sku, message: render(w.message, lang) })) };
}
