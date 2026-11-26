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
- `src/geometry.js` — pusat tile, hit-test diamond, dan pemilihan tile.
- `src/zoom.js` — normalisasi wheel, clamp zoom, serta matematika anchor/pan.
- `src/render.js` — seluruh operasi gambar canvas.
- `src/interaction.js` — pengendali event pointer, wheel, resize, dan readout.
- `plane.js` — public entry point/barrel untuk menjaga kompatibilitas import lama.
- `tests/` — skenario otomatis Node.js.
- `checks/` — halaman integrasi untuk pemeriksaan langsung di browser.

## Pengujian

```sh
npm test
```

Lihat `checks/README.md` untuk menjalankan pemeriksaan visual dan integrasi browser.
