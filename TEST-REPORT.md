# Laporan Pengujian Iso Playground — Tahap 0–2

Tanggal: 26 November 2026  
Runtime: Node.js v22.16.0  
Sumber: arsip `isoplay(1).zip`, dinormalisasi dari path backslash ke struktur direktori POSIX.

## Ringkasan

| Metrik | Hasil |
|---|---:|
| Baseline sebelum perubahan | 79/79 lulus |
| Suite setelah Tahap 0–2 | **89/89 lulus** |
| Gagal / skipped | 0 / 0 |
| Pemeriksaan sintaks JavaScript | Lulus |
| Server HTTP dan MIME module | Lulus |
| Browser headless visual | Tidak terverifikasi — Chromium tidak mengembalikan DOM sebelum timeout |

Perintah otomatis: `npm test`.

## Perubahan yang diuji

1. Ukuran grid 12–64×12–64, kelipatan 2, memperbarui ukuran backing/CSS plane dan metadata UI.
2. Grid yang diperkecil menghapus elevasi dan seleksi yang berada di luar batas baru.
3. Toggle grid, axis, dan koordinat memiliki state terpisah serta mengubah layer render.
4. Koordinat tile dirender sesuai indeks relatif terhadap pusat grid.
5. Zoom slider mengendalikan kamera pada rentang 25–400%, sinkron dengan readout dan reset kamera.
6. Geometri/hit-test/elevasi menerima konfigurasi plane runtime tanpa mengubah perilaku API default 12×12.
7. Backing canvas dibatasi sekitar 32 juta piksel dan dimensi maksimum 8192 px untuk menghindari alokasi ekstrem pada ukuran grid/zoom tertinggi.
8. Kerangka Tahap 1 yang sudah ada (Inspector, dua panel kanan, action rail, reset kamera, responsive layout) tetap lolos tes kontraknya.

## Batas verifikasi

- `npm test` menjalankan harness Node.js dan server HTTP; ini bukan pengganti uji manual visual pada browser desktop.
- Server lokal mengembalikan HTTP 200 dan MIME `text/html; charset=utf-8` pada root. MIME module dan rute keamanan diuji oleh tes server.
- Percobaan Chromium headless tidak berhasil menyelesaikan eksekusi sebelum timeout. Tidak ada klaim bahwa visual desktop/mobile telah lolos inspeksi browser.
- Arsip sumber tidak menyertakan `.git`; tidak ada commit atau push remote dari pekerjaan ini.
