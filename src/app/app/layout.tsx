import Script from "next/script";
import { ShopProvider } from "./shop-context";
import { Gate } from "./gate";
import { BottomNav } from "./bottom-nav";

export default function ShopLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-dvh bg-app-bg text-app-text">
      <Script src="https://telegram.org/js/telegram-web-app.js" strategy="afterInteractive" />
      <ShopProvider>
        <Gate>
          <div className="mx-auto max-w-lg pb-24">{children}</div>
          <BottomNav />
        </Gate>
      </ShopProvider>
    </div>
  );
}
