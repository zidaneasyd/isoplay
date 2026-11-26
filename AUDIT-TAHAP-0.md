# Audit Baseline — Tahap 0

Tanggal audit: 26 November 2026  
Sumber: arsip proyek `isoplay(1).zip` yang diberikan pada percakapan ini.  
Lingkup: struktur aplikasi, kerangka UI, arsitektur plane/interaction/render, kontrol Inspector, dan baseline pengujian.

## 1. Inventaris proyek

| Area | File | Peran |
|---|---|---|
| Entry UI | `index.html` | Shell aplikasi utama, workspace, Inspector, quick actions, panel kanan, footer |
| Entry module | `plane.js` | Public barrel untuk konfigurasi, geometri, elevasi, render, interaksi, zoom |
| Konfigurasi | `src/config.js` | Ukuran tile/plane default, warna, batas zoom, langkah elevasi |
| Geometri | `src/geometry.js` | Pusat tile, validasi indeks, hit-test plane dan sisi elevasi |
| Elevasi | `src/elevation.js` | Penyimpanan elevasi independen per tile dan konversi 8 px per level |
| Render | `src/render.js` | Ground plane, grid, top face dan sisi kiri/kanan tile berelevasi |
| Interaksi | `src/interaction.js` | Pointer, zoom wheel, pan, resize, seleksi, elevasi, sinkronisasi canvas |
| UI binding | `src/ui.js` | Inspector, tombol panel, action rail, informasi seleksi dan kamera |
| Zoom | `src/zoom.js` | Normalisasi wheel, batas zoom, transformasi anchor dan pan |
| Server lokal | `scripts/server.js` | HTTP statis dan MIME untuk ES modules |
| Pengujian | `tests/*.test.js` | Tes unit, integrasi harness, property test, dan server |
| UI referensi | `concept/index.html` | Mockup UI pembanding; bukan implementasi aplikasi utama |
| Browser checks | `checks/` | Halaman pemeriksaan visual/skenario manual melalui browser |

## 2. Kondisi sebelum pekerjaan

### Tahap 0 — Baseline

- Sumber mengandung modul aplikasi yang terpisah dan suite Node.js tanpa dependensi tambahan.
- Arsip ZIP memakai karakter backslash sebagai pemisah path. Ekstraksi standar Linux menghasilkan nama file literal yang tidak dapat dimuat Node; arsip kerja dinormalisasi ke path direktori sebelum baseline dijalankan.
- Tidak ada direktori `.git` di arsip. Karena itu audit ini tidak dapat menetapkan commit/branch atau mengirim perubahan ke remote.
- Dokumen `TEST-REPORT.md` sebelumnya menyebut 75 tes. Eksekusi ulang pada sumber yang diekstrak dengan benar menemukan **79 tes lulus**, bukan 75.

### Tahap 1 — UI Shell

Shell aplikasi utama telah tersedia sebelum perubahan:

- Topbar dan identitas `Iso Playground`.
- Canvas workspace dengan board terpusat.
- Inspector kiri dengan collapse/expand.
- Quick action reset kamera.
- Panel kanan `DAFTAR OBJEK` dan `TILE SELECTION` dengan toggle terpisah.
- Footer readout dan aturan responsive desktop/mobile.
- Elevation inspector tetap meminta tile dipilih sebelum kontrol aktif.

Kesimpulan: Tahap 1 sudah terpenuhi secara struktural pada sumber. Tidak perlu membuat ulang layout. Perubahan tahap ini berupa penyempurnaan pengikatan metadata topbar terhadap ukuran plane yang sekarang dinamis. Audit juga menemukan selector skenario browser menggunakan `.selection-panel`, padahal elemen utama hanya memiliki `id="selection-panel"`; selector diperbaiki agar pemeriksaan panel mengacu pada elemen yang benar.

### Tahap 2 — Workspace Inspector

Sebelum perubahan, `index.html` hanya menampilkan ukuran plane/tile statis dan readout zoom/pan. Kontrol grid size, axis, koordinat, dan zoom slider ada pada `concept/index.html`, tetapi masih mockup; tombol tertentu secara eksplisit menampilkan notifikasi bahwa perilakunya hanya mockup. Geometri, renderer, dan interaksi utama memakai `PLANE` konstan 12×12.

## 3. Baseline pengujian sebelum perubahan

Perintah: `npm test`  
Runtime: Node.js v22.16.0  
Hasil: **79 lulus, 0 gagal**.

Cakupan baseline yang sudah tersedia: elevasi per tile dan batas level 0; geometri 144 tile; hit-test deterministic/property tests; sisi tile berelevasi; zoom/pan dan DPR; inspector dan panel; server lokal dan penanganan path.

## 4. Risiko awal

| Risiko | Dampak | Tindakan |
|---|---|---|
| Ukuran plane statis pada modul geometri/render | UI tidak dapat mengubah ukuran grid secara riil | Generalisasi konfigurasi plane yang disalurkan ke geometri, elevasi, render, interaksi dan UI |
| Toggle axis/grid/koordinat hanya berada di Concept | Mockup tidak mewakili kemampuan aplikasi | Implementasi control state pada aplikasi utama |
| Zoom hanya lewat wheel | Tidak ada kontrol kamera langsung di Inspector | Tambah range slider terhubung ke state kamera dan reset |
| Penyusutan grid berpotensi menyisakan data tile di luar batas | Elevasi atau seleksi tersembunyi dapat muncul lagi setelah grid diperbesar | Hapus elevasi/seleksi yang keluar dari batas saat grid diperkecil |
| Grid besar + zoom/DPR tinggi | Canvas backing-store dapat mengalokasikan memori berlebihan | Batasi ukuran backing canvas sambil mempertahankan skala CSS |
| Arsip path memakai backslash | Ekstraksi lintas OS rentan menghasilkan struktur rusak | Arsip hasil akhir memakai path POSIX (`/`) |

## 5. Kesimpulan audit

Tahap 1 sudah ada dalam sumber dan dipertahankan. Pekerjaan utama yang tertinggal berada pada Tahap 2: memindahkan control Plane/Camera dari rancangan Concept menjadi Inspector aktif dan menghubungkannya dengan engine. Perubahan di Tahap 2 membutuhkan generalisasi geometri/renderer agar ukuran grid tidak sekadar mengubah label.
