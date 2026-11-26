import { FEATURE_LABELS } from '../data/benchmarkData';
import type { RegionRecord } from '../types';

function splitCsvLine(line: string, delimiter: string): string[] {
  const result: string[] = [];
  let current = '';
  let inQuotes = false;

  for (let i = 0; i < line.length; i += 1) {
    const ch = line[i];
    if (ch === '"') {
      if (inQuotes && line[i + 1] === '"') {
        current += '"';
        i += 1;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (ch === delimiter && !inQuotes) {
      result.push(current.trim());
      current = '';
    } else {
      current += ch;
    }
  }
  result.push(current.trim());
  return result;
}

function toNumberOrNull(raw: string | undefined): number | null {
  if (!raw) return null;
  const cleaned = raw.replace(/,/g, '.').trim();
  if (!cleaned || cleaned.toLowerCase() === 'nan' || cleaned.toLowerCase() === 'null') {
    return null;
  }
  const n = Number(cleaned);
  return Number.isFinite(n) ? n : null;
}

export interface CsvMergeResult {
  regions: RegionRecord[];
  matchedCount: number;
  officialCount: number;
  estimatedCount: number;
}

/**
 * Mengimpor dan menggabungkan file `prediksi_tc_2025.csv` hasil ekspor notebook
 * ke daftar 154 wilayah Sumatera tanpa kehilangan geometri atau data simulasi.
 */
export function mergePrediksiCsv(csvText: string, baseRegions: RegionRecord[]): CsvMergeResult {
  const cleanText = csvText.replace(/^\uFEFF/, '').trim();
  const lines = cleanText.split(/\r?\n/).filter((l) => l.trim().length > 0);
  if (lines.length < 2) {
    throw new Error('Berkas CSV kosong atau tidak memiliki baris data.');
  }

  const headerLine = lines[0];
  const delimiter = headerLine.includes(';') && !headerLine.includes(',') ? ';' : ',';
  const headers = splitCsvLine(headerLine, delimiter).map((h) => h.replace(/^"|"$/g, '').trim());

  const idxCode = headers.indexOf('kode_bps');
  const idxPred = headers.indexOf('tc_percentage_prediksi');
  if (idxCode === -1 || idxPred === -1) {
    throw new Error('Kolom wajib kode_bps dan tc_percentage_prediksi tidak ditemukan pada CSV.');
  }

  const idxTarget = headers.indexOf('tc_resmi_pct');
  const idxSumber = headers.indexOf('sumber_tc_percentage');
  const idxXgb = headers.indexOf('tc_percentage_prediksi_xgboost');
  const idxLgb = headers.indexOf('tc_percentage_prediksi_lightgbm');
  const idxCat = headers.indexOf('tc_percentage_prediksi_catboost');

  const updates = new Map<
    string,
    {
      tcAsli2025: number | null;
      tcPrediksi2025: number | null;
      sumberTc2025?: 'resmi' | 'estimasi model';
      xgb: number | null;
      lgb: number | null;
      cat: number | null;
    }
  >();

  for (let i = 1; i < lines.length; i += 1) {
    const cells = splitCsvLine(lines[i], delimiter);
    const rawCode = (cells[idxCode] ?? '').replace(/\.0$/, '').trim();
    if (!rawCode) continue;

    const tcAsli = idxTarget >= 0 ? toNumberOrNull(cells[idxTarget]) : null;
    const tcPred = toNumberOrNull(cells[idxPred]);
    const sumberRaw = idxSumber >= 0 ? (cells[idxSumber] ?? '').trim().toLowerCase() : '';
    const sumber =
      sumberRaw === 'resmi'
        ? 'resmi'
        : sumberRaw === 'estimasi model'
          ? 'estimasi model'
          : tcAsli !== null
            ? 'resmi'
            : 'estimasi model';

    updates.set(rawCode, {
      tcAsli2025: tcAsli,
      tcPrediksi2025: tcPred,
      sumberTc2025: sumber,
      xgb: idxXgb >= 0 ? toNumberOrNull(cells[idxXgb]) : null,
      lgb: idxLgb >= 0 ? toNumberOrNull(cells[idxLgb]) : null,
      cat: idxCat >= 0 ? toNumberOrNull(cells[idxCat]) : null,
    });
  }

  if (updates.size === 0) {
    throw new Error('Tidak ada baris dengan kode_bps yang valid pada CSV.');
  }

  let matchedCount = 0;
  let officialCount = 0;
  let estimatedCount = 0;

  const merged = baseRegions.map((region) => {
    const patch = updates.get(region.kodeBps);
    if (!patch || patch.tcPrediksi2025 === null) {
      if (region.sumberTc2025 === 'resmi') officialCount += 1;
      else estimatedCount += 1;
      return region;
    }

    matchedCount += 1;
    const nextPred = patch.tcPrediksi2025;
    const nextSumber = patch.sumberTc2025 ?? (patch.tcAsli2025 !== null ? 'resmi' : 'estimasi model');
    if (nextSumber === 'resmi') officialCount += 1;
    else estimatedCount += 1;

    // Preserve exact SHAP additivity when imported predictions update
    const shapSum = region.shapItems.reduce((acc, item) => acc + item.contributionPp, 0);
    const nextBase = Number((nextPred - shapSum).toFixed(4));
    const nextShapItems = region.shapItems.map((item) => ({
      ...item,
      label: FEATURE_LABELS[item.feature] ?? item.label,
    }));

    return {
      ...region,
      tcAsli2025: patch.tcAsli2025,
      tcPrediksi2025: nextPred,
      sumberTc2025: nextSumber,
      tcPrediksiXgboost: patch.xgb ?? nextPred,
      tcPrediksiLightgbm: patch.lgb ?? region.tcPrediksiLightgbm,
      tcPrediksiCatboost: patch.cat ?? region.tcPrediksiCatboost,
      shapBasePct: nextBase,
      shapItems: nextShapItems,
    };
  });

  if (matchedCount === 0) {
    throw new Error('Tidak ada kode_bps CSV yang cocok dengan 154 wilayah Sumatera.');
  }

  return {
    regions: merged,
    matchedCount,
    officialCount,
    estimatedCount,
  };
}
