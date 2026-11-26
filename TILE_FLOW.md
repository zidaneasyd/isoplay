# Alur Plane Isometrik

## 1. Halaman dibuka

Browser menggambar plane 12 kolom × 12 baris di tengah area layar. Canvas berukuran tetap 768 × 384 CSS px; setiap tile diamond berukuran 64 × 32 CSS px. Ukuran tile tidak berubah mengikuti resolusi monitor. Pada layar yang lebih kecil, halaman dapat digulir untuk melihat seluruh plane.

## 2. Tampilan awal

Latar halaman berwarna `#141414`. Semua tile memiliki warna isi `#383838` dengan garis pemisah `#484848` setebal 1 px. Belum ada tile aktif, dan petunjuk di sudut layar meminta pengguna mengarahkan kursor ke tile.

## 3. Kursor memasuki tile

Posisi kursor diuji terhadap bentuk diamond tile di koordinat plane. Tile yang terkena hover mendapat stroke 2 px. Readout menampilkan kolom dan baris berbasis 1 untuk dibaca manusia serta koordinat `[kolom, baris]` berbasis 0 untuk penggunaan program.

## 4. Tile dipilih

Tile yang di-hover berubah menjadi `#8f7438` dengan stroke `#c3a85f` setebal 2 px. Klik tile yang sedang di-hover untuk menjadikannya aktif. Tile aktif berubah menjadi `#6f5a93` dengan stroke `#9a86bd` setebal 2 px. Jika kursor meninggalkan plane, tile tetap aktif dan readout tetap menampilkan koordinat tile aktif.

## 5. Tile aktif diganti atau dinonaktifkan

Klik tile lain untuk memindahkan status aktif ke tile tersebut. Klik tile aktif sekali lagi untuk menonaktifkannya; isi kembali ke `#383838` dan stroke kembali mengikuti keadaan hover atau garis normal.
