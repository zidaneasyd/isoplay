# Isoplay — Plane Isometrik

Aplikasi canvas plane isometrik dengan ukuran grid yang dapat diatur dari 12×12 sampai 64×64 tile (kelipatan 2), hover, pemilihan tile, elevasi per tile, pan tombol tengah, dan zoom berbasis posisi kursor atau Inspector. Level elevasi terendah adalah 0; setiap level menaikkan bidang atas 8 px.

## Menjalankan aplikasi

Jalankan server lokal dari direktori proyek:

```sh
npm run dev
```

Buka `http://127.0.0.1:4173/`. Jangan membuka `index.html` langsung sebagai `file://`, karena browser akan memblokir import ES module.

## Inspector workspace

- Grid size: 12–64 tile per sisi, step 2.
- Axis, Grid, dan Koordinat: kontrol visibilitas independen.
- Camera zoom: 25–400%, tetap mendukung wheel zoom dan reset kamera.
- Ukuran plane dan label topbar mengikuti grid runtime.
- Elevasi tetap tersimpan per tile; saat grid diperkecil, nilai/seleksi di luar batas dibuang.

## Struktur modul

- `src/config.js` — dimensi dasar, factory plane runtime, palet, dan batas zoom.
- `src/elevation.js` — state elevasi tiap tile dan konversi level ke piksel.
- `src/geometry.js` — pusat tile, validasi indeks, hit-test permukaan atas dan sisi berelevasi.
- `src/zoom.js` — normalisasi wheel, clamp zoom, serta matematika anchor/pan.
- `src/render.js` — plane, grid, axis, koordinat, dan geometri tile berelevasi.
- `src/interaction.js` — event pointer, wheel, resize, elevasi, kamera, dan pengendali state.
- `src/ui.js` — sinkronisasi Inspector, control input, panel, dan readout.
- `plane.js` — public entry point/barrel untuk menjaga kompatibilitas import.
- `scripts/server.js` — server statis lokal.
- `tests/` — tes Node.js unit/integrasi/property serta server.
- `AUDIT-TAHAP-0.md` — audit baseline dan temuan.
- `TEST-REPORT.md` dan `TESTING.md` — hasil dan petunjuk pengujian.

## Pengujian otomatis

```sh
npm test
```

Suite saat laporan ini dibuat berisi **89 tes**. Cakupan termasuk geometri dynamic grid, visual Inspector, kamera, elevasi, render, panel dan server.

## Pemeriksaan browser

- `http://127.0.0.1:4173/checks/`
- `http://127.0.0.1:4173/checks/scenarios.html`

Browser visual tetap perlu dijalankan manual pada browser desktop/mobile karena percobaan Chromium headless dalam audit ini tidak selesai.
