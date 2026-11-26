# Ringkasan Pengujian Tambahan

Pengujian Claude ditinjau dan sebagian besar ide yang relevan sudah dipetakan ke arsitektur modul yang ada, bukan menyalin tes yang mengandalkan API dari rancangan ulang Claude yang berbeda. Tes yang asumsi awalnya tidak tepat juga dikalibrasi ulang: wheel line-mode dibandingkan dengan jarak pixel yang setara, sedangkan saat drag yang dipertahankan adalah tile yang sedang digenggam di bawah pointer.

## Yang diadopsi

- Hit-test seluruh tile, area dalam diamond, shared edge/corner, nilai invalid, serta 40.000 titik pseudo-acak.
- Pembandingan kedua dengan 40.000 titik lain terhadap algoritma exhaustive lama untuk memastikan optimasi hit-test tidak mengubah hasil dan urutan tie-break.
- Matriks viewport dan DPR dengan cursor tetap pada tile yang sama sepanjang zoom in/out hingga mencapai batas skala.
- Zoom anchor setelah pan, kesetaraan wheel pixel-mode dan line-mode, data wheel invalid, dan `preventDefault`.
- Interaksi pointer: klik tanpa pointermove, tile yang digenggam selama drag, pointerleave ketika drag, pembatalan drag, serta pointer-capture loss.
- Tes browser berbasis iframe untuk layout aktual pada beragam ukuran viewport dan resize ketika zoom maksimum.

Tes yang bergantung pada frame-scheduler atau API lifecycle `destroy()` dari rancangan Claude tidak disalin karena implementasi aplikasi ini tidak memakai scheduler tersebut dan belum menyediakan kontrak lifecycle itu.

## Perubahan implementasi yang menyertai pengujian

- `hitTestTile` diubah dari pemindaian 144 tile menjadi pencarian kandidat berbatasan pada koordinat isometrik. Hasilnya diuji terhadap dua oracle.
- `drawPlane` menggabungkan isi tile dan garis grid ke path canvas yang dibatch, mengurangi draw call untuk keadaan normal dari 144 fill + 145 stroke menjadi 1 fill + 2 stroke.
- Highlight dan seleksi dengan indeks di luar grid sekarang diabaikan; indeks tile aktif yang invalid tidak masuk ke state.

## Catatan status

Tes Node.js dapat dijalankan dengan `npm test`. Halaman `checks/scenarios.html` disiapkan untuk browser sungguhan. Browser headless pada lingkungan pengembangan ini macet bahkan saat membuka `about:blank`, sehingga hasil dari halaman browser lintas viewport belum dapat dikonfirmasi di lingkungan ini dan perlu dijalankan pada Chrome/Firefox desktop.
