import { randomBytes } from "node:crypto";
import { Prisma } from "@prisma/client";
import ExcelJS from "exceljs";
import { db } from "./db";
import { L, type Text } from "./i18n";
import { diffPriceList, parsePriceList, type PriceListItem } from "./price-list";
import { fetchRemoteImage } from "./remote-image";
import { releaseImage, storeUpload, type PreparedUpload } from "./uploads";

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

// Bir yuklashda yangi yuklab olinadigan tashqi rasmlar soni va vaqti: funksiya vaqt chegarasidan oshmasin.
// Qolganlari keyingi yuklashda olinadi (allaqachon olinganlari qayta yuklanmaydi: Product.imageSource)
export const MAX_IMAGE_DOWNLOADS = 100;
const DOWNLOAD_BUDGET_MS = 60_000;
const DOWNLOAD_CONCURRENCY = 6;
const CHUNK = 500;

export type ImageWarning = { sku: string; message: Text };
type ImageFetcher = (url: string) => Promise<PreparedUpload>;

const isExternal = (url: string) => url.startsWith("https://");
const newId = () => `c${randomBytes(12).toString("hex")}`;

// Tashqi havolalardagi rasmlarni o'z omborimizga yuklab oladi: havola -> /api/files/products/... yoki xato sababi
async function importImages(urls: string[], fetchImage: ImageFetcher) {
  const stored = new Map<string, string>();
  const failed = new Map<string, Text>();
  const started = Date.now();
  const queue = urls.slice(0, MAX_IMAGE_DOWNLOADS);
  for (const url of urls.slice(MAX_IMAGE_DOWNLOADS)) failed.set(url, L("bir yuklashda ko'pi bilan {n} ta yangi rasm: faylni yana bir bor qo'llang", { n: MAX_IMAGE_DOWNLOADS }));
  const worker = async () => {
    for (let url = queue.shift(); url !== undefined; url = queue.shift()) {
      if (Date.now() - started > DOWNLOAD_BUDGET_MS) {
        failed.set(url, L("vaqt tugadi: faylni yana bir bor qo'llang"));
        continue;
      }
      try {
        stored.set(url, (await storeUpload("products", await fetchImage(url))).url);
      } catch (e) {
        failed.set(url, L("rasm olinmadi ({reason})", { reason: e instanceof Error ? e.message : "?" }));
      }
    }
  };
  await Promise.all(Array.from({ length: DOWNLOAD_CONCURRENCY }, worker));
  return { stored, failed };
}

// Qo'llash: yangi tovarlar qo'shiladi, borlari yangilanadi, faylda yo'qlari nofaol bo'ladi (o'chirilmaydi).
// Tovar egasidan olingan tovarlarga prays-list tegmaydi.
// Tovar va narxlar bir necha katta so'rovda yoziladi (har tovar uchun alohida so'rov minglab tovarda vaqt chegarasidan oshardi)
export async function applyPriceList(staff: { id: string; distributorId: string }, items: PriceListItem[], opts: { fetchImage?: ImageFetcher } = {}) {
  const groups = await db.priceGroup.findMany({ where: { distributorId: staff.distributorId } });
  const def = groups.find((g) => g.isDefault);
  if (!def) throw new Error("Asosiy narx guruhi yo'q");
  const now = new Date();

  // Rasmlar: o'z omborimizdagi havola o'zgarmay qo'yiladi; tashqi havoladan olingan rasm qayta yuklanmaydi
  const current = await db.product.findMany({
    where: { distributorId: staff.distributorId, sku: { in: items.map((i) => i.sku) } },
    select: { sku: true, imageUrl: true, imageSource: true },
  });
  const bySku = new Map(current.map((p) => [p.sku, p]));
  const alreadyImported = (it: PriceListItem) => {
    const p = bySku.get(it.sku);
    return Boolean(p?.imageUrl && p.imageSource === it.imageUrl);
  };
  const toFetch = [...new Set(items.filter((i) => i.imageUrl && isExternal(i.imageUrl) && !alreadyImported(i)).map((i) => i.imageUrl!))];
  const { stored, failed } = await importImages(toFetch, opts.fetchImage ?? fetchRemoteImage);
  const warnings: ImageWarning[] = [];
  const image = (it: PriceListItem): { url: string | null; source: string | null } => {
    if (!it.imageUrl || alreadyImported(it)) return { url: null, source: null };
    if (!isExternal(it.imageUrl)) return { url: it.imageUrl, source: null };
    const url = stored.get(it.imageUrl);
    if (url) return { url, source: it.imageUrl };
    warnings.push({ sku: it.sku, message: failed.get(it.imageUrl) ?? L("rasm olinmadi") });
    return { url: null, source: null };
  };
  const rows = items.map((it) => ({ it, img: image(it) }));
  // Almashtirilgan eski rasmlar: qo'llangach (boshqa joyda ishlatilmasa) ombordan tozalanadi
  const replaced = rows.map(({ it, img }) => (img.url ? bySku.get(it.sku)?.imageUrl : null)).filter((u): u is string => Boolean(u));

  let result;
  try {
    result = await db.$transaction(
      async (tx) => {
        const ids = new Map<string, string>();
        for (let i = 0; i < rows.length; i += CHUNK) {
          const values = rows
            .slice(i, i + CHUNK)
            .map(
              ({ it, img }) =>
                Prisma.sql`(${newId()}, ${staff.distributorId}, ${it.sku}, ${it.name}, ${it.brand}, ${it.category}, ${it.unit}, ${it.packSize}::int, ${it.barcode}, ${it.minOrderPacks}::int, ${it.inStock}, ${img.url}, ${img.source}, true, ${now})`,
            );
          // "Rasm havolasi" bo'sh bo'lsa, tovarning hozirgi rasmi (paneldan yoki ilovadan yuklangani) o'zgarmaydi
          const saved = await tx.$queryRaw<{ id: string; sku: string }[]>`
            INSERT INTO "Product" ("id", "distributorId", "sku", "name", "brand", "category", "unit", "packSize", "barcode", "minOrderPacks", "inStock", "imageUrl", "imageSource", "active", "updatedAt")
            VALUES ${Prisma.join(values)}
            ON CONFLICT ("distributorId", "sku") DO UPDATE SET
              "name" = EXCLUDED."name", "brand" = EXCLUDED."brand", "category" = EXCLUDED."category", "unit" = EXCLUDED."unit",
              "packSize" = EXCLUDED."packSize", "barcode" = EXCLUDED."barcode", "minOrderPacks" = EXCLUDED."minOrderPacks", "inStock" = EXCLUDED."inStock",
              "imageUrl" = COALESCE(EXCLUDED."imageUrl", "Product"."imageUrl"),
              "imageSource" = CASE WHEN EXCLUDED."imageUrl" IS NULL THEN "Product"."imageSource" ELSE EXCLUDED."imageSource" END,
              "active" = true, "updatedAt" = EXCLUDED."updatedAt"
            WHERE "Product"."brandProductId" IS NULL
            RETURNING "id", "sku"`;
          for (const r of saved) ids.set(r.sku, r.id);
        }

        const prices = rows.flatMap(({ it }) => {
          const productId = ids.get(it.sku);
          return productId ? groups.map((g) => ({ productId, groupId: g.id, price: g.isDefault ? it.price : (it.extraPrices[g.name] ?? it.price) })) : [];
        });
        for (let i = 0; i < prices.length; i += CHUNK) {
          const values = prices.slice(i, i + CHUNK).map((p) => Prisma.sql`(${newId()}, ${p.productId}, ${p.groupId}, ${p.price}::int, ${now})`);
          await tx.$executeRaw`
            INSERT INTO "Price" ("id", "productId", "priceGroupId", "price", "validFrom")
            VALUES ${Prisma.join(values)}
            ON CONFLICT ("productId", "priceGroupId") DO UPDATE SET "price" = EXCLUDED."price", "validFrom" = EXCLUDED."validFrom"`;
        }

        const removed = await tx.product.updateMany({
          where: { distributorId: staff.distributorId, brandProductId: null, active: true, sku: { notIn: items.map((i) => i.sku) } },
          data: { active: false },
        });
        await tx.auditLog.create({
          data: {
            actor: `staff:${staff.id}`,
            action: "pricelist.applied",
            entity: "Distributor",
            entityId: staff.distributorId,
            after: { items: items.length, deactivated: removed.count, imagesImported: stored.size, imageWarnings: warnings.length },
          },
        });
        return { items: ids.size, deactivated: removed.count };
      },
      { timeout: 60_000 },
    );
  } catch (e) {
    // Yozilmadi: yuklab olingan rasmlar hech kimga biriktirilmay qolmasin
    for (const url of stored.values()) await releaseImage(url);
    throw e;
  }
  for (const url of new Set(replaced)) await releaseImage(url);
  // Bir xil havola bir nechta tovarda bo'lsa, rasm bitta saqlanadi; hech qayerga yozilmay qolgani tozalanadi
  for (const url of stored.values()) await releaseImage(url);
  return { ...result, imageWarnings: warnings };
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
