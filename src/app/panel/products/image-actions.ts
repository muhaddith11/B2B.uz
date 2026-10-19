"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { render } from "@/lib/i18n";
import { getStaff, HttpError } from "@/lib/session";
import { prepareImage, releaseImage, storeUpload } from "@/lib/uploads";
import { panelT } from "../panel-lang";

export type ImageResult = { ok: true; name: string } | { ok: false; message: string };

async function editor() {
  const staff = await getStaff();
  return staff && ["ADMIN", "OPERATOR"].includes(staff.role) ? staff : null;
}

async function attach(staff: { id: string; distributorId: string }, productId: string, file: File): Promise<ImageResult> {
  const { lang, t } = await panelT();
  const product = await db.product.findFirst({ where: { id: productId, distributorId: staff.distributorId } });
  if (!product) return { ok: false, message: t("Tovar topilmadi") };
  try {
    const { url } = await storeUpload("products", await prepareImage(file));
    await db.product.update({ where: { id: product.id }, data: { imageUrl: url } });
    await db.auditLog.create({ data: { actor: `staff:${staff.id}`, action: "product.image", entity: "Product", entityId: product.id, after: { imageUrl: url } } });
    // Almashtirilgan eski rasm boshqa joyda ishlatilmasa ombordan tozalanadi
    await releaseImage(product.imageUrl);
  } catch (e) {
    return { ok: false, message: e instanceof HttpError ? render(e.text, lang) : t("Rasmni saqlab bo'lmadi") };
  }
  return { ok: true, name: product.name };
}

// Bitta tovarga rasm (jadval qatoridan)
export async function setProductImage(form: FormData): Promise<ImageResult> {
  const { t } = await panelT();
  const staff = await editor();
  if (!staff) return { ok: false, message: t("Ruxsat yo'q") };
  const file = form.get("image");
  if (!(file instanceof File) || file.size === 0) return { ok: false, message: t("Rasmni tanlang") };
  const result = await attach(staff, String(form.get("productId") ?? ""), file);
  if (result.ok) revalidatePath("/panel/products");
  return result;
}

// Ko'plab yuklash: fayl nomi (kengaytmasiz) tovar artikuli bilan bir xil bo'lsa, rasm o'sha tovarga qo'yiladi.
// Brauzer fayllarni bittadan yuboradi (bitta so'rov 4,5 MB dan oshmasin)
export async function setProductImageBySku(form: FormData): Promise<ImageResult> {
  const { t } = await panelT();
  const staff = await editor();
  if (!staff) return { ok: false, message: t("Ruxsat yo'q") };
  const file = form.get("image");
  if (!(file instanceof File) || file.size === 0) return { ok: false, message: t("Rasmni tanlang") };
  const sku = file.name.replace(/\.[^.]+$/, "").trim();
  const product = await db.product.findFirst({ where: { distributorId: staff.distributorId, sku: { equals: sku, mode: "insensitive" } } });
  if (!product) return { ok: false, message: t('"{sku}" artikulli tovar topilmadi', { sku }) };
  return attach(staff, product.id, file);
}

export async function removeProductImage(form: FormData): Promise<ImageResult> {
  const { t } = await panelT();
  const staff = await editor();
  if (!staff) return { ok: false, message: t("Ruxsat yo'q") };
  const product = await db.product.findFirst({ where: { id: String(form.get("productId") ?? ""), distributorId: staff.distributorId } });
  if (!product) return { ok: false, message: t("Tovar topilmadi") };
  await db.product.update({ where: { id: product.id }, data: { imageUrl: null } });
  await db.auditLog.create({ data: { actor: `staff:${staff.id}`, action: "product.image", entity: "Product", entityId: product.id, after: { imageUrl: null } } });
  await releaseImage(product.imageUrl);
  revalidatePath("/panel/products");
  return { ok: true, name: product.name };
}

// Ko'plab yuklash tugagach jadvalni yangilash
export async function refreshProducts(): Promise<void> {
  revalidatePath("/panel/products");
}
