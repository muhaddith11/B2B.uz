import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = { title: "Maxfiylik siyosati · Captar" };

const UPDATED = "2026-yil 13-oktabr";

// App Store va Google Play'ga shu sahifa manzili beriladi. Murojaat uchun: SUPPORT_EMAIL, SUPPORT_PHONE
export default function PrivacyPage() {
  const email = process.env.SUPPORT_EMAIL;
  const phone = process.env.SUPPORT_PHONE;
  return (
    <main className="mx-auto grid max-w-2xl gap-6 p-6 text-gray-900">
      <div>
        <h1 className="text-2xl font-semibold">Captar: maxfiylik siyosati</h1>
        <p className="mt-1 text-sm text-gray-500">Oxirgi yangilanish: {UPDATED}</p>
      </div>

      <Section title="Umumiy">
        <p>
          Captar: do'konlar, distribyutorlar va tovar egalari o'rtasida buyurtma, nasiya va to'lovlar uchun mobil ilova va veb-panel. Bu sahifada qanday ma'lumot
          yig'ilishi, nima uchun ishlatilishi va uni qanday o'chirish mumkinligi yozilgan.
        </p>
      </Section>

      <Section title="Qanday ma'lumot yig'iladi">
        <ul className="list-disc space-y-1 pl-5">
          <li>Telefon raqamingiz: SMS kod bilan kirish uchun.</li>
          <li>Ismingiz, do'kon yoki kompaniya nomi, manzil va tuman, ixtiyoriy ravishda STIR: hisobingiz va hamkorlaringiz sizni tanishi uchun.</li>
          <li>Buyurtmalar, nasiya (qarz) va to'lovlar, siz yuklagan to'lov cheki rasmlari, do'kon va distribyutor o'rtasidagi xabarlar.</li>
          <li>Bildirishnoma (push) tokeni: buyurtma va to'lov haqida xabar berish uchun.</li>
          <li>Kamera va galereya faqat siz chek rasmini yuklaganingizda ishlatiladi. Ilova joylashuvingizni avtomatik yig'maydi.</li>
        </ul>
        <p>Ilovada reklama yo'q, ma'lumotlaringiz reklama yoki kuzatish (tracking) uchun ishlatilmaydi va sotilmaydi.</p>
      </Section>

      <Section title="Ma'lumot nima uchun ishlatiladi">
        <ul className="list-disc space-y-1 pl-5">
          <li>Hisobingizga kirish va uni himoya qilish.</li>
          <li>Buyurtma berish, yetkazish, nasiya va to'lovlarni hisoblash.</li>
          <li>Do'konga distribyutor, distribyutorga tovar egasi topib berish.</li>
          <li>Buyurtma, to'lov va so'rovlar haqida bildirishnoma yuborish.</li>
        </ul>
      </Section>

      <Section title="Ma'lumot kim bilan ulashiladi">
        <ul className="list-disc space-y-1 pl-5">
          <li>Siz ulangan distribyutor: do'koningiz ma'lumoti, buyurtmalar, qarz va to'lovlar. Tovar egasi va distribyutor esa o'zaro kelishuv doirasidagi ma'lumotni ko'radi.</li>
          <li>
            Xizmat ko'rsatuvchilar, faqat xizmat uchun kerakli qismi: Vercel (server) va Neon (ma'lumotlar bazasi), ikkalasi Germaniyada (Frankfurt) joylashgan;
            TextUP (SMS kod); Payme va Click (onlayn to'lov, karta ma'lumotlari ular tomonida qoladi, bizga kelmaydi); Expo, Apple va Google (bildirishnomalar).
          </li>
          <li>Qonunda belgilangan hollarda vakolatli davlat organlariga.</li>
        </ul>
      </Section>

      <Section title="Saqlash muddati va xavfsizlik">
        <p>
          Ma'lumotlar hisobingiz faol bo'lgan davrda saqlanadi. SMS kodlar ochiq holda saqlanmaydi va bir necha daqiqada eskiradi. Server bilan aloqa HTTPS orqali
          shifrlangan.
        </p>
        <p>
          Hisob o'chirilganda ismingiz, telefon raqamingiz va bildirishnoma tokenlari o'chiriladi. Buyurtma, qarz va to'lov yozuvlari distribyutorning buxgalteriya
          hisobi uchun saqlanadi, lekin endi sizning ismingiz va raqamingiz bilan bog'lanmaydi.
        </p>
      </Section>

      <Section title="Hisobni o'chirish">
        <p>
          Ilovada: do'kon va tovar egasi uchun bosh sahifa pastida, distribyutor xodimi uchun «Ko'proq» bo'limida «Hisobni o'chirish». Ilova o'rnatilmagan bo'lsa:{" "}
          <Link href="/hisobni-ochirish" className="text-blue-600 underline">
            hisobni o'chirish sahifasi
          </Link>
          .
        </p>
      </Section>

      <Section title="Yosh chegarasi">
        <p>Captar biznes uchun mo'ljallangan va 18 yoshdan kichiklarga mo'ljallanmagan.</p>
      </Section>

      {(email || phone) && (
        <Section title="Murojaat">
          <p>
            Savollar va so'rovlar uchun: {email && <a href={`mailto:${email}`} className="text-blue-600 underline">{email}</a>}
            {email && phone && ", "}
            {phone}
          </p>
        </Section>
      )}

      <p className="text-sm text-gray-500">Siyosat o'zgarsa, shu sahifa yangilanadi va yuqoridagi sana o'zgaradi.</p>
    </main>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="grid gap-2 text-sm leading-6 text-gray-700">
      <h2 className="text-base font-semibold text-gray-900">{title}</h2>
      {children}
    </section>
  );
}
