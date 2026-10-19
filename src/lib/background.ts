import { after } from "next/server";

// Javob qaytgandan keyin bajariladigan ish (push, xato hisoboti). Vercel'da funksiya javobdan keyin to'xtatilishi mumkin,
// shuning uchun after() platformaga bu ish tugashini kutishni aytadi. So'rovdan tashqarida (skript, test, instrumentation)
// after() ishlamaydi: unda ish darhol boshlanadi. Xato asosiy amalni to'xtatmaydi: onError ga beriladi
export function runAfterResponse(task: () => Promise<void>, onError: (e: unknown) => void): void {
  const run = () => task().catch(onError);
  try {
    after(run);
  } catch {
    void run();
  }
}
