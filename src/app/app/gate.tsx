"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { useShop, type RegisterFields } from "./shop-context";

// Kirish holatiga qarab: yuklanmoqda, sinov rejimida do'kon tanlash yoki ilovaning o'zi
export function Gate({ children }: { children: React.ReactNode }) {
  const { status, error } = useShop();

  if (status === "loading") return <p className="p-6 text-center text-app-hint">Yuklanmoqda…</p>;
  if (status === "dev-login") return <DevLogin />;
  if (status === "needs-registration") return <Register />;
  if (status === "error") return <p className="p-6 text-center text-app-danger">{error}</p>;
  return <>{children}</>;
}

function DevLogin() {
  const { loginAsDev, startRegistration } = useShop();
  const [users, setUsers] = useState<{ id: string; name: string; shop: string }[] | null>(null);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/auth/dev")
      .then((r) => r.json())
      .then((d) => (d.users ? setUsers(d.users) : setErr("Sinov rejimi o'chirilgan. Ilovani Telegram ichida oching.")))
      .catch(() => setErr("Server bilan aloqa yo'q"));
  }, []);

  return (
    <div className="mx-auto max-w-md p-6">
      <h1 className="text-lg font-semibold">Sinov rejimi</h1>
      <p className="mt-1 text-sm text-app-hint">Telegram tashqarisida ochildi. Qaysi do'kon nomidan kirasiz?</p>
      {err && <p className="mt-4 text-app-danger">{err}</p>}
      <div className="mt-4 grid gap-2">
        {users?.map((u) => (
          <button
            key={u.id}
            onClick={() => loginAsDev(u.id).catch((e) => setErr(e.message))}
            className="rounded-xl bg-app-card px-4 py-3 text-left"
          >
            <div className="font-medium">{u.shop}</div>
            <div className="text-sm text-app-hint">{u.name}</div>
          </button>
        ))}
        {users && (
          <button onClick={startRegistration} className="rounded-xl border border-dashed border-app-hint/40 px-4 py-3 text-left">
            <div className="font-medium text-app-accent">+ Yangi do'kon ochish</div>
            <div className="text-sm text-app-hint">Agentsiz ro'yxatdan o'tish</div>
          </button>
        )}
      </div>
    </div>
  );
}

// Yangi do'kon o'zi ro'yxatdan o'tadi, so'ng distribyutor topish sahifasiga o'tadi
function Register() {
  const { register, inTelegram, firstName, cancelRegistration } = useShop();
  const router = useRouter();
  const [form, setForm] = useState<RegisterFields>({ shopName: "", address: "", district: "", ownerName: firstName, phone: "+998" });
  const [districts, setDistricts] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/auth/register")
      .then((r) => r.json())
      .then((d) => setDistricts(d.districts ?? []))
      .catch(() => {});
  }, []);

  const field = (key: keyof RegisterFields, label: string, props: React.InputHTMLAttributes<HTMLInputElement> = {}) => (
    <label className="block">
      <span className="text-sm text-app-hint">{label}</span>
      <input
        {...props}
        value={form[key]}
        onChange={(e) => setForm({ ...form, [key]: e.target.value })}
        required
        className="mt-1 w-full rounded-xl bg-app-card px-3 py-2.5 outline-none"
      />
    </label>
  );

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setErr(null);
    try {
      await register(form);
      router.push("/app/find");
    } catch (x) {
      setErr((x as Error).message);
      setBusy(false);
    }
  }

  return (
    <form onSubmit={submit} className="mx-auto grid max-w-md gap-3 p-6">
      <div>
        <h1 className="text-lg font-semibold">Do'koningizni ro'yxatdan o'tkazing</h1>
        <p className="mt-1 text-sm text-app-hint">So'ng hududingizdagi distribyutorlarni topib, ulanish so'rovini yuborasiz.</p>
      </div>
      {field("shopName", "Do'kon nomi", { placeholder: "Masalan: Barakat market" })}
      {field("address", "Manzil", { placeholder: "Shahar, ko'cha, uy" })}
      {field("district", "Tuman yoki shahar", { list: "districts", placeholder: districts[0] ?? "" })}
      <datalist id="districts">
        {districts.map((d) => (
          <option key={d} value={d} />
        ))}
      </datalist>
      {field("ownerName", "Ismingiz")}
      {field("phone", "Telefon", { type: "tel", inputMode: "tel" })}
      {err && <p className="text-sm text-app-danger">{err}</p>}
      <button disabled={busy} className="rounded-xl bg-app-accent py-3 font-medium text-app-accent-text disabled:opacity-60">
        {busy ? "Yuborilmoqda…" : "Ro'yxatdan o'tish"}
      </button>
      {!inTelegram && (
        <button type="button" onClick={cancelRegistration} className="text-sm text-app-hint">
          Orqaga
        </button>
      )}
    </form>
  );
}
