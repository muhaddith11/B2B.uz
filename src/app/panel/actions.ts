"use server";

import { revalidatePath } from "next/cache";
import { approveInput, approveLink, rejectLink } from "@/lib/links";
import { changeOrderStatus } from "@/lib/orders";
import { getStaff } from "@/lib/session";
import type { OrderStatus } from "@prisma/client";

async function move(orderId: string, to: OrderStatus, rejectReason?: string) {
  const staff = await getStaff();
  if (!staff || !["ADMIN", "OPERATOR"].includes(staff.role)) throw new Error("Ruxsat yo'q");
  await changeOrderStatus(staff, orderId, to, { rejectReason });
  revalidatePath("/panel", "layout");
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
  if (!staff || staff.role !== "ADMIN") throw new Error("Ruxsat yo'q");
  return staff;
}

export async function approveLinkRequest(form: FormData) {
  const staff = await requireAdmin();
  const digits = (key: string) => String(form.get(key) ?? "").replace(/\D/g, "") || "0";
  const parsed = approveInput.safeParse({
    linkId: form.get("linkId"),
    priceGroupId: form.get("priceGroupId"),
    creditLimit: digits("creditLimit"),
    creditDays: digits("creditDays"),
  });
  if (!parsed.success) throw new Error("Ma'lumotlar noto'g'ri");
  await approveLink(staff, parsed.data);
  revalidatePath("/panel", "layout");
}

export async function rejectLinkRequest(form: FormData) {
  const staff = await requireAdmin();
  await rejectLink(staff, String(form.get("linkId")));
  revalidatePath("/panel", "layout");
}
