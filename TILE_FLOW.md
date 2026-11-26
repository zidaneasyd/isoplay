# Alur Plane Isometrik

## 1. Halaman dibuka

Browser menempatkan plane 12 kolom × 12 baris di tengah viewport. Ukuran layout plane dan canvas selalu 768 × 384 CSS px; setiap tile berukuran 64 × 32 CSS px. Canvas memiliki backing resolution sesuai device-pixel-ratio untuk tampilan tajam.

## 2. Tampilan awal

Latar halaman berwarna `#141414`. Semua tile memiliki warna isi `#383838` dengan garis pemisah `#484848` setebal 1 px. Belum ada tile aktif, dan petunjuk di sudut layar meminta pengguna mengarahkan kursor ke tile.

## 3. Kursor memasuki tile

Posisi kursor dikonversi dari koordinat layar ke koordinat lokal plane menggunakan bounding rectangle aktual dan faktor zoom. Tile yang terkena hover mendapat stroke 2 px. Readout menampilkan kolom dan baris berbasis 1 untuk dibaca manusia serta koordinat `[kolom, baris]` berbasis 0 untuk penggunaan program.

## 4. Tile dipilih

Klik kiri tile yang di-hover untuk menjadikannya aktif. Tile aktif berubah menjadi `#6f5a93` dengan stroke `#9a86bd` setebal 2 px. Jika kursor meninggalkan plane, tile tetap aktif dan readout tetap menampilkan koordinat tile aktif. Klik kanan dan klik tengah tidak memilih tile.

## 5. Tile aktif diganti atau dinonaktifkan

Klik tile lain untuk memindahkan status aktif ke tile tersebut. Klik tile aktif sekali lagi untuk menonaktifkannya; isi kembali ke `#383838` dan stroke kembali mengikuti keadaan hover atau garis normal.

## 6. Zoom

Roda mouse memperbesar atau memperkecil plane dengan rentang 0.25× sampai 4×. Titik plane yang berada tepat di bawah kursor dipertahankan pada posisi layar yang sama, baik saat zoom in maupun zoom out. Ukuran layout CSS tidak berubah; zoom diterapkan pada transformasi board. Backing resolution canvas ikut disesuaikan agar hasil render tetap tajam, dan ketebalan garis dikompensasi agar tampilan garis stabil.

Input wheel dinormalisasi untuk mode pixel, line, dan page sehingga perangkat dengan pengaturan roda berbeda tetap memiliki perilaku yang konsisten.

## 7. Pan

Tekan dan tahan tombol tengah mouse, lalu gerakkan pointer untuk menggeser plane. Gerakan pan diukur dalam piksel layar sehingga konsisten pada seluruh level zoom. Drag berakhir saat `pointerup`, `pointercancel`, atau pointer capture hilang.

## 8. Hit-test dan render

Koordinat pointer diubah ke sumbu isometrik kolom/baris. Hit-test hanya memeriksa kandidat tile yang berada di sekitar koordinat itu, bukan memindai seluruh 144 tile. Urutan baris/kolom dipertahankan agar tile pada shared edge selalu diputuskan secara deterministik. Path isi tile dan grid dibatch untuk mengurangi jumlah pemanggilan canvas.

Highlight/seleksi dengan indeks di luar grid diabaikan. Tile aktif yang valid tetap diprioritaskan jika posisi hover berada pada tile yang sama.

## 9. Perubahan ukuran viewport

Saat viewport berubah ukuran, board tetap dipusatkan oleh layout dan canvas dirender ulang mengikuti device-pixel-ratio terbaru. Status tile aktif dan posisi pan/zoom dipertahankan.
