# Ringkasan Pengujian Tambahan

Pengujian tambahan mengikuti modul yang benar-benar digunakan aplikasi, bukan API atau kontrol rancangan UI yang tidak didukung oleh proyek.

## Cakupan otomatis

- Hit-test seluruh tile, shared edge/corner, nilai invalid, dan pembandingan 80.000 titik pseudo-acak terhadap dua oracle.
- Zoom anchor pada variasi viewport dan DPR, zoom minimum–maksimum, hover tetap di tile yang sama, wheel pixel/line/page, pan, resize, pointer capture, pembatalan drag, dan seleksi.
- Inspector: format informasi seluruh 144 tile, pusat tile, status kosong/invalid, variasi nilai zoom/pan (termasuk nilai ekstrem dan non-finite), toggle panel, reset kamera, serta sinkronisasi hover/seleksi/pan/zoom melalui matriks viewport dan DPR.

Jalankan seluruh pengujian otomatis dengan `npm test` (53 tes).

## Pengujian browser

Jalankan server lokal:

```sh
python -m http.server 8000
```

Buka `http://localhost:8000/checks/scenarios.html` di Chromium, Chrome, atau Firefox. Pengujian ini memuat aplikasi sebenarnya pada viewport 390×844, 800×600, 1280×720, dan 1920×1080. Cakupannya termasuk anchor zoom, hover, pan, resize, DPR, integrasi inspector, reset kamera, toggle panel, dan batas layout responsif.

Browser perlu menjalankan ES module melalui HTTP; jangan membuka halaman aplikasi langsung sebagai `file://`.
