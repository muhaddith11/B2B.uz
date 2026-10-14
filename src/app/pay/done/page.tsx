// Payme yoki Click to'lov sahifasidan qaytish manzili. Ilova tili bu yerga kelmaydi, shuning uchun ikkala tilda
export default function PayDone() {
  return (
    <main className="mx-auto flex min-h-dvh max-w-md flex-col items-center justify-center gap-6 p-6 text-center">
      <div className="flex size-16 items-center justify-center rounded-full bg-ok-soft text-3xl text-ok" aria-hidden>
        ✓
      </div>
      <div className="grid gap-2">
        <h1 className="text-xl font-bold">To'lov yuborildi</h1>
        <p className="text-hint">To'lov tizimi tasdiqlagach, summa qarzingizdan ayiriladi. Ilovaga qayting.</p>
      </div>
      <div className="grid gap-2" lang="ru">
        <h2 className="text-lg font-semibold">Платёж отправлен</h2>
        <p className="text-hint">Когда платёжная система подтвердит оплату, сумма будет списана с долга. Вернитесь в приложение.</p>
      </div>
    </main>
  );
}
