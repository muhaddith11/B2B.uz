import path from "node:path";
import { defineConfig } from "vitest/config";

// Uch xil test:
// - unit: bazaga tegmaydigan sof funksiyalar (npm test)
// - mobile: mobil ilovaning React Native'ga bog'liq bo'lmagan yordamchilari (mobile/test, npm test bilan birga)
// - integration: haqiqiy PostgreSQL'da pul oqimlari, poyga holatlari, ruxsatlar (npm run test:int).
//   Faqat TEST_DATABASE_URL dagi, nomi _test bilan tugaydigan bazada ishlaydi.
export default defineConfig({
  resolve: { alias: { "@": path.resolve(import.meta.dirname, "src") } },
  test: {
    // npm run test:coverage: unit va integratsiya testlari birga. Chegara CI'da: qamrov pasaysa commit qizil bo'ladi
    coverage: {
      provider: "v8",
      include: ["src/lib/**/*.ts", "src/app/api/**/*.ts"],
      exclude: ["src/**/*.test.ts", "src/test/**"],
      reporter: ["text-summary", "json-summary"],
      thresholds: { lines: 80, functions: 78, branches: 70, statements: 78 },
    },
    projects: [
      {
        extends: true,
        test: { name: "unit", include: ["src/**/*.test.ts"], exclude: ["src/**/*.int.test.ts"] },
      },
      {
        // Mobil tsconfig "expo/tsconfig.base" ni kengaytiradi, uni vite o'qiy olmaydi: testlar uchun alohida, sodda tsconfig
        tsconfig: path.resolve(import.meta.dirname, "mobile/test/tsconfig.json"),
        resolve: { alias: { "@": path.resolve(import.meta.dirname, "mobile/src") } },
        test: { name: "mobile", include: ["mobile/test/**/*.test.ts"] },
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
