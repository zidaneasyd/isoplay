# Ringkasan Pengujian Tambahan

Pengujian tambahan mengikuti modul yang benar-benar digunakan aplikasi, bukan API atau kontrol rancangan UI yang tidak didukung oleh proyek.

## Cakupan otomatis

- Hit-test seluruh tile, shared edge/corner, nilai invalid, dan pembandingan 80.000 titik pseudo-acak terhadap dua oracle.
- Zoom anchor pada variasi viewport dan DPR, zoom minimum–maksimum, hover tetap di tile yang sama, wheel pixel/line/page, pan, resize, pointer capture, pembatalan drag, dan seleksi.
- Inspector: format informasi seluruh 144 tile, pusat tile, status kosong/invalid, variasi nilai zoom/pan (termasuk nilai ekstrem dan non-finite), reset kamera, sinkronisasi seleksi dan state kamera.
- Panel kanan: buka/tutup DAFTAR OBJEK dan TILE SELECTION secara independen; validasi `aria-expanded`, nama aksesibel, dan status layout lebar yang bertahan sampai panel terakhir ditutup.
- Elevasi: variasi level 0–1024, input non-finite/negatif/desimal, penyimpanan independen tiap tile, tinggi maksimum canvas, top-face seluruh 144 tile pada 7 level, dua sisi terbuka, perbedaan tinggi antartetangga, dan render multi-tile.
- Integrasi interaksi: klik memilih tile, kontrol `+`/`−` aktif setelah seleksi, level minimum 0, nilai elevasi dipertahankan saat berpindah seleksi, serta hit-test tetap tepat pada viewport dan DPR berbeda.
- Server lokal: MIME type module, GET/HEAD, method yang ditolak, path tidak ditemukan, dan path traversal.

Jalankan seluruh pengujian otomatis dengan `npm test` (75 tes).

## Pengujian browser

Jalankan server lokal:

```sh
npm run dev
```

Buka `http://127.0.0.1:4173/checks/scenarios.html` di Chromium, Chrome, atau Firefox. Pengujian ini memuat aplikasi sebenarnya pada viewport 390×844, 800×600, 1280×720, dan 1920×1080. Cakupannya termasuk anchor zoom, hover, pan, resize, DPR, integrasi inspector, reset kamera, toggle panel, dan batas layout responsif.

Browser perlu menjalankan ES module melalui HTTP; jangan membuka halaman aplikasi langsung sebagai `file://`. Pengujian browser headless tidak dapat dieksekusi pada lingkungan audit ini karena proses Chromium berhenti saat startup; cakupan interaksi dijalankan melalui harness Node dan server HTTP diuji terpisah.
