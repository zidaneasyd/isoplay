# Laporan Pengujian Iso Playground

Tanggal: 26 November 2026  
Node.js: v22.16.0  
Chromium tersedia: 144.0.7559.96

## Ringkasan hasil

| Area | Hasil |
|---|---:|
| Seluruh suite otomatis Node.js | **75/75 lulus** |
| Kegagalan tes otomatis | **0** |
| Pemeriksaan sintaks seluruh JavaScript | **Lulus** |
| Server HTTP lokal dan MIME JavaScript module | **Lulus** |
| Browser headless / pemeriksaan visual langsung | **Tidak dapat dijalankan** |

Perintah utama: `npm test`  
Durasi suite terakhir: sekitar 684 ms.

## Perbaikan dan temuan

1. Panel **DAFTAR OBJEK** dan **TILE SELECTION** telah diuji secara independen. Status expand/collapse, `aria-expanded`, label aksesibel, dan kelas `right-wide` diperiksa. Deret aksi kanan atas tetap dalam mode lebar selama setidaknya satu panel masih expand.
2. Kontrol elevasi tetap nonaktif sebelum tile dipilih karena kontrol bekerja pada tile aktif. Inspector sekarang menampilkan instruksi eksplisit untuk memilih tile. Setelah tile dipilih, tombol `+` aktif dan tombol `−` aktif hanya jika elevasi lebih besar dari 0.
3. Elevasi diuji sebagai state per tile. Nilai tile lain tetap tersimpan saat seleksi berpindah. Level minimum 0 dan 1 level = 8 px diperiksa pada berbagai input valid dan invalid.
4. Hit-test dan render diperiksa untuk bidang atas, sisi kiri/kanan, perbedaan elevasi dengan tetangga, serta tinggi canvas berdasarkan elevasi maksimum.
5. Ditambahkan server lokal `npm run dev`. Ini penting karena aplikasi menggunakan ES modules: membuka `index.html` langsung melalui `file://` dapat membuat browser memblokir impor modul, sehingga handler panel dan elevasi tidak terpasang. Halaman sekarang menampilkan petunjuk saat dibuka melalui `file://`.

## Matriks cakupan

- Semua 144 koordinat tile dan 1.008 kombinasi top-face (144 tile × 7 level) pada kondisi bidang terlihat.
- 80.000 titik deterministik untuk membandingkan hit-test dengan oracle dan implementasi exhaustive sebelumnya.
- Elevasi: level 0, 1, 2, 3, 4, 8, 16, 32, 64, 128, 256, 1.024; bilangan pecahan; nilai negatif; `NaN`; dan `Infinity`.
- Elevasi tetangga: tinggi sama, lebih rendah, dan selisih level; verifikasi sisi volume serta hit-test sisi.
- UI: panel atas/bawah, ekspansi satu atau dua panel, collapse berurutan, status aksesibilitas, pemilihan tile, perubahan elevasi, seleksi kosong, dan pergantian tile.
- Viewport/DPR: 390×844 @1, 768×900 @1.25, 1.280×720 @1.5, dan 1.920×1.080 @2; zoom dan pan dalam matriks yang lebih luas.
- Server: halaman utama, `plane.js`, `src/interaction.js`, `src/ui.js`, `src/elevation.js`, MIME type, GET/HEAD, method tidak didukung, path hilang, dan perlindungan traversal.

## Batasan verifikasi browser

Chromium headless 144.0.7559.96 dicoba melalui HTTP lokal dengan mode headless dan variasi opsi startup. Proses browser berhenti merespons sebelum mengembalikan DOM/screenshot, termasuk pada percobaan dengan single-process. Karena itu, pemeriksaan visual langsung dan klik mouse melalui browser tidak dapat diklaim lulus. Interaksi diuji melalui harness Node yang menjalankan fungsi UI dan interaksi aplikasi dengan event DOM tiruan; server HTTP diuji melalui request nyata.

## Menjalankan aplikasi

```sh
npm run dev
```

Lalu buka `http://127.0.0.1:4173/`. Pilih tile pada canvas untuk mengaktifkan kontrol elevasi di panel kanan bawah.

## Menjalankan ulang pengujian

```sh
npm test
```
