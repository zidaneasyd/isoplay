# Alur Plane Isometrik

## 1. Halaman dibuka

Aplikasi dijalankan melalui `npm run dev` dan dibuka melalui HTTP lokal. Browser memuat ES module `plane.js` beserta modul internal. Jika `index.html` dibuka langsung sebagai `file://`, aplikasi menampilkan petunjuk server lokal karena browser memblokir impor module lintas file. Browser menempatkan plane 12 kolom × 12 baris di tengah viewport. Bidang dasar berukuran 768 × 384 CSS px; setiap tile berukuran 64 × 32 CSS px. Saat ada tile yang dinaikkan, canvas menambah ruang vertikal mengikuti elevasi maksimum agar permukaan atas tidak terpotong. Canvas memiliki backing resolution sesuai device-pixel-ratio untuk tampilan tajam.

## 2. Tampilan awal

Latar halaman berwarna `#141414`. Semua tile memiliki warna isi `#383838` dengan garis pemisah `#484848` setebal 1 px. Belum ada tile aktif, dan petunjuk di sudut layar meminta pengguna mengarahkan kursor ke tile.

## 3. Kursor memasuki tile

Posisi kursor dikonversi dari koordinat layar ke koordinat lokal plane menggunakan bounding rectangle aktual dan faktor zoom. Tile yang terkena hover mendapat stroke 2 px. Readout menampilkan kolom dan baris berbasis 1 untuk dibaca manusia serta koordinat `[kolom, baris]` berbasis 0 untuk penggunaan program.

## 4. Tile dipilih

Klik kiri tile yang di-hover untuk menjadikannya aktif. Tile aktif berubah menjadi `#6f5a93` dengan stroke `#9a86bd` setebal 2 px. Jika kursor meninggalkan plane, tile tetap aktif dan readout tetap menampilkan koordinat tile aktif. Klik kanan dan klik tengah tidak memilih tile.

## 5. Tile aktif diganti atau dinonaktifkan

Klik tile lain untuk memindahkan status aktif ke tile tersebut. Klik tile aktif sekali lagi untuk menonaktifkannya; isi kembali ke `#383838` dan stroke kembali mengikuti keadaan hover atau garis normal.

## 6. Elevasi tile

Elevasi disimpan per tile. Nilai awal dan nilai terendah adalah level `0`. Tombol `+` pada panel TILE SELECTION menaikkan level satu langkah, sedangkan tombol `−` menurunkannya satu langkah dan berhenti di level 0. Kedua tombol baru aktif setelah tile dipilih; pada kondisi kosong, inspector memberi petunjuk untuk memilih tile pada canvas terlebih dahulu. Satu level setara dengan perpindahan vertikal 8 CSS px.

Permukaan atas tile digeser ke atas sesuai level. Dua bidang samping isometrik digambar pada sisi kiri dan kanan yang menghadap depan, dengan tinggi sisi mengikuti selisih elevasi terhadap tile tetangga. Permukaan atas dan sisi tile berelevasi dapat di-hover dan dipilih. Menurunkan tile tidak mengubah elevasi tile lain.

## 7. Zoom

Roda mouse memperbesar atau memperkecil plane dengan rentang 0.25× sampai 4×. Titik plane yang berada tepat di bawah kursor dipertahankan pada posisi layar yang sama, baik saat zoom in maupun zoom out. Ukuran layout CSS tidak berubah; zoom diterapkan pada transformasi board. Backing resolution canvas ikut disesuaikan agar hasil render tetap tajam, dan ketebalan garis dikompensasi agar tampilan garis stabil.

Input wheel dinormalisasi untuk mode pixel, line, dan page sehingga perangkat dengan pengaturan roda berbeda tetap memiliki perilaku yang konsisten.

## 8. Pan

Tekan dan tahan tombol tengah mouse, lalu gerakkan pointer untuk menggeser plane. Gerakan pan diukur dalam piksel layar sehingga konsisten pada seluruh level zoom. Drag berakhir saat `pointerup`, `pointercancel`, atau pointer capture hilang.

## 9. Hit-test dan render

Koordinat pointer diubah ke sumbu isometrik kolom/baris. Pada bidang dasar, hit-test hanya memeriksa kandidat tile di sekitar koordinat pointer. Ketika ada elevasi, permukaan atas dan dua bidang samping diperiksa dari urutan gambar paling depan ke belakang sebelum bidang dasar. Urutan painter menjaga hasil pemilihan tetap sesuai geometri yang terlihat. Path isi tile dasar dan grid dibatch untuk mengurangi jumlah pemanggilan canvas.

Highlight/seleksi dengan indeks di luar grid diabaikan. Tile aktif yang valid tetap diprioritaskan jika posisi hover berada pada tile yang sama.

## 10. Perubahan ukuran viewport

Saat viewport berubah ukuran, board tetap dipusatkan oleh layout dan canvas dirender ulang mengikuti device-pixel-ratio terbaru. Status tile aktif dan posisi pan/zoom dipertahankan.
