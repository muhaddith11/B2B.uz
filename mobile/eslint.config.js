// https://docs.expo.dev/guides/using-eslint/
const { defineConfig } = require('eslint/config');
const expoConfig = require("eslint-config-expo/flat");

module.exports = defineConfig([
  expoConfig,
  {
    ignores: ["dist/*"],
  },
  {
    // O'zbek lotin yozuvida apostrof oddiy harf (so'm, o'tish), uni JSX'da escape qilish shart emas
    rules: { "react/no-unescaped-entities": "off" },
  },
]);
