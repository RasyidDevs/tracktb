export type MainTab = 'peta' | 'shap' | 'simulasi' | 'model';
export type MapMetric = 'defisit' | 'prediksi' | 'kuota' | 'beban';
export type BasemapMode = 'osm_hijau' | 'osm_standar' | 'polos';
export type SimScope = 'validasi57' | 'proyeksi154';
export type StrategyKey =
  | 'Merata'
  | 'Berdasarkan penduduk'
  | 'TRACK-TB'
  | 'Beban TC asli'
  | 'Proyeksi beban';

export interface ShapFeatureItem {
  feature: string;
  label: string;
  value: number | null;
  contributionPp: number;
  neighborCode?: string;
  neighborName?: string;
}

export interface NeighborLink {
  kodeBps: string;
  nama: string;
  provinsi: string;
  borderKm: number;
  kasusTetangga: number;
  centroid: [number, number];
  shapPp: number;
}

export interface RegionRecord {
  kodeBps: string;
  kodeKemendagri: string;
  provinsiKode: string;
  provinsi: string;
  kabupatenKota: string;
  jenisWilayah: 'Kota' | 'Kabupaten';
  centroid: [number, number];
  penduduk2023: number;
  penduduk2024: number;
  penduduk2025: number;
  kepadatanJiwaKm2: number;
  pendudukMiskinPct: number;
  rtHunianLayakPct: number;
  puskesmasPer100rb: number;
  insiden2023: number;
  insiden2024: number;
  insiden2025Proyeksi: number;
  tcAsli2024: number | null;
  tcPrediksi2024: number;
  tcAsli2025: number | null;
  tcPrediksi2025: number;
  tcPrediksiXgboost: number;
  tcPrediksiLightgbm: number;
  tcPrediksiCatboost: number;
  sumberTc2025: 'resmi' | 'estimasi model';
  jumlahTetanggaTersedia: number;
  jumlahTetanggaDipakai: number;
  neighbors: NeighborLink[];
  shapBasePct: number;
  shapItems: ShapFeatureItem[];
}

export interface StrategyResultRow {
  strategi: StrategyKey;
  skrining: number;
  ekspektasiKasus: number;
  kasusPer1000Skrining: number;
  selisihVsMerata: number;
  selisihVsPenduduk: number;
}

export interface RegionAllocationRow {
  kodeBps: string;
  kabupatenKota: string;
  provinsi: string;
  tcPrediksi2024: number;
  tcAsli2024: number | null;
  selisihTc2024Pp: number | null;
  tcPrediksi2025: number;
  tcAsli2025: number | null;
  selisihTc2025Pp: number | null;
  bebanKasus: number;
  gapStruktural: number;
  gapProgramatik: number;
  alokasi: Record<string, number>;
  ekspektasiKasus: Record<string, number>;
}
