import { describe, expect, it } from 'vitest';
import regionsRaw from '../../data/regions.json';
import { NOTEBOOK_BENCHMARK_154, NOTEBOOK_BENCHMARK_57 } from '../../data/benchmarkData';
import { mergePrediksiCsv } from '../csvImport';
import { bagiAnggaran, estimasiGap, hitungDekomposisiGap, runSimulasi } from '../simulation';
import type { RegionRecord } from '../../types';

const regions = regionsRaw as RegionRecord[];

describe('TRACK-TB pure logic & benchmark parity', () => {
  it('loads all 154 Sumatra kabupaten/kota (57 observed, 97 estimated)', () => {
    expect(regions).toHaveLength(154);
    const official = regions.filter((r) => r.sumberTc2025 === 'resmi');
    const estimated = regions.filter((r) => r.sumberTc2025 === 'estimasi model');
    expect(official).toHaveLength(57);
    expect(estimated).toHaveLength(97);
  });

  it('verifies SHAP additivity (base + sum === prediction) across all 154 regions', () => {
    for (const r of regions) {
      const net = r.shapItems.reduce((acc, item) => acc + item.contributionPp, 0);
      expect(r.shapBasePct + net).toBeCloseTo(r.tcPrediksi2025, 1);
    }
    const singkil = regions.find((r) => r.kodeBps === '1102');
    expect(singkil).toBeDefined();
    expect(singkil!.shapBasePct).toBeCloseTo(56.3, 2);
    expect(singkil!.tcPrediksi2025).toBeCloseTo(45.28, 2);
    expect(singkil!.neighbors.map((n) => n.kodeBps)).toEqual(['1175', '1216', '1103', '1204']);
  });

  it('conserves exact screening budget and respects population cap in bagiAnggaran', () => {
    const codes = ['A', 'B', 'C'];
    const caps = { A: 500, B: 50_000, C: 100_000 };
    const weights = { A: 50, B: 20, C: 10 };
    const alloc = bagiAnggaran(codes, caps, weights, 10_000);
    const total = Object.values(alloc).reduce((a, b) => a + b, 0);
    expect(total).toBe(10_000);
    for (const c of codes) {
      expect(alloc[c]).toBeGreaterThanOrEqual(0);
      expect(alloc[c]).toBeLessThanOrEqual(caps[c as keyof typeof caps]);
    }
  });

  it('matches notebook default 57-region and 154-region simulation outputs at 100,000 budget and 0.80 factor', () => {
    const sim57 = runSimulasi(regions, 'validasi57', 100_000, 0.8);
    expect(sim57.regionCount).toBe(57);
    for (const row of sim57.summary) {
      const target = NOTEBOOK_BENCHMARK_57[row.strategi as keyof typeof NOTEBOOK_BENCHMARK_57];
      expect(row.ekspektasiKasus).toBeCloseTo(target, 1);
    }

    const sim154 = runSimulasi(regions, 'proyeksi154', 100_000, 0.8);
    expect(sim154.regionCount).toBe(154);
    for (const row of sim154.summary) {
      const target = NOTEBOOK_BENCHMARK_154[row.strategi as keyof typeof NOTEBOOK_BENCHMARK_154];
      expect(row.ekspektasiKasus).toBeCloseTo(target, 1);
    }
  });

  it('computes gap decomposition cleanly with 100% cap on structural TC', () => {
    expect(estimasiGap(2000, 55)).toBeCloseTo(900, 4);
    expect(estimasiGap(500, 106.32)).toBe(0);
    const dekomp = hitungDekomposisiGap(2000, 85, 55);
    expect(dekomp.gapTotal).toBeCloseTo(900, 4);
    expect(dekomp.gapStruktural).toBeCloseTo(300, 4);
    expect(dekomp.gapProgramatik).toBeCloseTo(600, 4);
  });

  it('parses and merges real notebook prediksi_tc_2025.csv format', () => {
    const csv = [
      'kode_bps,tahun,provinsi,kabupaten_kota,tc_resmi_pct,tc_percentage_prediksi,tc_percentage,sumber_tc_percentage,tc_percentage_prediksi_xgboost,tc_percentage_prediksi_lightgbm,tc_percentage_prediksi_catboost',
      '1102,2025,Aceh,Aceh Singkil,,48.10,48.10,estimasi model,48.10,47.50,49.00',
      '1377,2025,Sumatera Barat,Kota Pariaman,75.0,104.20,75.0,resmi,104.20,101.00,99.50',
    ].join('\n');

    const res = mergePrediksiCsv(csv, regions);
    expect(res.matchedCount).toBe(2);
    const singkil = res.regions.find((r) => r.kodeBps === '1102')!;
    expect(singkil.tcPrediksi2025).toBe(48.1);
    const net = singkil.shapItems.reduce((acc, item) => acc + item.contributionPp, 0);
    expect(singkil.shapBasePct + net).toBeCloseTo(48.1, 2);
  });
});
