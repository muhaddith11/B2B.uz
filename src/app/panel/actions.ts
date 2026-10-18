"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import type { OrderStatus } from "@prisma/client";
import { approveInput, approveLink, rejectLink } from "@/lib/links";
import { render } from "@/lib/i18n";
import { changeOrderStatus } from "@/lib/orders";
import { reportError } from "@/lib/monitoring";
import { getStaff, HttpError } from "@/lib/session";
import { panelT } from "./panel-lang";

// Amal bajarilmasa (masalan, buyurtmani boshqa xodim allaqachon qabul qilgan) sahifaga sababi bilan qaytamiz:
// production'da server xatosining matni ko'rinmaydi, shuning uchun xato sahifasi o'rniga xabar ko'rsatiladi
async function run(page: string, task: () => Promise<void>) {
  const { lang, t } = await panelT();
  let error: string | null = null;
  try {
    await task();
  } catch (e) {
    if (!(e instanceof HttpError)) reportError(e, { area: "panel" });
    error = e instanceof HttpError ? render(e.text, lang) : t("Amalni bajarib bo'lmadi. Qayta urinib ko'ring");
  }
  revalidatePath("/panel", "layout");
  if (error) redirect(`${page}?${new URLSearchParams({ error })}`);
}

async function move(orderId: string, to: OrderStatus, rejectReason?: string) {
  await run("/panel/orders", async () => {
    const staff = await getStaff();
    if (!staff || !["ADMIN", "OPERATOR"].includes(staff.role)) throw new HttpError(403, "Ruxsat yo'q");
    await changeOrderStatus(staff, orderId, to, { rejectReason });
  });
}

export async function acceptOrder(form: FormData) {
  await move(String(form.get("orderId")), "ACCEPTED");
}

export async function rejectOrder(form: FormData) {
  const reason = String(form.get("reason") ?? "").trim();
  await move(String(form.get("orderId")), "REJECTED", reason || "Sabab ko'rsatilmagan");
}

export async function shipOrder(form: FormData) {
  await move(String(form.get("orderId")), "IN_DELIVERY");
}

export async function deliverOrder(form: FormData) {
  await move(String(form.get("orderId")), "DELIVERED");
}

// Ulanish so'rovlari: narx guruhi va nasiya shartlarini faqat admin belgilaydi
async function requireAdmin() {
  const staff = await getStaff();
  if (!staff || staff.role !== "ADMIN") throw new HttpError(403, "Ruxsat yo'q");
  return staff;
}

export async function approveLinkRequest(form: FormData) {
  await run("/panel/requests", async () => {
    const staff = await requireAdmin();
    const digits = (key: string) => String(form.get(key) ?? "").replace(/\D/g, "") || "0";
    const parsed = approveInput.safeParse({
      linkId: form.get("linkId"),
      priceGroupId: form.get("priceGroupId"),
      creditLimit: digits("creditLimit"),
      creditDays: digits("creditDays"),
    });
    if (!parsed.success) throw new HttpError(400, "Nasiya limiti yoki muddati noto'g'ri");
    await approveLink(staff, parsed.data);
  });
}

export async function rejectLinkRequest(form: FormData) {
  await run("/panel/requests", async () => {
    const staff = await requireAdmin();
    await rejectLink(staff, String(form.get("linkId")));
  });
}
