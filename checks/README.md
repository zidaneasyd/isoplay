# Pengecekan aplikasi

## Tes otomatis Node.js

Jalankan dari folder utama proyek:

```sh
npm test
```

Suite menggunakan test runner bawaan Node.js, tanpa dependensi instalasi tambahan. Cakupannya meliputi konfigurasi grid, proyeksi dan hit-test 144 tile, koordinat tidak valid, pemilihan tile, render warna/stroke, HiDPI, zoom anchor, pan, batas zoom, normalisasi wheel pixel/line/page, resize, pointer capture, dan pembatalan drag.

## Tes integrasi browser

Jalankan server lokal:

```sh
python -m http.server 8000
```

Buka `http://localhost:8000/checks/`. Halaman menjalankan pengecekan render canvas dan alur interaksi browser, termasuk kestabilan titik fokus ketika zoom, ukuran layout yang tetap, serta batas zoom. ES module perlu dilayani lewat HTTP; jangan membuka halaman langsung sebagai `file://`.
