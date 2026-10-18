# Hissa qo'shish va ish tartibi

## Branch va pull request

1. `main` himoyalangan: unga to'g'ridan-to'g'ri push qilinmaydi. Har bir o'zgarish alohida branchda (`feat/...`, `fix/...`) va pull request orqali.
2. Pull request ochilganda CI (typecheck, lint, testlar, qamrov chegarasi, migratsiya mosligi, build) ishlaydi va Vercel preview deploy beradi.
3. CI yashil va kamida bitta ko'rib chiqish (review) bo'lsa birlashtiriladi (**Squash and merge**: `main` tarixida har PR bitta commit).
4. `main` ga birlashtirilgach Vercel production'ga avtomatik deploy qiladi va migratsiyalarni qo'llaydi.

GitHub'da bir marta sozlanadi (Settings → Branches → Add rule, `main`): *Require a pull request before merging*, *Require status checks to pass* (CI: Server, Mobil ilova), *Do not allow bypassing*.

## Commit

Qisqa, buyruq shaklida, bitta mantiqiy o'zgarish: `Nasiya: tasdiqlanmagan do'konga faqat naqd`. Katta ishni bir nechta commitga bo'ling: ko'rib chiqish va `git bisect` oson bo'ladi.

## Lokal tekshiruv (push'dan oldin)

```bash
npm run typecheck && npm run lint && npm test && npm run test:int
```

Mobil ilova o'zgargan bo'lsa:

```bash
cd mobile && npm run typecheck && npx eslint src --max-warnings=0
```

## Qoidalar

- **Pul:** qarz daftari faqat yangi yozuv bilan o'zgaradi (tuzatish ham yozuv). Pul oqimiga tegadigan har o'zgarish haqiqiy bazada integratsiya testi bilan.
- **Ma'lumotlar bazasi:** `schema.prisma` o'zgarsa, migratsiya `npx prisma migrate dev --name <nom>` bilan yaratiladi va commitga qo'shiladi (CI moslikni tekshiradi). Ustun o'chirish yoki nomini o'zgartirish ikki bosqichda: avval kod eski ustunni ishlatmaydigan qilinadi va deploy qilinadi, keyin migratsiya.
- **API:** mobil ilovaning eski versiyalari do'konlarda qoladi. Javobdan maydon olib tashlamang va ma'nosini o'zgartirmang: yangi maydon qo'shing.
- **Matnlar:** foydalanuvchi ko'radigan har matn o'zbek va rus tilida (`src/lib/i18n-ru.ts`, `mobile/src/lib/i18n-ru.ts`; testlar yetishmaganini topadi).
- **Xatolar:** kutilgan xato `HttpError` bilan (foydalanuvchiga matn), kutilmagani `reportError` orqali monitoringga.
- **Sirlar:** kalit, parol va tokenlar faqat muhit o'zgaruvchisida; kodga, logga va testga yozilmaydi.

## Reliz

`CHANGELOG.md` ga o'zgarish yoziladi. Mobil ilova versiyasi `mobile/app.json` (`version`) da oshiriladi, build EAS orqali (mobile/README.md).
