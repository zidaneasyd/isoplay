# Isoplay — Plane Isometrik

Aplikasi canvas plane isometrik 12 × 12 dengan hover, pemilihan tile, pan tombol tengah, dan zoom berbasis posisi kursor.

## Menjalankan aplikasi

Jalankan server statis dari direktori proyek:

```sh
python -m http.server 8000
```

Buka `http://localhost:8000/`.

## Struktur modul

- `src/config.js` — dimensi grid, palet warna, dan batas zoom.
- `src/geometry.js` — pusat tile, pemeriksaan indeks, dan hit-test isometrik berbatasan kandidat.
- `src/zoom.js` — normalisasi wheel, clamp zoom, serta matematika anchor/pan.
- `src/render.js` — gambar canvas dengan path fill/grid yang dibatch.
- `src/interaction.js` — pengendali event pointer, wheel, resize, dan readout.
- `src/ui.js` — sinkronisasi inspector dengan hover, seleksi tile, dan state kamera.
- `plane.js` — public entry point/barrel untuk menjaga kompatibilitas import lama.
- `tests/` — pengujian otomatis Node.js dan skenario property-based deterministik, termasuk UI inspector.
- `checks/` — halaman integrasi render dan pengujian browser lintas viewport serta inspector.

## Pengujian otomatis

```sh
npm test
```

Suite saat ini berisi **53 tes** tanpa dependensi tambahan. Pengujian inspector mencakup semua 144 koordinat tile, data kosong/invalid, format zoom dan pan ekstrem, toggle panel, reset kamera, serta sinkronisasi hover/seleksi/kamera pada variasi viewport dan DPR. Di dalamnya ada 80.000 titik acak deterministik yang membandingkan hit-test baru dengan oracle koordinat isometrik dan algoritma exhaustive lama, serta matriks viewport/DPR, zoom anchor, hover sepanjang zoom minimum–maksimum, pan, resize, input wheel, pointer, dan validasi highlight.

## Pengujian browser

Jalankan server lokal:

```sh
python -m http.server 8000
```

Buka halaman berikut di browser:

- `http://localhost:8000/checks/` — cek visual warna, stroke, dan interaksi dasar.
- `http://localhost:8000/checks/scenarios.html` — uji browser nyata dengan iframe berukuran 390×844, 800×600, 1280×720, dan 1920×1080; termasuk anchor zoom, posisi hover, pan, resize, resolusi backing canvas, integrasi inspector, reset kamera, dan batas layout responsif.

ES module perlu dilayani lewat HTTP; jangan membuka halaman langsung sebagai `file://`.
