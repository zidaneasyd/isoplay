# Isoplay — Plane Isometrik

Aplikasi canvas plane isometrik 12 × 12 dengan hover, pemilihan tile, elevasi per tile, pan tombol tengah, dan zoom berbasis posisi kursor. Level elevasi terendah adalah 0; setiap level menaikkan bidang atas 8 px.

## Menjalankan aplikasi

Jalankan server lokal dari direktori proyek:

```sh
npm run dev
```

Buka `http://127.0.0.1:4173/`. Server ini menyajikan HTML dan JavaScript modules dengan MIME type yang benar. Jangan membuka `index.html` langsung sebagai `file://`, karena browser akan memblokir import ES module dan semua interaksi UI tidak akan aktif.

## Struktur modul

- `src/config.js` — dimensi grid, palet warna, dan batas zoom.
- `src/elevation.js` — penyimpanan level elevasi setiap tile dan konversi level ke piksel.
- `src/geometry.js` — pusat tile, pemeriksaan indeks, serta hit-test untuk bidang atas dan dua sisi tile berelevasi.
- `src/zoom.js` — normalisasi wheel, clamp zoom, serta matematika anchor/pan.
- `src/render.js` — gambar bidang dasar serta tile berelevasi dengan sisi kiri dan kanan.
- `src/interaction.js` — pengendali event pointer, wheel, resize, elevasi, dan readout.
- `src/ui.js` — sinkronisasi inspector dengan hover, seleksi tile, elevasi, dan state kamera.
- `plane.js` — public entry point/barrel untuk menjaga kompatibilitas import lama.
- `scripts/server.js` — server statis lokal untuk menjalankan aplikasi melalui HTTP.
- `tests/` — pengujian otomatis Node.js dan skenario property-based deterministik, termasuk UI inspector.
- `checks/` — halaman integrasi render dan pengujian browser lintas viewport serta inspector.

## Pengujian otomatis

```sh
npm test
```

Suite saat ini berisi **75 tes** tanpa dependensi eksternal. Pengujian mencakup elevasi per tile, batas minimum 0, konversi 8 px per level, render sisi kiri/kanan, hit-test permukaan atas/samping, dua panel expand, pengaktifan kontrol setelah seleksi, dan sinkronisasi action rail. Cakupan lama tetap mencakup seluruh 144 koordinat, 80.000 titik uji deterministik, zoom/pan, pointer, resize, viewport dan DPR.

## Pengujian browser

Jalankan `npm run dev`, lalu buka halaman berikut di browser:

- `http://127.0.0.1:4173/checks/` — cek visual warna, stroke, dan interaksi dasar.
- `http://127.0.0.1:4173/checks/scenarios.html` — skenario browser lintas viewport.

ES module perlu dilayani lewat HTTP; jangan membuka halaman langsung sebagai `file://`. Jika halaman dibuka dari `file://`, aplikasi menampilkan petunjuk untuk menjalankan server lokal.
