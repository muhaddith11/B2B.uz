import type { Prisma } from "@prisma/client";
import { z } from "zod";
import { HttpError } from "./session";
import { verifyToken } from "./token";

// Bitta raqamdan ro'yxatdan o'tish navbat bilan: ikki marta bosilganda ikkinchi so'rov birinchisi yaratgan hisobni topadi
export async function lockRegistration(tx: Prisma.TransactionClient, phone: string) {
  await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${`register:${phone}`}))`;
}

// Mobil ilovada ro'yxatdan o'tish: raqam SMS kod bilan tasdiqlangan bo'lishi kerak (phoneToken)
export function phoneFromToken(phoneToken: string | undefined): string {
  const payload = verifyToken(phoneToken);
  if (payload?.kind !== "phone") throw new HttpError(401, "Kod muddati o'tdi. Qaytadan kiring");
  return payload.phone;
}

const list = z.array(z.string().trim().min(2).max(100)).max(50);

export const distributorRegistration = z.object({
  phoneToken: z.string(),
  companyName: z.string().trim().min(2).max(150),
  inn: z.string().trim().regex(/^\d{9}$/, "STIR 9 xonali bo'lsin").optional().or(z.literal("")),
  districts: list.min(1),
  categories: list.min(1),
  adminName: z.string().trim().min(2).max(100),
});

export const brandRegistration = z.object({
  phoneToken: z.string(),
  brandName: z.string().trim().min(2).max(150),
  inn: z.string().trim().regex(/^\d{9}$/, "STIR 9 xonali bo'lsin").optional().or(z.literal("")),
  categories: list.min(1),
  description: z.string().trim().max(1000).optional(),
  contactName: z.string().trim().min(2).max(100),
});
