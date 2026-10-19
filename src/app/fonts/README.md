# Shriftlar

Unbounded va Golos Text (SIL Open Font License 1.1, litsenziyalar shu papkada). Manba: mobil ilovadagi `@expo-google-fonts/unbounded` va `@expo-google-fonts/golos-text` TTF fayllari. Faqat kerakli harflar qoldirilgan: lotin, o'zbek (`ʻ`, `Ўў`, `Ққ`, `Ғғ`, `Ҳҳ`), rus, tinish belgilari, `€ ₽ №`.

Qayta yaratish (`pip install fonttools brotli`, `mobile/` da `npm ci` qilingan bo'lsin):

```bash
G=mobile/node_modules/@expo-google-fonts
U="U+0000-00FF,U+0131,U+0152-0153,U+02BB-02BC,U+02C6,U+02DA,U+02DC,U+0301,U+0304,U+0308,U+0329,U+0400-045F,U+0490-0493,U+049A-049B,U+04B0-04B3,U+2000-206F,U+20AC,U+20BD,U+2116,U+2122,U+2190-2193,U+2212,U+2215,U+FEFF,U+FFFD"
sub() { pyftsubset "$1" --unicodes="$U" --layout-features='*' --name-IDs='*' --flavor=woff2 --output-file="$2"; }
for w in 500Medium 600SemiBold 700Bold; do sub $G/unbounded/$w/Unbounded_$w.ttf src/app/fonts/unbounded-${w:0:3}.woff2; done
for w in 400Regular 500Medium 600SemiBold 700Bold; do sub $G/golos-text/$w/GolosText_$w.ttf src/app/fonts/golos-text-${w:0:3}.woff2; done
```
