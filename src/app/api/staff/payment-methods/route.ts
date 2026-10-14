import { z } from "zod";
import { encryptSecret } from "@/lib/crypto";
import { db } from "@/lib/db";
import { publicUrl } from "@/lib/checkout";
import { handle, HttpError, requireStaff } from "@/lib/session";

// To'lov usullari: karta, hisob raqam, Payme, Click. Kalitlar shifrlanadi va hech qachon qaytarilmaydi.
export const GET = handle(async (req: Request) => {
  const staff = await requireStaff(req, ["ADMIN"]);
  const methods = await db.paymentMethod.findMany({ where: { distributorId: staff.distributorId }, orderBy: [{ active: "desc" }, { createdAt: "asc" }] });
  return Response.json({
    methods: methods.map((m) => ({
      id: m.id,
      type: m.type,
      number: m.number,
      holder: m.holder,
      bankMfo: m.bankMfo,
      inn: m.inn,
      merchantId: m.merchantId,
      serviceId: m.serviceId,
      hasKey: Boolean(m.secretKeyEnc),
      isPrimary: m.isPrimary,
      active: m.active,
      // To'lov tizimi kabinetiga kiritiladigan manzil
      callbackUrl:
        m.type === "PAYME" ? `${publicUrl()}/api/payments/payme/${m.id}` : m.type === "CLICK" ? `${publicUrl()}/api/payments/click/${m.id}/` : null,
    })),
  });
});

const methodInput = z.discriminatedUnion("type", [
  z.object({ type: z.literal("CARD"), number: z.string().regex(/^\d{16}$/, "Karta raqami 16 xonali"), holder: z.string().trim().min(2).max(100) }),
  z.object({
    type: z.literal("BANK_ACCOUNT"),
    number: z.string().regex(/^\d{20}$/, "Hisob raqami 20 xonali"),
    holder: z.string().trim().min(2).max(150),
    bankMfo: z.string().regex(/^\d{5}$/, "MFO 5 xonali"),
    inn: z.string().regex(/^\d{9}$/, "STIR 9 xonali"),
  }),
  z.object({ type: z.literal("PAYME"), merchantId: z.string().trim().min(5).max(100), secretKey: z.string().min(5).max(200) }),
  z.object({ type: z.literal("CLICK"), merchantId: z.string().trim().min(1).max(50), serviceId: z.string().trim().min(1).max(50), secretKey: z.string().min(5).max(200) }),
]);

export const POST = handle(async (req: Request) => {
  const staff = await requireStaff(req, ["ADMIN"]);
  const body = await req.json().catch(() => null);
  if (body && typeof body.number === "string") body.number = body.number.replace(/\s/g, "");
  const parsed = methodInput.safeParse(body);
  if (!parsed.success) throw new HttpError(400, parsed.error.issues[0]?.message ?? "Ma'lumotlar noto'g'ri");
  const input = parsed.data;
  const hasPrimary = await db.paymentMethod.count({ where: { distributorId: staff.distributorId, active: true, isPrimary: true } });
  const created = await db.paymentMethod.create({
    data: {
      distributorId: staff.distributorId,
      type: input.type,
      isPrimary: hasPrimary === 0,
      ...(input.type === "CARD" ? { number: input.number, holder: input.holder } : {}),
      ...(input.type === "BANK_ACCOUNT" ? { number: input.number, holder: input.holder, bankMfo: input.bankMfo, inn: input.inn } : {}),
      ...(input.type === "PAYME" ? { merchantId: input.merchantId, secretKeyEnc: encryptSecret(input.secretKey) } : {}),
      ...(input.type === "CLICK" ? { merchantId: input.merchantId, serviceId: input.serviceId, secretKeyEnc: encryptSecret(input.secretKey) } : {}),
    },
  });
  await db.auditLog.create({ data: { actor: `staff:${staff.id}`, action: "payment_method.created", entity: "PaymentMethod", entityId: created.id, after: { type: input.type } } });
  return Response.json({ id: created.id });
});
