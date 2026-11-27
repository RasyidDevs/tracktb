<p align="center">
  <img src="web/public/track-tb-logo.png" width="64" alt="Logo TRACK-TB" />
</p>

<h1 align="center">TRACK-TB Sumatera</h1>

<p align="center">
  <strong>Pemetaan Kesenjangan Penemuan Kasus Tuberkulosis di Pulau Sumatera Berbasis Machine Learning Spasial dan Simulasi Alokasi Skrining</strong>
</p>

<p align="center">
  <a href="https://track-tb.vercel.app"><strong>Buka Web Prototype Live</strong></a>
  &nbsp;|&nbsp;
  <a href="https://github.com/RasyidDevs/tracktb"><strong>Repository GitHub</strong></a>
</p>

---

## Tautan Penting

- **Web Prototype (Peta 3D & Simulasi Skrining):** https://track-tb.vercel.app
- **Repository GitHub:** https://github.com/RasyidDevs/tracktb

---

## Ringkasan Proyek

**TRACK-TB** (*Targeted Regional Analysis of Case-finding gaps by Kabupaten*) dikembangkan untuk kompetisi **Essay Quest (EQ) Dateraquest 2.0** (HMSD Adyatama, Sains Data ITERA). Proyek ini memetakan kesenjangan penemuan kasus tuberkulosis (*Treatment Coverage* / TC resmi) di **154 kabupaten/kota Pulau Sumatera** menggunakan model gradien pohon dengan fitur spasial graf batas administratif (`315` pasangan batas, maksimal `5` tetangga per wilayah) serta menyimulasikan alokasi kuota skrining untuk menjangkau lebih banyak kasus yang belum ternotifikasi.

### Fitur Utama Web Prototype (`web/`)

- **Peta Spasial 3D Interaktif (MapLibre GL JS + Three.js):** Poligon ekstrusi 3D untuk 154 kabupaten/kota di atas peta dasar OpenStreetMap (`OSM Hijau`, `OSM Standar`, `Kanvas Terang`) dengan beacon vertikal dan busur parabolik 3D ke wilayah tetangga.
- **Audit Defisit & Dekomposisi:** Menampilkan TC resmi 2025 (57 wilayah di 4 provinsi), estimasi model untuk 97 wilayah tanpa laporan resmi 2025, kesepakatan XGBoost/LightGBM/CatBoost, serta pemisahan kesenjangan struktural dan programatik.
- **Penjelasan TreeSHAP Lokal & Global:** Rincian kontribusi tiap fitur (dalam poin persentase) yang dapat diklik untuk menyorot busur 3D tetangga di peta.
- **Simulasi Alokasi Skrining Interaktif:** Dua pengujian bergulir (uji 2025 pada 57 wilayah dan uji 2024 pada 71 wilayah) untuk strategi `Merata`, `Berdasarkan penduduk`, `TRACK-TB`, `Beban kasus hilang`, serta dua pembanding tanpa model (`Kepadatan kasus hilang`, `TC rendah`), dengan slider anggaran skrining dan faktor temu. Kuota strategi terpilih diproyeksikan ke tinggi poligon 3D.
- **Impor CSV Langsung:** Mendukung unggah berkas `prediksi_tc_2025.csv` dari notebook untuk memperbarui visualisasi secara langsung di browser.

---

## Ringkasan Hasil Model & Simulasi

Model dilatih menggunakan data tahun **2023** (`154` wilayah), dipilih berdasarkan MAE validasi **2024** (`71` wilayah), lalu diuji pada tahun **2025** (`57` wilayah berlabel resmi) tanpa memasukkan TC historis maupun estimasi insiden wilayah target sebagai fitur.

### Performa Finalis pada Uji 2025 (`n = 57`)

| Model | MAE Validasi 2024 (pp) | MAE Uji 2025 (pp) | RMSE Uji 2025 (pp) | R² Uji 2025 |
|---|---:|---:|---:|---:|
| **XGBoost L2 d3 [insiden tetangga]** | **13,877** | **13,688** | **19,433** | **0,243** |
| LightGBM Huber d2 [insiden tetangga] | 14,179 | 14,755 | 20,676 | 0,143 |
| CatBoost Huber d3 [insiden tetangga] | 15,000 | 14,821 | 19,842 | 0,210 |
| XGBoost L2 d1 [lokal] | 15,372 | 14,605 | 20,751 | 0,136 |

### Simulasi 100.000 Skrining (Faktor Temu Asumsi `0,80`)

Alokasi disusun dengan informasi tahun *t*, lalu dinilai dengan TC resmi tahun *t* + 1. Wilayah tanpa TC resmi tidak diikutsertakan. Karena model dilatih dengan data 2023, selisih TC 2023 memakai prediksi *out-of-fold* lima lipatan (rata-rata 10 pembagian acak, `prediksi_tc_2023_oof.csv`).

| Strategi | Uji 2024 (71 wilayah) | Uji 2025 (57 wilayah) |
|---|---:|---:|
| **TRACK-TB** | **161,47** | **148,53** |
| Kepadatan kasus hilang (tanpa model) | 150,43 | 136,43 |
| TC rendah (tanpa model) | 147,08 | 134,30 |
| Beban kasus hilang | 129,80 | 127,15 |
| Merata | 129,47 | 113,34 |
| Berdasarkan penduduk | 116,56 | 111,15 |

Nilai adalah ekspektasi kasus tambahan ditemukan menurut model, bukan hasil lapangan. Pada uji 2024, TRACK-TB tertinggi pada 10 dari 10 pembagian *out-of-fold* (rentang 154,9–172,2 kasus).

---

## Struktur Direktori

```text
tracktb/
├── data/
│   ├── TRACK-TB_Join_Sumatera_2023.xlsx
│   ├── TRACK-TB_Join_Sumatera_2024.xlsx
│   └── TRACK-TB_Join_Sumatera_2025.xlsx
├── prediksi_tc_2023_oof.csv
├── prediksi_tc_2025.csv
├── research.ipynb
├── web/
│   ├── public/
│   │   ├── data/sumatra_kabkota.geojson
│   │   ├── track-tb-logo.png
│   │   ├── mascot-pointing.png
│   │   ├── mascot-tracktb.png
│   │   └── avatar-analis.png
│   ├── scripts/hydrate_real_data.py
│   ├── src/
│   └── vercel.json
└── README.md
```

---

## Menjalankan Prototype Secara Lokal

```bash
cd web
npm install
npm test
npm run dev
```

Untuk menyegarkan data `web/src/data/regions.json` langsung dari workbook Excel dan CSV di root repo:

```bash
python web/scripts/hydrate_real_data.py
```

---

## Tim Penyusun

- **Muhammad Rasyid Bomantoro Setya Putra** (Data dan visualisasi spasial)
- **Maria** (Penulisan ilmiah dan substansi)
- **Azka** (Pemodelan ML dan simulasi)

Institut Teknologi Sepuluh Nopember (ITS)
