import { Prisma, type ReminderStage } from "@prisma/client";
import { db } from "./db";
import { formatDate } from "./money";
import { normalizePhone } from "./phone";
import { sendSms } from "./sms";
import { GRACE_DAYS, subscriptionState, WARN_DAYS } from "./subscription";
import { DAY_MS } from "./time";

// Obuna eslatmasi SMS orqali: har kuni bir marta (Vercel Cron, /api/cron/subscription-reminders).
// Distribyutor adminiga va do'kon egasiga, har bosqichda bir marta: muddat tugashiga 14 kun qolganda,
// muddat tugaganda (imtiyoz davri) va yangi buyurtmalar yopilganda.

// TextUP'da tasdiqlangan shablonlar (2026-10-20). Matn bir harf farq qilsa ham SMS ketmaydi:
// o'zgartirsangiz, avval TextUP kabinetida yangi matnni tasdiqlating. Havola ham shablonning bir qismi
export const REMINDER_TEMPLATES: Record<ReminderStage, string> = {
  SOON: "Captar ilovasi: {name} obunasi {date} da tugaydi. Uzaytirish: b2b-uz.vercel.app/obuna",
  GRACE: "Captar ilovasi: {name} obunasi muddati tugadi. {date} dan yangi buyurtmalar yopiladi. To'lov: b2b-uz.vercel.app/obuna",
  EXPIRED: "Captar ilovasi: {name} obunasi to'lanmagani uchun yangi buyurtmalar yopildi. To'lov: b2b-uz.vercel.app/obuna",
};

// TextUP kabinetidagi shablon ID'si (talab qilsa): TEXTUP_TEMPLATE_SOON, TEXTUP_TEMPLATE_GRACE, TEXTUP_TEMPLATE_EXPIRED
const templateId = (stage: ReminderStage) => process.env[`TEXTUP_TEMPLATE_${stage}`] || undefined;

// Yopilganiga shuncha kundan ko'p bo'lgan tashkilotga eslatma yuborilmaydi (ishlamay qolgan tashkilotni bezovta qilmaslik)
const EXPIRED_NOTICE_DAYS = 30;
// Bir ishga tushirishda shundan ortiq SMS yuborilmaydi: xato bo'lsa ham balans bir kunda tugab qolmasin
export const MAX_SMS_PER_RUN = 300;
// Nom uzun bo'lsa qisqartiriladi: SMS bitta bo'lagiga (160 belgi) sig'sin
const MAX_NAME = 36;

export function reminderStage(paidUntil: Date, now = new Date()): ReminderStage | null {
  const state = subscriptionState(paidUntil, now);
  if (state === "EXPIRED") {
    const blocksAt = paidUntil.getTime() + GRACE_DAYS * DAY_MS;
    return now.getTime() - blocksAt <= EXPIRED_NOTICE_DAYS * DAY_MS ? "EXPIRED" : null;
  }
  if (state === "GRACE") return "GRACE";
  return paidUntil.getTime() - now.getTime() <= WARN_DAYS * DAY_MS ? "SOON" : null;
}

// Nom SMS uchun: o'zbekcha apostrof turlari oddiy ' ga (aks holda SMS qimmatroq kodlashda ketadi), ortiqcha bo'sh joysiz, qisqa
export function smsName(name: string): string {
  const clean = name.replace(/[‘’ʻʼ`´]/g, "'").replace(/\s+/g, " ").trim();
  return clean.length > MAX_NAME ? `${clean.slice(0, MAX_NAME - 3).trimEnd()}...` : clean;
}

export function reminderText(stage: ReminderStage, org: { name: string; paidUntil: Date }): string {
  // Imtiyoz davrida: yangi buyurtmalar yopiladigan kun; oldin: muddat tugaydigan kun
  const date = stage === "GRACE" ? new Date(org.paidUntil.getTime() + GRACE_DAYS * DAY_MS) : org.paidUntil;
  return REMINDER_TEMPLATES[stage].replace("{name}", smsName(org.name)).replace("{date}", formatDate(date));
}

type Org = { kind: "distributor" | "shop"; id: string; name: string; paidUntil: Date; phones: string[] };

export async function sendSubscriptionReminders(now = new Date()) {
  const horizon = new Date(now.getTime() + WARN_DAYS * DAY_MS);
  const since = new Date(now.getTime() - (GRACE_DAYS + EXPIRED_NOTICE_DAYS) * DAY_MS);
  const window = { paidUntil: { lte: horizon, gt: since } };
  const [distributors, shops] = await Promise.all([
    // Tasdiqlanmagan distribyutor savdo qilmaydi: unga obuna eslatmasi kerak emas
    db.distributor.findMany({
      where: { status: "ACTIVE", ...window },
      select: { id: true, name: true, paidUntil: true, staff: { where: { role: "ADMIN", active: true }, select: { phone: true } } },
    }),
    db.shop.findMany({ where: window, select: { id: true, name: true, paidUntil: true, users: { where: { role: "OWNER" }, select: { phone: true } } } }),
  ]);
  // App Store va Google Play tekshiruvchisining demo raqamiga SMS yuborilmaydi
  const review = normalizePhone(process.env.REVIEW_PHONE ?? "");
  const orgs: Org[] = [
    ...distributors.map((d) => ({ kind: "distributor" as const, id: d.id, name: d.name, paidUntil: d.paidUntil, phones: d.staff.map((s) => s.phone) })),
    ...shops.map((s) => ({ kind: "shop" as const, id: s.id, name: s.name, paidUntil: s.paidUntil, phones: s.users.map((u) => u.phone) })),
  ].map((o) => ({ ...o, phones: [...new Set(o.phones)].filter((p) => p !== review) }));

  const result = { sent: 0, failed: 0, skipped: 0 };
  for (const org of orgs) {
    const stage = reminderStage(org.paidUntil, now);
    if (!stage || org.phones.length === 0) continue;
    if (result.sent + org.phones.length > MAX_SMS_PER_RUN) {
      result.skipped++;
      continue;
    }
    // Avval yozuv: shu bosqich allaqachon yuborilgan bo'lsa (yoki parallel ishga tushirish yubormoqda bo'lsa), o'tkaziladi
    const key = { orgKind: org.kind, orgId: org.id, stage, paidUntil: org.paidUntil };
    try {
      await db.subscriptionReminder.create({ data: key });
    } catch (e) {
      if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002") continue;
      throw e;
    }
    const text = reminderText(stage, org);
    let delivered = 0;
    for (const phone of org.phones) {
      try {
        await sendSms(phone, text, { notice: { name: "Obuna eslatmasi", templateId: templateId(stage) } });
        delivered++;
      } catch (e) {
        console.error(`Obuna eslatmasi yuborilmadi (${org.kind} ${org.id}):`, e);
      }
    }
    result.sent += delivered;
    if (delivered === 0) {
      // Hech kimga ketmadi (masalan, TextUP balansi tugagan): yozuv o'chiriladi, ertaga qayta urinadi
      result.failed++;
      await db.subscriptionReminder.delete({ where: { orgKind_orgId_stage_paidUntil: key } });
    }
  }
  return result;
}
