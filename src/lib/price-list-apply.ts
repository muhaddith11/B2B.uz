import ExcelJS from "exceljs";
import { db } from "./db";
import { diffPriceList, parsePriceList, type PriceListItem } from "./price-list";
import { releaseImage } from "./uploads";

export const TEMPLATE_HEADER = ["Artikul", "Nomi", "Brend", "Toifa", "O'lchov birligi", "Yashikda nechta", "Narx, so'm", "Shtrix-kod", "Minimal buyurtma, yashik", "Qoldiq", "Rasm havolasi"];

function cellValue(v: ExcelJS.CellValue): unknown {
  if (v === null || v === undefined) return "";
  if (typeof v === "object") {
    if ("result" in v) return v.result ?? ""; // formula
    if ("richText" in v) return v.richText.map((t) => t.text).join("");
    if ("text" in v) return v.text; // havola
    if (v instanceof Date) return v.toISOString();
  }
  return v;
}

// Excel (.xlsx) faylning birinchi varag'i: 1-qator sarlavha
export async function readSheet(data: ArrayBuffer): Promise<{ header: unknown[]; rows: unknown[][] }> {
  const wb = new ExcelJS.Workbook();
  await wb.xlsx.load(data);
  const ws = wb.worksheets[0];
  if (!ws) return { header: [], rows: [] };
  const all: unknown[][] = [];
  ws.eachRow({ includeEmpty: true }, (row) => {
    const values = (row.values as ExcelJS.CellValue[]).slice(1).map(cellValue);
    all.push(values);
  });
  return { header: all[0] ?? [], rows: all.slice(1) };
}

export async function previewPriceList(distributorId: string, data: ArrayBuffer) {
  const groups = await db.priceGroup.findMany({ where: { distributorId } });
  const { header, rows } = await readSheet(data);
  const parsed = parsePriceList(header, rows, groups.filter((g) => !g.isDefault).map((g) => g.name));
  const def = groups.find((g) => g.isDefault);
  const existing = await db.product.findMany({ where: { distributorId, brandProductId: null }, include: { prices: { where: { priceGroupId: def?.id ?? "" } } } });
  const diff = diffPriceList(
    existing.map((p) => ({ sku: p.sku, name: p.name, price: p.prices[0]?.price ?? 0, active: p.active })),
    parsed.items,
  );
  return { ...parsed, diff };
}

// Qo'llash: yangi tovarlar qo'shiladi, borlari yangilanadi, faylda yo'qlari nofaol bo'ladi (o'chirilmaydi).
// Tovar egasidan olingan tovarlarga prays-list tegmaydi.
export async function applyPriceList(staff: { id: string; distributorId: string }, items: PriceListItem[]) {
  const groups = await db.priceGroup.findMany({ where: { distributorId: staff.distributorId } });
  const def = groups.find((g) => g.isDefault);
  if (!def) throw new Error("Asosiy narx guruhi yo'q");
  const now = new Date();

  const result = await db.$transaction(
    async (tx) => {
      // Faylda rasm havolasi berilgan tovarlarning hozirgi rasmi: almashtirilgach eskisi ombordan tozalanadi
      const linkBySku = new Map(items.filter((i) => i.imageUrl).map((i) => [i.sku, i.imageUrl]));
      const before = linkBySku.size
        ? await tx.product.findMany({ where: { distributorId: staff.distributorId, sku: { in: [...linkBySku.keys()] } }, select: { sku: true, imageUrl: true } })
        : [];
      const replaced = before.filter((p) => p.imageUrl && p.imageUrl !== linkBySku.get(p.sku)).map((p) => p.imageUrl!);

      for (const it of items) {
        const fields = {
          name: it.name,
          brand: it.brand,
          category: it.category,
          unit: it.unit,
          packSize: it.packSize,
          barcode: it.barcode,
          minOrderPacks: it.minOrderPacks,
          inStock: it.inStock,
          // "Rasm havolasi" bo'sh bo'lsa, tovarning hozirgi rasmi (paneldan yoki ilovadan yuklangani) o'zgarmaydi
          ...(it.imageUrl ? { imageUrl: it.imageUrl } : {}),
          active: true,
        };
        const product = await tx.product.upsert({
          where: { distributorId_sku: { distributorId: staff.distributorId, sku: it.sku } },
          create: { ...fields, sku: it.sku, distributorId: staff.distributorId },
          update: fields,
        });
        for (const g of groups) {
          const price = g.isDefault ? it.price : (it.extraPrices[g.name] ?? it.price);
          await tx.price.upsert({
            where: { productId_priceGroupId: { productId: product.id, priceGroupId: g.id } },
            create: { productId: product.id, priceGroupId: g.id, price, validFrom: now },
            update: { price, validFrom: now },
          });
        }
      }
      const removed = await tx.product.updateMany({
        where: { distributorId: staff.distributorId, brandProductId: null, active: true, sku: { notIn: items.map((i) => i.sku) } },
        data: { active: false },
      });
      await tx.auditLog.create({
        data: { actor: `staff:${staff.id}`, action: "pricelist.applied", entity: "Distributor", entityId: staff.distributorId, after: { items: items.length, deactivated: removed.count } },
      });
      return { items: items.length, deactivated: removed.count, replaced };
    },
    { timeout: 60_000 },
  );
  for (const url of result.replaced) await releaseImage(url);
  return { items: result.items, deactivated: result.deactivated };
}

export async function templateWorkbook(distributorId: string): Promise<Buffer> {
  const groups = await db.priceGroup.findMany({ where: { distributorId, isDefault: false }, orderBy: { name: "asc" } });
  const wb = new ExcelJS.Workbook();
  const ws = wb.addWorksheet("Prays-list");
  ws.addRow([...TEMPLATE_HEADER, ...groups.map((g) => g.name)]);
  ws.addRow(["A-001", "Namuna tovar, 1 l", "Brend", "Ichimliklar", "dona", 6, 9800, "", 1, "bor", "", ...groups.map(() => "")]);
  ws.getRow(1).font = { bold: true };
  ws.columns.forEach((c) => (c.width = 18));
  return Buffer.from(await wb.xlsx.writeBuffer());
}
