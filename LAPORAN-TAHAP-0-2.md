# Laporan Pekerjaan ISOPLAY — Tahap 0 sampai Tahap 2

Tanggal: 26 November 2026  
Sumber kerja: `isoplay(1).zip`  
Status: implementasi lokal selesai; belum di-commit atau di-push.

## Ringkasan tahap

| Tahap | Prev | Update | Status |
|---|---|---|---|
| 0 — Baseline & audit | Struktur dan laporan pengujian belum konsisten; audit formal belum tersedia | Inventaris file/modul, pemetaan shell vs engine, identifikasi risiko, baseline 79/79, audit tertulis | Selesai |
| 1 — UI Shell | Topbar, canvas, Inspector kiri, quick action, dua panel kanan, footer, dan responsive layout sudah tersedia | Dipertahankan; metadata topbar kini sinkron dengan grid runtime; selector panel pada skenario browser diperbaiki | Selesai secara struktural |
| 2 — Workspace Inspector | Ukuran plane statis; kontrol visual Concept masih mockup; zoom Inspector hanya readout | Grid dinamis, toggle Grid/Axis/Koordinat, zoom slider aktif, sinkronisasi metadata dan kamera dengan engine | Selesai |

## Perubahan implementasi — Prev → Update

| Komponen | Prev | Update |
|---|---|---|
| Ukuran grid | Tetap 12×12 | Dapat diatur 12×12 sampai 64×64, langkah 2 |
| Ukuran plane | 768×384 px statis | Mengikuti grid; tile tetap 64×32 px |
| Geometri dan hit-test | Menggunakan konstanta plane | Menerima konfigurasi plane runtime |
| Elevasi | Per-tile pada plane 12×12 | Per-tile tetap didukung pada grid runtime; data di luar batas dibuang saat grid diperkecil |
| Grid | Garis grid selalu tampil | Toggle tampil/sembunyi |
| Axis | Belum ada di app utama | Sumbu isometrik dan sumbu vertikal dapat ditampilkan/disembunyikan |
| Koordinat | Hanya readout hover/seleksi | Label koordinat dapat ditampilkan pada setiap tile |
| Zoom | Wheel dan readout Inspector | Slider 25–400%, tetap mendukung wheel dan reset |
| Canvas backing store | Mengikuti DPR×zoom tanpa anggaran grid runtime | Dibatasi sekitar 32 juta piksel dan dimensi 8192 px |
| Metadata | Plane label statis | Topbar, ukuran grid, dan dimensi plane tersinkron |

## File berubah

**Implementasi:**

- `index.html` — kontrol Inspector dan metadata plane.
- `plane.js` — ekspor konfigurasi plane runtime dan batas ukuran grid.
- `src/config.js` — pembuatan konfigurasi plane serta normalisasi grid 12–64.
- `src/geometry.js` — geometri, validasi, dan hit-test dengan konfigurasi runtime.
- `src/elevation.js` — validasi elevasi terhadap konfigurasi plane aktif.
- `src/render.js` — layer grid, axis, koordinat dan render geometri runtime.
- `src/interaction.js` — pengaitan UI dengan engine, ukuran grid, kamera, dan batas backing store.
- `src/ui.js` — binding kontrol grid, visual, zoom, dan metadata.

**Pengujian dan dokumentasi:**

- `tests/plane.test.js`, `tests/ui.test.js`, `tests/ui-contract.test.js` — tes baru untuk grid runtime, layer visual, zoom slider, pruning state, dan kontrak kontrol.
- `checks/scenarios.html` — skenario manual kontrol Tahap 2 dan perbaikan selector panel.
- `checks/README.md`, `TESTING.md`, `README.md` — petunjuk dan cakupan pengujian diperbarui.
- `AUDIT-TAHAP-0.md` — dokumentasi audit baseline.
- `TEST-REPORT.md` dan `test-results.txt` — hasil pengujian akhir.

## Hasil pengujian

| Pemeriksaan | Hasil |
|---|---:|
| Baseline sebelum perubahan | 79 lulus / 0 gagal |
| Setelah Tahap 0–2 | **89 lulus / 0 gagal** |
| Tes dilewati | 0 |
| `node --check` seluruh file JavaScript | Lulus |
| HTTP root dan modul utama | HTTP 200 |
| Halaman `/checks/` dan skenario browser | HTTP 200 |

Perintah: `npm test`.

Kasus baru yang diuji mencakup ukuran grid dinamis, sanitasi batas 12–64 dan langkah 2, perubahan dimensi canvas, hit-test pada tile di luar grid awal, penghapusan elevasi/seleksi saat grid menyusut, toggle grid/axis/koordinat, zoom slider, reset kamera, koordinat label renderer, serta pembatasan backing canvas pada grid 64×64 dan zoom 400%.

## Batas verifikasi

- Server lokal serta respons HTTP diverifikasi.
- Chromium headless dicoba dua kali, tetapi prosesnya berhenti sebelum mengembalikan DOM dan mencapai timeout. Karena itu inspeksi visual browser desktop/mobile belum dapat dinyatakan lulus; halaman checks tersedia untuk dilanjutkan secara manual.
- Arsip sumber tidak berisi metadata Git (`.git`). Perubahan berada pada working copy ZIP; tidak ada commit atau push ke repository.

## Menjalankan proyek

```sh
npm test
npm run dev
```

Buka `http://127.0.0.1:4173/`.
