// Prays-list yuklash: spetsifikatsiyadagi "Prays-list yuklash" bo'limidagi shablon.
// Bu fayl faqat jadval qatorlarini tekshiradi va solishtiradi; Excel o'qish alohida.

import { L, type Text } from "./i18n";

export type PriceListItem = {
  sku: string;
  name: string;
  brand: string;
  category: string;
  unit: string;
  packSize: number;
  price: number;
  barcode: string | null;
  minOrderPacks: number;
  inStock: boolean;
  imageUrl: string | null;
  extraPrices: Record<string, number>; // narx guruhi nomi -> narx
};

// Xato matni panel tilida ko'rsatiladi (render): ustun nomlari Excel shablonidagidek qoladi
export type RowError = { row: number; message: Text };

const FIELDS = {
  sku: "artikul",
  name: "nomi",
  brand: "brend",
  category: "toifa",
  unit: "olchovbirligi",
  packSize: "yashikdanechta",
  price: "narxsom",
  barcode: "shtrixkod",
  minOrderPacks: "minimalbuyurtmayashik",
  stock: "qoldiq",
  imageUrl: "rasmhavolasi",
} as const;
type Field = keyof typeof FIELDS;
const REQUIRED: Field[] = ["sku", "name", "brand", "category", "unit", "packSize", "price"];

// Ilovadan tovar qo'shishdagi chegaralar bilan bir xil: katta son bazaga sig'maydi (server xatosi o'rniga qator xatosi),
// uzun matn esa katalog va buyurtmalarni buzadi
export const MAX_PRICE = 100_000_000;
const MAX_PACK = 10_000;
const MAX_MIN_PACKS = 1000;
const MAX_LEN: Partial<Record<Field, number>> = { sku: 50, name: 200, brand: 100, category: 100, unit: 20, barcode: 50, imageUrl: 1000 };

// "O'lchov birligi", "O‘lchov  birligi" -> "olchovbirligi"
export function normalizeHeader(h: string): string {
  return h
    .toLowerCase()
    .replace(/[''‘’ʻʼ`"]/g, "")
    .replace(/[^a-z0-9а-яё]/g, "");
}

function text(v: unknown): string {
  return v === null || v === undefined ? "" : String(v).trim();
}

// "9 800", "9 800", "9800.00" -> 9800
export function parseAmount(v: unknown): number | null {
  if (typeof v === "number") return Number.isFinite(v) ? Math.round(v) : null;
  const s = text(v).replace(/[\s ]/g, "").replace(",", ".");
  if (!s) return null;
  const n = Number(s);
  return Number.isFinite(n) ? Math.round(n) : null;
}

function parseStock(v: unknown): boolean | null {
  const s = normalizeHeader(text(v));
  if (s === "" || s === "bor" || s === "ha") return true;
  if (s === "yoq" || s === "tugagan" || s === "0") return false;
  const n = parseAmount(v);
  if (n === null) return null;
  return n > 0;
}

export function parsePriceList(
  header: unknown[],
  rows: unknown[][],
  priceGroupNames: string[],
): { items: PriceListItem[]; errors: RowError[] } {
  const norm = header.map((h) => normalizeHeader(text(h)));
  const col = {} as Record<Field, number>;
  for (const [field, key] of Object.entries(FIELDS) as [Field, string][]) col[field] = norm.indexOf(key);

  const errors: RowError[] = [];
  const missing = REQUIRED.filter((f) => col[f] === -1);
  if (missing.length) {
    return { items: [], errors: [{ row: 1, message: L("Majburiy ustun yo'q: {cols}", { cols: missing.map((f) => FIELDS[f]).join(", ") }) }] };
  }

  const groupCols = priceGroupNames
    .map((name) => ({ name, idx: norm.indexOf(normalizeHeader(name)) }))
    .filter((g) => g.idx !== -1 && !Object.values(col).includes(g.idx));

  const items: PriceListItem[] = [];
  const seen = new Map<string, number>();

  rows.forEach((r, i) => {
    const rowNo = i + 2; // 1-qator sarlavha
    if (r.every((c) => text(c) === "")) return;
    const get = (f: Field) => (col[f] === -1 ? "" : r[col[f]]);

    const emptyRequired = REQUIRED.filter((f) => text(get(f)) === "");
    if (emptyRequired.length) {
      errors.push({ row: rowNo, message: L("Bo'sh majburiy ustun: {cols}", { cols: emptyRequired.map((f) => FIELDS[f]).join(", ") }) });
      return;
    }
    const tooLong = (Object.entries(MAX_LEN) as [Field, number][]).filter(([f, max]) => text(get(f)).length > max);
    if (tooLong.length) {
      errors.push({ row: rowNo, message: L("Matn juda uzun (belgilar soni chegarasi): {cols}", { cols: tooLong.map(([f, max]) => `${FIELDS[f]} ≤ ${max}`).join(", ") }) });
      return;
    }
    const sku = text(get("sku"));
    if (seen.has(sku)) {
      errors.push({ row: rowNo, message: L("Artikul {sku} takrorlangan ({row}-qatorda ham bor)", { sku, row: seen.get(sku)! }) });
      return;
    }
    const price = parseAmount(get("price"));
    if (price === null || price <= 0) {
      errors.push({ row: rowNo, message: "Narx nol, manfiy yoki son emas" });
      return;
    }
    if (price > MAX_PRICE) {
      errors.push({ row: rowNo, message: "Narx juda katta: bir dona narxi 100 000 000 so'mdan oshmasin" });
      return;
    }
    const packSize = parseAmount(get("packSize"));
    if (packSize === null || packSize <= 0 || packSize > MAX_PACK) {
      errors.push({ row: rowNo, message: "Yashikdagi soni 1 dan 10 000 gacha butun son bo'lishi kerak" });
      return;
    }
    const minRaw = text(get("minOrderPacks"));
    const minOrderPacks = minRaw ? parseAmount(minRaw) : 1;
    if (minOrderPacks === null || minOrderPacks <= 0 || minOrderPacks > MAX_MIN_PACKS) {
      errors.push({ row: rowNo, message: "Minimal buyurtma 1 dan 1000 yashikkacha bo'lishi kerak" });
      return;
    }
    const inStock = parseStock(get("stock"));
    if (inStock === null) {
      errors.push({ row: rowNo, message: "Qoldiq: \"bor\", \"yo'q\" yoki son bo'lishi kerak" });
      return;
    }

    // Rasm havolasi: internetdagi rasm (faqat https: telefonlar shifrlanmagan http rasmni ochmaydi). Qo'llashda rasm
    // o'z omborimizga yuklab olinadi (price-list-apply.ts). Bo'sh bo'lsa tovarning hozirgi rasmi saqlanadi
    const imageUrl = text(get("imageUrl")) || null;
    if (imageUrl && !/^(https:\/\/\S+|\/api\/files\/products\/[a-f0-9]{32}\.[a-z]+)$/i.test(imageUrl)) {
      errors.push({ row: rowNo, message: "Rasm havolasi https:// bilan boshlanadigan manzil bo'lsin" });
      return;
    }

    const extraPrices: Record<string, number> = {};
    const badGroups: string[] = [];
    for (const g of groupCols) {
      const p = parseAmount(r[g.idx]);
      if (p !== null && p > MAX_PRICE) badGroups.push(g.name);
      else if (p !== null && p > 0) extraPrices[g.name] = p;
    }
    if (badGroups.length) {
      errors.push({ row: rowNo, message: L("Narx juda katta: {groups}", { groups: badGroups.join(", ") }) });
      return;
    }

    seen.set(sku, rowNo);
    items.push({
      sku,
      name: text(get("name")),
      brand: text(get("brand")),
      category: text(get("category")),
      unit: text(get("unit")),
      packSize,
      price,
      barcode: text(get("barcode")) || null,
      minOrderPacks,
      inStock,
      imageUrl,
      extraPrices,
    });
  });

  return { items, errors };
}

export type ExistingProduct = { sku: string; name: string; price: number; active: boolean };

// Qo'llashdan oldin distribyutorga ko'rsatiladi: yangi, narxi o'zgargan va yo'qolgan tovarlar
export function diffPriceList(existing: ExistingProduct[], items: PriceListItem[]) {
  const bySku = new Map(existing.map((p) => [p.sku, p]));
  const incoming = new Set(items.map((i) => i.sku));
  return {
    added: items.filter((i) => !bySku.has(i.sku)),
    priceChanged: items
      .filter((i) => bySku.has(i.sku) && bySku.get(i.sku)!.price !== i.price)
      .map((i) => ({ sku: i.sku, name: i.name, oldPrice: bySku.get(i.sku)!.price, newPrice: i.price })),
    // Yangi faylda bo'lmagan tovar o'chirilmaydi, "tugagan"/nofaol bo'ladi
    removed: existing.filter((p) => p.active && !incoming.has(p.sku)),
  };
}
