// Ro'yxatlarni sahifalab berish. Ilgari ro'yxatlar jim kesilardi (take: 100): 101-buyurtma yoki 501-do'kon ko'rinmay qolardi
// va buni hech kim bilmasdi. Endi javobda keyingi sahifa kaliti bor; eski ilova uni e'tiborsiz qoldirib, birinchi sahifani oladi.
// - Vaqt bo'yicha ro'yxatlar (buyurtma, to'lov, qarz daftari): kursor (oxirgi yozuv id'si). Yangi yozuv qo'shilsa ham
//   sahifalar siljimaydi va takrorlanmaydi; tartib doim [vaqt, id] (bir xil vaqtli yozuvlar ham aniq tartibda).
// - Nom bo'yicha ro'yxat (do'konlar): offset.

export const MAX_PAGE = 200;

export type Page = { limit: number; cursor: string | null };

export function readPage(url: URL, defaultLimit: number): Page {
  const n = Number(url.searchParams.get("limit"));
  const limit = Number.isInteger(n) && n > 0 ? Math.min(n, MAX_PAGE) : defaultLimit;
  const cursor = url.searchParams.get("cursor")?.slice(0, 64) || null;
  return { limit, cursor };
}

// Prisma findMany uchun: bitta ortiqcha yozuv olinadi (keyingi sahifa bormi shundan bilinadi)
export function cursorArgs(page: Page) {
  return { take: page.limit + 1, ...(page.cursor ? { cursor: { id: page.cursor }, skip: 1 } : {}) };
}

export function pageOf<T extends { id: string }>(rows: T[], page: Page): { items: T[]; nextCursor: string | null } {
  const items = rows.slice(0, page.limit);
  return { items, nextCursor: rows.length > page.limit ? items[items.length - 1].id : null };
}

export type OffsetPage = { limit: number; offset: number };

export function readOffset(url: URL, defaultLimit: number): OffsetPage {
  const n = Number(url.searchParams.get("limit"));
  const o = Number(url.searchParams.get("offset"));
  return {
    limit: Number.isInteger(n) && n > 0 ? Math.min(n, MAX_PAGE * 5) : defaultLimit,
    offset: Number.isInteger(o) && o > 0 ? o : 0,
  };
}
