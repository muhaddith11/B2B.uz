import { HttpError } from "./session";

// Tovar egasi (ishlab chiqaruvchi) qismi hozircha yopiq (2026-10-22 qarori): ro'yxatdan o'tish, kirish, kelishuv va xaridlar.
// Kod va ma'lumot saqlanadi; qayta ochish uchun BRANDS_ENABLED=1 (mobil ilovada ham src/lib/features.ts)
export function brandsEnabled(): boolean {
  return process.env.BRANDS_ENABLED === "1";
}

export function assertBrandsEnabled() {
  if (!brandsEnabled()) throw new HttpError(404, "Bu bo'lim hozircha yopiq");
}
