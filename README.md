# Frontend Static Version

Folder ini adalah versi frontend-only dari aplikasi mental health, dibuat terpisah agar kode Flask/Python lama tetap aman.

## Isi

- `index.html`: landing page / navigasi utama
- `fuzzy.html`: halaman fuzzy stress
- `expert.html`: halaman sistem pakar
- `dataset.html`: halaman statistik dan validasi CSV
- `styles.css`: styling bersama
- `app.js`: logika fuzzy, sistem pakar, dan validasi dataset di browser
- `data/stress_dataset.csv`: dataset lokal untuk statistik dan validasi

## Deploy ke Vercel atau Netlify

Karena ini static site biasa, cukup arahkan deploy ke folder `frontend-static`.

### Vercel

- Framework preset: `Other`
- Root directory: `frontend-static`
- Build command: kosongkan
- Output directory: `.`

### Netlify

- Base directory: `frontend-static`
- Build command: kosongkan
- Publish directory: `.`

## Catatan

- Tidak membutuhkan Python, Flask, atau API backend.
- Semua perhitungan dilakukan di browser pengguna.
- Jika ingin domain route terpisah per halaman, kita bisa lanjut ubah menjadi struktur multi-page atau Vite SPA.
