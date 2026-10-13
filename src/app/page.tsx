import Link from "next/link";

export default function Home() {
  return (
    <main className="mx-auto max-w-md p-6 text-gray-900">
      <h1 className="text-2xl font-semibold">Captar</h1>
      <p className="mt-2 text-gray-600">Lokal sinov uchun kirish sahifasi.</p>
      <div className="mt-6 grid gap-3">
        <Link href="/app" className="rounded-xl bg-blue-600 px-4 py-3 text-center font-medium text-white">
          Do'kon ilovasi (Mini App)
        </Link>
        <Link href="/panel" className="rounded-xl border border-gray-300 px-4 py-3 text-center font-medium">
          Distribyutor paneli
        </Link>
      </div>
    </main>
  );
}
