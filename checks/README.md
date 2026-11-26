# Pengecekan aplikasi

## Tes otomatis Node.js

Jalankan dari folder utama proyek:

```sh
npm test
```

Suite menggunakan test runner bawaan Node.js, tanpa dependensi instalasi tambahan (89 tes). Cakupannya meliputi konfigurasi grid, hit-test semua tile, pembandingan 80.000 titik terhadap dua oracle, tepi/corner/toleransi, seleksi, render path batching, zoom anchor, hover tetap di tile yang sama, pan, batas zoom, wheel pixel/line/page, resize, DPR, pointer capture, pembatalan drag, serta integrasi inspector untuk seluruh 144 tile, kontrol grid runtime 12–64, toggle grid/axis/koordinat, zoom slider, nilai invalid, format zoom/pan, toggle panel, reset kamera, dan matriks viewport/DPR.

## Tes visual dan integrasi dasar

Jalankan server lokal:

```sh
npm run dev
```

Buka `http://127.0.0.1:4173/checks/`. Halaman ini memeriksa warna isi tile, stroke hover/aktif, koordinat, dan anchor zoom pada fixture canvas.

## Tes browser lintas skenario

Buka `http://127.0.0.1:4173/checks/scenarios.html`. Halaman ini memuat aplikasi sebenarnya di dalam iframe dengan viewport 390×844, 800×600, 1280×720, dan 1920×1080. Tes mencakup lima titik anchor, kestabilan hover pada rangkaian zoom sampai batas minimum/maksimum, ukuran CSS dan backing store, resize pada zoom maksimum, pan yang dilanjutkan dengan zoom, sinkronisasi inspector, kontrol ukuran grid dan layer visual, zoom slider, reset kamera, toggle panel, dan batas layout desktop/mobile.

Gunakan browser Chromium, Chrome, atau Firefox versi terbaru. Halaman ini memerlukan server HTTP karena aplikasi utama menggunakan ES module.
