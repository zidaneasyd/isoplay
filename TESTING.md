# Pengujian Iso Playground

## Pengujian otomatis

Jalankan dari direktori proyek:

```sh
npm test
```

Suite Node.js tidak membutuhkan dependensi eksternal. Cakupan mencakup:

- Semua 144 tile default, pusat tile, hit-test, shared edges/corners, nilai invalid, serta oracle/property tests deterministik.
- Elevasi per tile, level minimum 0, 1 level = 8 px, top face, sisi kiri/kanan, perbedaan elevasi tetangga dan canvas padding.
- Inspector kiri, panel kanan expand/collapse, action rail, status aksesibilitas, dan sinkronisasi seleksi.
- Ukuran grid dinamis 12–64 tile per sisi dengan langkah 2, dimensi plane, pembaruan metadata, pruning elevasi/seleksi saat grid diperkecil.
- Toggle grid, axis, dan koordinat secara independen.
- Zoom slider 25–400%, wheel zoom, anchor zoom, pan, reset kamera, viewport dan DPR.
- Batas backing canvas agar grid besar pada zoom tinggi tidak mengalokasikan bitmap tanpa batas.
- Server HTTP: MIME ES module, GET/HEAD, method yang ditolak, path hilang, dan perlindungan traversal.

## Pengujian browser manual

Jalankan server lokal:

```sh
npm run dev
```

Buka `http://127.0.0.1:4173/`. Halaman pemeriksaan tersedia di:

- `http://127.0.0.1:4173/checks/`
- `http://127.0.0.1:4173/checks/scenarios.html`

Skenario manual meliputi viewport 390×844, 800×600, 1280×720, dan 1920×1080, interaksi canvas, zoom/pan, resize, panel, Inspector, elevasi, serta layout responsif.

Catatan: pada proses audit ini server dan respons HTTP diverifikasi. Chromium headless dicoba untuk mengambil DOM, tetapi proses browser tidak menyelesaikan startup/eksekusi dan tidak mengembalikan DOM. Maka pengujian visual interaktif browser belum dapat dinyatakan lulus.
