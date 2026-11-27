import type { RegionAllocationRow, RegionRecord, SimScope, StrategyKey, StrategyResultRow } from '../types';

export function estimasiGap(insiden: number, tcPct: number): number {
  const safeInsiden = Math.max(0, insiden);
  const proporsiHilang = Math.min(1, Math.max(0, 1 - tcPct / 100));
  return safeInsiden * proporsiHilang;
}

export function hitungDekomposisiGap(insiden: number, tcPrediksiPct: number, tcAsliPct: number | null) {
  const gapStruktural = estimasiGap(insiden, Math.min(tcPrediksiPct, 100));
  if (tcAsliPct === null || !Number.isFinite(tcAsliPct)) {
    return {
      gapTotal: gapStruktural,
      gapStruktural,
      gapProgramatik: 0,
    };
  }
  const gapTotal = estimasiGap(insiden, tcAsliPct);
  const gapProgramatik = gapTotal - gapStruktural;
  return {
    gapTotal,
    gapStruktural,
    gapProgramatik,
  };
}

/**
 * Alokasi proporsional dengan batas kapasitas penduduk dan pembulatan sisa terbesar.
 * Port langsung dari `bagi_anggaran` di notebook Python.
 */
export function bagiAnggaran(
  codes: string[],
  kapasitasByCode: Record<string, number>,
  bobotByCode: Record<string, number>,
  anggaran: number,
): Record<string, number> {
  const totalKapasitas = codes.reduce((acc, code) => acc + Math.max(0, Math.floor(kapasitasByCode[code] ?? 0)), 0);
  if (!Number.isInteger(anggaran) || anggaran <= 0 || anggaran > totalKapasitas) {
    throw new Error('Anggaran harus bilangan bulat positif dan tidak melebihi total penduduk.');
  }

  const alokasi: Record<string, number> = {};
  for (const code of codes) {
    alokasi[code] = 0;
  }

  let sisaAnggaran = anggaran;
  while (sisaAnggaran > 0) {
    const ruang: Record<string, number> = {};
    const bobotAktif: Record<string, number> = {};
    let sumBobotAktif = 0;

    for (const code of codes) {
      const cap = Math.max(0, Math.floor(kapasitasByCode[code] ?? 0));
      const r = cap - alokasi[code];
      ruang[code] = r;
      const b = r > 0 ? Math.max(0, bobotByCode[code] ?? 0) : 0;
      bobotAktif[code] = b;
      sumBobotAktif += b;
    }

    if (sumBobotAktif <= 0) {
      for (const code of codes) {
        bobotAktif[code] = ruang[code];
        sumBobotAktif += ruang[code];
      }
    }

    const kuota: Record<string, number> = {};
    const penuhCodes: string[] = [];
    for (const code of codes) {
      const q = sumBobotAktif > 0 ? (sisaAnggaran * bobotAktif[code]) / sumBobotAktif : 0;
      kuota[code] = q;
      if (ruang[code] > 0 && q >= ruang[code]) {
        penuhCodes.push(code);
      }
    }

    if (penuhCodes.length > 0) {
      for (const code of penuhCodes) {
        alokasi[code] += ruang[code];
        sisaAnggaran -= ruang[code];
      }
      continue;
    }

    const bulat: Record<string, number> = {};
    let sumBulat = 0;
    for (const code of codes) {
      const fl = Math.floor(kuota[code]);
      bulat[code] = fl;
      alokasi[code] += fl;
      sumBulat += fl;
    }
    sisaAnggaran -= sumBulat;

    if (sisaAnggaran > 0) {
      const candidates = codes
        .filter((code) => ruang[code] > bulat[code] && bobotAktif[code] > 0)
        .map((code) => ({ code, frac: kuota[code] - bulat[code] }))
        .sort((a, b) => {
          if (b.frac !== a.frac) return b.frac - a.frac;
          return a.code.localeCompare(b.code);
        })
        .slice(0, sisaAnggaran);

      for (const item of candidates) {
        alokasi[item.code] += 1;
      }
      sisaAnggaran = 0;
    }
  }

  return alokasi;
}

export interface SimulationBundle {
  scope: SimScope;
  regionCount: number;
  summary: StrategyResultRow[];
  rows: RegionAllocationRow[];
  maxQuota: number;
}

/**
 * Pengujian bergulir, sama dengan research.ipynb:
 * - uji2025: bobot dari informasi 2024, dinilai dengan TC resmi 2025 (57 wilayah).
 * - uji2024: bobot dari informasi 2023 (TC prediksi out-of-fold), dinilai dengan TC resmi 2024 (71 wilayah).
 * Wilayah tanpa TC resmi pada tahun informasi atau tahun uji tidak diikutsertakan.
 */
export function runSimulasi(
  regions: RegionRecord[],
  scope: SimScope,
  anggaran: number,
  faktorTemu: number,
): SimulationBundle {
  const is2025 = scope === 'uji2025';
  const eligible = is2025
    ? regions.filter((r) => r.tcAsli2025 !== null && r.tcAsli2024 !== null)
    : regions.filter((r) => r.tcAsli2024 !== null && Number.isFinite(r.tcAsli2023));

  const sortedEligible = [...eligible].sort((a, b) => a.kodeBps.localeCompare(b.kodeBps));
  const codes = sortedEligible.map((r) => r.kodeBps);

  const kapasitasByCode: Record<string, number> = {};
  const merataByCode: Record<string, number> = {};
  const pendudukByCode: Record<string, number> = {};
  const trackTbByCode: Record<string, number> = {};
  const bebanByCode: Record<string, number> = {};
  const kepadatanByCode: Record<string, number> = {};
  const tcRendahByCode: Record<string, number> = {};
  const gapEvalByCode: Record<string, number> = {};

  for (const r of sortedEligible) {
    const pendudukUji = is2025 ? r.penduduk2025 : r.penduduk2024;
    const pendudukInfo = is2025 ? r.penduduk2024 : r.penduduk2023;
    const tcInfo = is2025 ? (r.tcAsli2024 as number) : r.tcAsli2023;
    const tcPrediksiInfo = is2025 ? r.tcPrediksi2024 : r.tcPrediksiOof2023;
    const insidenInfo = is2025 ? r.insiden2024 : r.insiden2023;
    const insidenUji = is2025 ? r.insiden2025Proyeksi : r.insiden2024;
    const tcUji = is2025 ? (r.tcAsli2025 as number) : (r.tcAsli2024 as number);

    kapasitasByCode[r.kodeBps] = Math.max(1, Math.round(pendudukUji));
    merataByCode[r.kodeBps] = 1;
    pendudukByCode[r.kodeBps] = kapasitasByCode[r.kodeBps];
    trackTbByCode[r.kodeBps] = Math.max(0, tcPrediksiInfo - tcInfo);
    bebanByCode[r.kodeBps] = estimasiGap(insidenInfo, tcInfo);
    kepadatanByCode[r.kodeBps] = bebanByCode[r.kodeBps] / Math.max(1, pendudukInfo);
    tcRendahByCode[r.kodeBps] = Math.max(0, 100 - tcInfo);
    gapEvalByCode[r.kodeBps] = estimasiGap(insidenUji, tcUji);
  }

  const totalCap = codes.reduce((acc, c) => acc + kapasitasByCode[c], 0);
  const clampedAnggaran = Math.min(Math.max(1000, Math.round(anggaran)), totalCap);

  const strategies: Array<{ key: StrategyKey; weights: Record<string, number> }> = [
    { key: 'Merata', weights: merataByCode },
    { key: 'Berdasarkan penduduk', weights: pendudukByCode },
    { key: 'TRACK-TB', weights: trackTbByCode },
    { key: 'Beban kasus hilang', weights: bebanByCode },
    { key: 'Kepadatan kasus hilang', weights: kepadatanByCode },
    { key: 'TC rendah', weights: tcRendahByCode },
  ];

  const allocByStrategy: Record<string, Record<string, number>> = {};
  const casesByStrategy: Record<string, Record<string, number>> = {};
  const totalCasesByStrategy: Record<string, number> = {};

  for (const s of strategies) {
    const alloc = bagiAnggaran(codes, kapasitasByCode, s.weights, clampedAnggaran);
    allocByStrategy[s.key] = alloc;
    casesByStrategy[s.key] = {};
    let totalCases = 0;
    for (const c of codes) {
      const pop = kapasitasByCode[c];
      const expected = (alloc[c] / pop) * gapEvalByCode[c] * faktorTemu;
      casesByStrategy[s.key][c] = expected;
      totalCases += expected;
    }
    totalCasesByStrategy[s.key] = totalCases;
  }

  const merataTotal = totalCasesByStrategy['Merata'] ?? 0;
  const pendudukTotal = totalCasesByStrategy['Berdasarkan penduduk'] ?? 0;

  const summary: StrategyResultRow[] = strategies.map((s) => {
    const exp = totalCasesByStrategy[s.key];
    return {
      strategi: s.key,
      skrining: clampedAnggaran,
      ekspektasiKasus: exp,
      kasusPer1000Skrining: (1000 * exp) / clampedAnggaran,
      selisihVsMerata: exp - merataTotal,
      selisihVsPenduduk: exp - pendudukTotal,
    };
  });

  let maxQuota = 1;
  const rows: RegionAllocationRow[] = sortedEligible.map((r) => {
    const dekomp = hitungDekomposisiGap(r.insiden2025Proyeksi, r.tcPrediksi2025, r.tcAsli2025);
    const alokasi: Record<string, number> = {};
    const ekspektasiKasus: Record<string, number> = {};
    for (const s of strategies) {
      const q = allocByStrategy[s.key][r.kodeBps] ?? 0;
      alokasi[s.key] = q;
      if (q > maxQuota) maxQuota = q;
      ekspektasiKasus[s.key] = casesByStrategy[s.key][r.kodeBps] ?? 0;
    }

    return {
      kodeBps: r.kodeBps,
      kabupatenKota: r.kabupatenKota,
      provinsi: r.provinsi,
      tcPrediksi2024: r.tcPrediksi2024,
      tcAsli2024: r.tcAsli2024,
      selisihTc2024Pp: r.tcAsli2024 !== null ? r.tcPrediksi2024 - r.tcAsli2024 : null,
      tcPrediksi2025: r.tcPrediksi2025,
      tcAsli2025: r.tcAsli2025,
      selisihTc2025Pp: r.tcAsli2025 !== null ? r.tcPrediksi2025 - r.tcAsli2025 : null,
      bebanKasus: estimasiGap(r.insiden2025Proyeksi, r.tcAsli2025 ?? r.tcPrediksi2025),
      gapStruktural: dekomp.gapStruktural,
      gapProgramatik: dekomp.gapProgramatik,
      alokasi,
      ekspektasiKasus,
    };
  });

  return {
    scope,
    regionCount: sortedEligible.length,
    summary,
    rows,
    maxQuota,
  };
}
