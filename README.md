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
- **Simulasi Alokasi Skrining Interaktif:** Menguji strategi `Merata`, `Berdasarkan penduduk`, `TRACK-TB`, `Beban TC asli`, dan `Proyeksi beban` dengan slider anggaran skrining dan faktor temu, serta memproyeksikan kuotanya langsung ke tinggi poligon 3D.
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

**Validasi pada 57 wilayah dengan TC resmi 2024 dan 2025:**

| Strategi | Skrining | Ekspektasi Kasus | Kasus per 1.000 Skrining | Selisih vs Penduduk |
|---|---:|---:|---:|---:|
| **TRACK-TB** | **100.000** | **148,53** | **1,49** | **+37,38** |
| Beban TC asli | 100.000 | 127,15 | 1,27 | +16,00 |
| Merata | 100.000 | 113,34 | 1,13 | +2,20 |
| Berdasarkan penduduk | 100.000 | 111,15 | 1,11 | 0,00 |

**Proyeksi pada 154 wilayah se-Sumatera:**

| Strategi | Skrining | Ekspektasi Kasus | Kasus per 1.000 Skrining | Selisih vs Penduduk |
|---|---:|---:|---:|---:|
| **Proyeksi beban** | **100.000** | **172,95** | **1,73** | **+18,53** |
| Berdasarkan penduduk | 100.000 | 154,43 | 1,54 | 0,00 |
| Merata | 100.000 | 140,68 | 1,41 | -13,75 |

---

## Struktur Direktori

```text
tracktb/
├── data/
│   ├── TRACK-TB_Join_Sumatera_2023.xlsx
│   ├── TRACK-TB_Join_Sumatera_2024.xlsx
│   └── TRACK-TB_Join_Sumatera_2025.xlsx
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
