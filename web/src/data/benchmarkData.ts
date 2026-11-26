export interface ModelMetricRow {
  model: string;
  keluarga: 'XGBoost' | 'LightGBM' | 'CatBoost';
  profil: 'insiden tetangga' | 'laju tetangga' | 'lokal';
  nVal2024: number;
  maeVal2024Pp: number;
  rmseVal2024Pp: number;
  r2Val2024: number;
  nTest2025?: number;
  maeTest2025Pp?: number;
  rmseTest2025Pp?: number;
  r2Test2025?: number;
  isSelected?: boolean;
}

export interface GlobalShapRow {
  feature: string;
  label: string;
  totalAbsShapPp: number;
}

export interface CoverageRow {
  tahun: number;
  tcResmi: number;
  tcKosong: number;
  estimasiInsidenAsli: number;
}

export const COVERAGE_SUMMARY: CoverageRow[] = [
  { tahun: 2023, tcResmi: 154, tcKosong: 0, estimasiInsidenAsli: 154 },
  { tahun: 2024, tcResmi: 71, tcKosong: 83, estimasiInsidenAsli: 26 },
  { tahun: 2025, tcResmi: 57, tcKosong: 97, estimasiInsidenAsli: 0 },
];

export const GRAPH_STATS = {
  wilayah: 154,
  pasanganBatas: 315,
  wilayahDipotongLima: 43,
  distribusiTetangga: [
    { jumlah: 0, wilayah: 8 },
    { jumlah: 1, wilayah: 20 },
    { jumlah: 2, wilayah: 14 },
    { jumlah: 3, wilayah: 18 },
    { jumlah: 4, wilayah: 26 },
    { jumlah: 5, wilayah: 68 },
  ],
};

export const SELECTED_MODEL_NAME = 'XGBoost L2 d3 [insiden tetangga]';

export const FINALIST_TEST_METRICS: ModelMetricRow[] = [
  {
    model: 'XGBoost L2 d3 [insiden tetangga]',
    keluarga: 'XGBoost',
    profil: 'insiden tetangga',
    nVal2024: 71,
    maeVal2024Pp: 13.877,
    rmseVal2024Pp: 18.274,
    r2Val2024: 0.433,
    nTest2025: 57,
    maeTest2025Pp: 13.688,
    rmseTest2025Pp: 19.433,
    r2Test2025: 0.243,
    isSelected: true,
  },
  {
    model: 'LightGBM Huber d2 [insiden tetangga]',
    keluarga: 'LightGBM',
    profil: 'insiden tetangga',
    nVal2024: 71,
    maeVal2024Pp: 14.179,
    rmseVal2024Pp: 18.938,
    r2Val2024: 0.391,
    nTest2025: 57,
    maeTest2025Pp: 14.755,
    rmseTest2025Pp: 20.676,
    r2Test2025: 0.143,
  },
  {
    model: 'CatBoost Huber d3 [insiden tetangga]',
    keluarga: 'CatBoost',
    profil: 'insiden tetangga',
    nVal2024: 71,
    maeVal2024Pp: 15.0,
    rmseVal2024Pp: 19.36,
    r2Val2024: 0.364,
    nTest2025: 57,
    maeTest2025Pp: 14.821,
    rmseTest2025Pp: 19.842,
    r2Test2025: 0.21,
  },
  {
    model: 'XGBoost L2 d1 [lokal]',
    keluarga: 'XGBoost',
    profil: 'lokal',
    nVal2024: 71,
    maeVal2024Pp: 15.372,
    rmseVal2024Pp: 0,
    r2Val2024: 0,
    nTest2025: 57,
    maeTest2025Pp: 14.605,
    rmseTest2025Pp: 20.751,
    r2Test2025: 0.136,
  },
];

export const TOP_10_VALIDATION_2024: ModelMetricRow[] = [
  {
    model: 'XGBoost L2 d3 [insiden tetangga]',
    keluarga: 'XGBoost',
    profil: 'insiden tetangga',
    nVal2024: 71,
    maeVal2024Pp: 13.877,
    rmseVal2024Pp: 18.274,
    r2Val2024: 0.433,
    isSelected: true,
  },
  {
    model: 'LightGBM Huber d2 [insiden tetangga]',
    keluarga: 'LightGBM',
    profil: 'insiden tetangga',
    nVal2024: 71,
    maeVal2024Pp: 14.179,
    rmseVal2024Pp: 18.938,
    r2Val2024: 0.391,
  },
  {
    model: 'XGBoost pseudo-Huber d2 [insiden tetangga]',
    keluarga: 'XGBoost',
    profil: 'insiden tetangga',
    nVal2024: 71,
    maeVal2024Pp: 14.333,
    rmseVal2024Pp: 18.856,
    r2Val2024: 0.397,
  },
  {
    model: 'XGBoost L2 d3 [laju tetangga]',
    keluarga: 'XGBoost',
    profil: 'laju tetangga',
    nVal2024: 71,
    maeVal2024Pp: 14.633,
    rmseVal2024Pp: 18.871,
    r2Val2024: 0.396,
  },
  {
    model: 'XGBoost L2 d1 [laju tetangga]',
    keluarga: 'XGBoost',
    profil: 'laju tetangga',
    nVal2024: 71,
    maeVal2024Pp: 14.666,
    rmseVal2024Pp: 20.152,
    r2Val2024: 0.311,
  },
  {
    model: 'XGBoost L2 d2 [laju tetangga]',
    keluarga: 'XGBoost',
    profil: 'laju tetangga',
    nVal2024: 71,
    maeVal2024Pp: 14.765,
    rmseVal2024Pp: 19.688,
    r2Val2024: 0.342,
  },
  {
    model: 'LightGBM Huber d2 [laju tetangga]',
    keluarga: 'LightGBM',
    profil: 'laju tetangga',
    nVal2024: 71,
    maeVal2024Pp: 14.794,
    rmseVal2024Pp: 19.681,
    r2Val2024: 0.343,
  },
  {
    model: 'XGBoost pseudo-Huber d2 [laju tetangga]',
    keluarga: 'XGBoost',
    profil: 'laju tetangga',
    nVal2024: 71,
    maeVal2024Pp: 14.958,
    rmseVal2024Pp: 19.662,
    r2Val2024: 0.344,
  },
  {
    model: 'CatBoost Huber d3 [insiden tetangga]',
    keluarga: 'CatBoost',
    profil: 'insiden tetangga',
    nVal2024: 71,
    maeVal2024Pp: 15.0,
    rmseVal2024Pp: 19.36,
    r2Val2024: 0.364,
  },
  {
    model: 'XGBoost L2 d2 [insiden tetangga]',
    keluarga: 'XGBoost',
    profil: 'insiden tetangga',
    nVal2024: 71,
    maeVal2024Pp: 15.009,
    rmseVal2024Pp: 19.551,
    r2Val2024: 0.351,
  },
];

export const GLOBAL_SHAP_97_MISSING: GlobalShapRow[] = [
  { feature: 'kepadatan_jiwa_km2', label: 'Kepadatan penduduk', totalAbsShapPp: 605.81 },
  { feature: 'kasus_tetangga_3', label: 'Estimasi kasus tetangga 3', totalAbsShapPp: 373.93 },
  { feature: 'kasus_tetangga_4', label: 'Estimasi kasus tetangga 4', totalAbsShapPp: 248.7 },
  { feature: 'penduduk_jiwa', label: 'Jumlah penduduk', totalAbsShapPp: 221.99 },
  { feature: 'kasus_tetangga_1', label: 'Estimasi kasus tetangga 1', totalAbsShapPp: 217.25 },
  { feature: 'rt_hunian_layak_pct', label: 'Hunian layak (%)', totalAbsShapPp: 205.79 },
  { feature: 'kasus_tetangga_2', label: 'Estimasi kasus tetangga 2', totalAbsShapPp: 193.25 },
  { feature: 'puskesmas_per_100rb_penduduk', label: 'Puskesmas / 100 ribu', totalAbsShapPp: 148.09 },
  { feature: 'wilayah_kota', label: 'Status kota', totalAbsShapPp: 106.31 },
  { feature: 'penduduk_miskin_pct', label: 'Penduduk miskin (%)', totalAbsShapPp: 50.43 },
  { feature: 'kasus_tetangga_5', label: 'Estimasi kasus tetangga 5', totalAbsShapPp: 40.77 },
];

export const FEATURE_LABELS: Record<string, string> = {
  penduduk_jiwa: 'Jumlah penduduk',
  kepadatan_jiwa_km2: 'Kepadatan penduduk',
  penduduk_miskin_pct: 'Penduduk miskin (%)',
  rt_hunian_layak_pct: 'Hunian layak (%)',
  puskesmas_per_100rb_penduduk: 'Puskesmas / 100 ribu',
  wilayah_kota: 'Status kota',
  kasus_tetangga_1: 'Estimasi kasus tetangga 1',
  kasus_tetangga_2: 'Estimasi kasus tetangga 2',
  kasus_tetangga_3: 'Estimasi kasus tetangga 3',
  kasus_tetangga_4: 'Estimasi kasus tetangga 4',
  kasus_tetangga_5: 'Estimasi kasus tetangga 5',
};

export const NOTEBOOK_BENCHMARK_57 = {
  Merata: 113.34,
  'Berdasarkan penduduk': 111.15,
  'TRACK-TB': 148.53,
  'Beban TC asli': 127.15,
};

export const NOTEBOOK_BENCHMARK_154 = {
  Merata: 140.68,
  'Berdasarkan penduduk': 154.43,
  'Proyeksi beban': 172.95,
};
