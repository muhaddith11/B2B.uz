---
version: 1
slug: "mobile-src-app"
primary_target: "mobile/src/app"
related_targets: []
---

# Captar mobil ilovasi (Expo): Atlas dunyosi

## Scope

Mode: Operate. Butun mobil ilova (do'kon, distribyutor xodimi, tovar egasi). 2026-10-15 foydalanuvchi qarori: odatiy (canon) ko'rinish o'rniga Captar'ning o'z dunyosi ("butun ko'rinish yangi"), tanlov sahifasida "Atlas (abr)" tanlandi. Shu bilan birga rasmlar: do'kon surati, distribyutor va tovar egasi logosi, har bir shaxsning avatari, tovar rasmi.

Users: do'konchi peshtaxta orqasida, agent ko'chada tik turib, operator omborda, tovar egasi ofisda. Telefonlar aralash, yosh va tajriba aralash.

Constraints: o'zbek va rus tili (rus matni 20-30% uzun); tizim shrift o'lchami; iOS va Android bitta uslub, OS kafolatlari saqlanadi; navigatsiya va boshqaruv elementlari platformaning odatiy elementlari (dunyo faqat shrift, rang, zichlik va bitta imzo harakatini beradi); "rasmiy va sovuq" ham, "o'yinchoq kabi rang-barang" ham emas.

Unresolved: haqiqiy logo (vaqtinchalik "C"); haqiqiy telefonda tekshirish.

## Direction contract

THESIS: Captar savdoni to'quv kabi ko'rsatadi: har buyurtma, nasiya limiti va obuna muddati bitta abr chizig'i, bosqich o'tgan sari bo'yoq iplar uchida bulutdek yoyilib oldinga suriladi. Rad etadi: oq kartochka va bitta ko'k tugmali to'lov ilovasi kanoni, unda Captar boshqa ilovalardan ajralmaydi.

OWN-WORLD: Marg'ilon atlasi, cheklangan bo'yoq bilan. To'q indigo ipak (#23205C) bosh sahifalar tepasidagi tasma va asosiy tugma; malina (#D11F5E) faqat "hozirgi" narsa uchun (joriy bosqich, faol tab, tanlangan); za'faron (#F2B705) faqat indigo tasma ustidagi limit bo'yog'i; yer ipak-oq (#F6F5FA), siyoh #17152E. Holatlar o'z ohangida (yo'lda amber, topshirildi yashil, rad qizil). Unbounded faqat summa va sarlavhada, to'rt o'lchamda; matn Golos Text. Tashkilot rasmi yumaloq kvadrat plitka, odam rasmi doira; rasm bo'lmasa bo'yoq rangidagi plitkada bosh harf.

STORY: do'konchi ochganda indigo tasmada o'z do'koni surati, qarzi va limitidan qancha bo'yalganini ko'radi; yo'ldagi buyurtmalarda distribyutor logosi va bitta joyda turadigan abr chizig'i; bosqich o'tganda bo'yoq oldinga yoyiladi. Agent do'kon oldida surat qo'yadi, operator yangi buyurtmani bitta amal bilan qabul qiladi.

FIRST VIEWPORT: (do'konchi bosh sahifasi) indigo tasma, pastki burchaklari 28 pt: chapda do'kon surati (doira, oq halqa), nomi va manzili, o'ngda qo'ng'iroq; "Umumiy qarz" va Unbounded 34 pt summa; ostida 14 pt abr chizig'i (za'faron iplar, uchlari pog'onali), "Limit · Qoldi"; ikki tugma (oq "Qarzni to'lash", indigo-2 "Distribyutor topish"). Ostida "Yo'ldagi buyurtmalar": oq kartochkalar, chapda distribyutor logosi, o'ngda Unbounded summa, ostida 4 bo'lakli abr holat chizig'i va bosqich nomlari vaqti bilan, joriy bosqich malina. Pastda oq tab bar, faol tab malina va kichik abr chiziq. Imzo harakati: holat o'zgarganda joriy bo'lak bo'yog'i iplar bo'ylab birin-ketin yoyiladi (Reanimated, kamaytirilgan harakatda yo'q).

FORM: Atlas (abr), tartib ro'yxatimda 7-o'rin, seed cbe401a8 (birinchi qo'l, tanlov ikkinchi qo'lda oldingi kartalar bilan yonma-yon qilingan). Ko'tarishlar: bitta ajratilgan rang (malina faqat hozirgi narsa), halol sig'im (limit va muddat qolgani doim raqamda), bir joyda turish (abr chizig'i har kartochka va sahifada aynan bir joyda), zichlik jasorati (rasmli katalog butun kataklar to'ri, rasmsiz tovar ixcham qator), bitta yuz qat'iy pog'onalarda (Unbounded 15/18/24/34).

FINISH: unreviewed and undocumented is unfinished; this build ends with the finish review, the verdict, DESIGN.md, and every shipping raster carrying its provenance
