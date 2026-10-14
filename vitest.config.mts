import path from "node:path";
import { defineConfig } from "vitest/config";

// Ikki xil test:
// - unit: bazaga tegmaydigan sof funksiyalar (npm test)
// - integration: haqiqiy PostgreSQL'da pul oqimlari, poyga holatlari, ruxsatlar (npm run test:int).
//   Faqat TEST_DATABASE_URL dagi, nomi _test bilan tugaydigan bazada ishlaydi.
export default defineConfig({
  resolve: { alias: { "@": path.resolve(import.meta.dirname, "src") } },
  test: {
    projects: [
      {
        extends: true,
        test: { name: "unit", include: ["src/**/*.test.ts"], exclude: ["src/**/*.int.test.ts"] },
      },
      {
        extends: true,
        test: {
          name: "integration",
          include: ["src/**/*.int.test.ts"],
          setupFiles: ["src/test/int-setup.ts"],
          // Fayllar ketma-ket: hamma bitta test bazasini ishlatadi (har test o'z ma'lumotini yaratadi)
          fileParallelism: false,
          testTimeout: 30_000,
          hookTimeout: 30_000,
        },
      },
    ],
  },
});
