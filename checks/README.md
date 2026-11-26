# Pengecekan aplikasi

Jalankan suite otomatis dari folder utama proyek dengan `npm test`. Suite ini menggunakan test runner bawaan Node.js dan tidak memerlukan instalasi paket tambahan.

`index.html` menjalankan pengecekan komponen dan integrasi plane di browser. Halaman ini menguji ukuran, proyeksi dan hit-test 144 tile, koordinat di luar plane, pemilihan tile, warna isi, stroke hover/aktif, serta alur pointer dan klik.

Jalankan server lokal dari folder utama proyek:

```sh
python -m http.server 8000
```

Buka `http://localhost:8000/checks/`. Halaman menampilkan jumlah pengecekan yang lulus atau gagal beserta rincian setiap pengecekan. ES module memerlukan halaman yang dilayani melalui HTTP, bukan dibuka langsung sebagai `file://`.
