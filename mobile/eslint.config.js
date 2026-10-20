// https://docs.expo.dev/guides/using-eslint/
const { defineConfig } = require('eslint/config');
const expoConfig = require("eslint-config-expo/flat");

module.exports = defineConfig([
  expoConfig,
  {
    // test/ papkasi ildizdagi vitest bilan ishlaydi (vitest mobil paketlarda yo'q)
    ignores: ["dist/*", "test/*"],
  },
  {
    // jest.mock fabrikasi import ishlata olmaydi (Jest uni fayl boshiga ko'taradi), ichida require ishlatiladi
    files: ["__tests__/**"],
    rules: { "@typescript-eslint/no-require-imports": "off" },
  },
  {
    // O'zbek lotin yozuvida apostrof oddiy harf (so'm, o'tish), uni JSX'da escape qilish shart emas
    rules: { "react/no-unescaped-entities": "off" },
  },
]);
