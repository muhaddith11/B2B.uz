import type { Metadata } from "next";
import Link from "next/link";
import { confirmDeletion, requestDeletionCode } from "./actions";

export const metadata: Metadata = { title: "Hisobni o'chirish · Captar" };
export const dynamic = "force-dynamic";

// Ilovani o'chirib yuborgan foydalanuvchi ham hisobini shu yerdan o'chira oladi (Google Play talabi)
export default async function DeleteAccountPage({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const { phone, error, dev, done } = await searchParams;
  return (
    <main className="mx-auto grid max-w-md gap-5 p-6 text-gray-900">
      <h1 className="text-xl font-semibold">Captar: hisobni o'chirish</h1>

      {done ? (
        <p className="rounded-lg bg-green-50 p-3 text-sm text-green-800">
          Hisobingiz o'chirildi ({done} ta). Bu raqam bilan endi kira olmaysiz. Xohlasangiz, istalgan vaqtda qaytadan ro'yxatdan o'tishingiz mumkin.
        </p>
      ) : (
        <>
          <div className="grid gap-2 text-sm text-gray-700">
            <p>Telefon raqamingizga bog'langan barcha Captar hisoblari (do'kon, distribyutor xodimi, tovar egasi) o'chiriladi.</p>
            <p>
              <b>O'chiriladi:</b> ismingiz, telefon raqamingiz, bildirishnoma tokenlari. Siz bu hisob bilan boshqa kira olmaysiz.
            </p>
            <p>
              <b>Saqlanadi:</b> buyurtma, qarz va to'lov yozuvlari. Ular distribyutorning buxgalteriya hisobi uchun qonun bo'yicha kerak, lekin endi sizning
              ismingiz va raqamingiz bilan bog'lanmaydi.
            </p>
          </div>

          {error && <p className="text-sm text-red-600">{error}</p>}

          {!phone ? (
            <form action={requestDeletionCode} className="grid gap-3">
              <input name="phone" placeholder="+998 90 123 45 67" inputMode="tel" className="rounded-lg border border-gray-300 px-3 py-2" />
              <button className="rounded-lg bg-blue-600 py-2 font-medium text-white">Kod olish</button>
            </form>
          ) : (
            <form action={confirmDeletion} className="grid gap-3">
              <input type="hidden" name="phone" value={phone} />
              <p className="text-sm text-gray-600">{phone} raqamiga SMS kod yuborildi.</p>
              {dev && <p className="text-sm text-blue-600">Sinov rejimi: kod {dev}</p>}
              <input name="code" inputMode="numeric" maxLength={6} placeholder="SMS kod" className="rounded-lg border border-gray-300 px-3 py-2" />
              <label className="flex items-start gap-2 text-sm">
                <input type="checkbox" name="confirm" className="mt-1" />
                <span>Hisobim butunlay o'chirilishiga roziman. Buni qaytarib bo'lmaydi.</span>
              </label>
              <button className="rounded-lg bg-red-600 py-2 font-medium text-white">Hisobni o'chirish</button>
            </form>
          )}
        </>
      )}

      <Link href="/maxfiylik" className="text-sm text-blue-600 underline">
        Maxfiylik siyosati
      </Link>
    </main>
  );
}
