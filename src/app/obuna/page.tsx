import type { Metadata } from "next";
import { formatSom } from "@/lib/money";
import { MONTH_OPTIONS, monthlyPrice, payableOrgs, platformClick, platformPayme, subscriptionLabel } from "@/lib/subscription";
import { paySubscription, requestSubscriptionCode, subscriptionLogout, verifySubscriptionCode } from "./actions";
import { subscriptionPhone } from "./session";

export const metadata: Metadata = { title: "Obuna · Captar" };
export const dynamic = "force-dynamic";

const KIND_LABEL = { distributor: "Distribyutor", shop: "Do'kon" } as const;
const STATE_STYLE = {
  ACTIVE: "border-line",
  GRACE: "border-warn/40",
  EXPIRED: "border-danger/40",
} as const;

// Obunani to'lash: distribyutor admini yoki do'kon egasi SMS kod bilan kiradi va Payme yoki Click orqali to'laydi.
// Ilovaning o'zida narx va to'lov tugmasi yo'q, faqat holat ko'rinadi.
export default async function SubscriptionPage({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const { phone, error, dev, qaytdi } = await searchParams;
  const [sessionPhone, price] = await Promise.all([subscriptionPhone(), monthlyPrice()]);
  const providers = [platformPayme() ? ("PAYME" as const) : null, platformClick() ? ("CLICK" as const) : null].filter((p) => p !== null);
  const orgs = sessionPhone ? await payableOrgs(sessionPhone) : [];
  const contact = [process.env.SUPPORT_PHONE, process.env.SUPPORT_EMAIL].filter(Boolean).join(", ");

  return (
    <main className="mx-auto grid max-w-md gap-5 p-6 text-ink">
      <h1 className="text-xl font-semibold">Captar obunasi</h1>
      <p className="text-sm text-ink">
        Har bir distribyutor va do'kon uchun alohida obuna: uning barcha xodimlari bitta obuna bilan ishlaydi. Qo'shilgan kundan 12 oy tekin, keyin oyiga{" "}
        <b>{formatSom(price)}</b>.
      </p>

      {qaytdi && (
        <p className="rounded-lg bg-accent-soft p-3 text-sm text-accent-ink">To'lov tizimi tasdiqlagach muddat avtomatik uzayadi, odatda bir necha soniyada. Sahifani yangilang.</p>
      )}
      {error && <p className="text-sm text-danger">{error}</p>}

      {!sessionPhone ? (
        !phone ? (
          <form action={requestSubscriptionCode} className="grid gap-3">
            <p className="text-sm text-hint">Distribyutor admini yoki do'kon egasining telefon raqami:</p>
            <input name="phone" placeholder="+998 90 123 45 67" inputMode="tel" className="field" />
            <button className="btn btn-primary">Kod olish</button>
          </form>
        ) : (
          <form action={verifySubscriptionCode} className="grid gap-3">
            <input type="hidden" name="phone" value={phone} />
            <p className="text-sm text-hint">{phone} raqami distribyutor admini yoki do'kon egasiga tegishli bo'lsa, unga SMS kod yuborildi.</p>
            {dev && <p className="text-sm text-accent-ink">Sinov rejimi: kod {dev}</p>}
            <input name="code" inputMode="numeric" maxLength={6} placeholder="SMS kod" className="field" />
            <button className="btn btn-primary">Kirish</button>
          </form>
        )
      ) : (
        <>
          {orgs.length === 0 && <p className="text-sm text-hint">Bu raqam bilan distribyutor admini yoki do&apos;kon egasi hisobi topilmadi.</p>}
          {orgs.map((o) => (
            <section key={`${o.kind}:${o.id}`} className={`grid gap-3 rounded-xl border bg-card p-4 ${STATE_STYLE[o.state]}`}>
              <div>
                <div className="text-xs text-hint">{KIND_LABEL[o.kind]}</div>
                <div className="font-semibold">{o.name}</div>
                <div className={`text-sm ${o.state === "ACTIVE" ? "text-hint" : o.state === "GRACE" ? "text-warn" : "text-danger"}`}>{subscriptionLabel(o)}</div>
              </div>
              {providers.length > 0 ? (
                <form action={paySubscription} className="grid gap-2">
                  <input type="hidden" name="kind" value={o.kind} />
                  <input type="hidden" name="id" value={o.id} />
                  <select name="months" defaultValue="12" className="field">
                    {MONTH_OPTIONS.map((m) => (
                      <option key={m} value={m}>
                        {m} oy · {formatSom(price * m)}
                      </option>
                    ))}
                  </select>
                  <div className="text-xs text-hint">To'lash:</div>
                  <div className="flex gap-2">
                    {providers.map((p) => (
                      <button key={p} name="provider" value={p} className="flex-1 btn btn-primary">
                        {p === "PAYME" ? "Payme" : "Click"}
                      </button>
                    ))}
                  </div>
                </form>
              ) : (
                <p className="text-sm text-hint">Onlayn to'lov hozircha ulanmagan.{contact ? ` To'lov uchun murojaat: ${contact}` : ""}</p>
              )}
            </section>
          ))}
          {contact && <p className="text-sm text-hint">Bank orqali (pul o'tkazmasi bilan) to'lash uchun: {contact}</p>}
          <form action={subscriptionLogout}>
            <button className="text-sm text-hint underline">Chiqish ({sessionPhone})</button>
          </form>
        </>
      )}
    </main>
  );
}
