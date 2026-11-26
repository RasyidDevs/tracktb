import { useMemo, useState } from 'react';
import { MapPin, Search, SlidersHorizontal } from 'lucide-react';
import {
  COVERAGE_SUMMARY,
  FINALIST_TEST_METRICS,
  GLOBAL_SHAP_97_MISSING,
  GRAPH_STATS,
  SELECTED_MODEL_NAME,
  TOP_10_VALIDATION_2024,
} from '../data/benchmarkData';
import { hitungDekomposisiGap, type SimulationBundle } from '../lib/simulation';
import type { MainTab, RegionRecord, SimScope, StrategyKey } from '../types';
import { BorderlessSelect } from './BorderlessSelect';

const PROVINCE_MONOGRAM: Record<string, string> = {
  '11': 'AC',
  '12': 'SU',
  '13': 'SB',
  '14': 'RI',
  '15': 'JA',
  '16': 'SS',
  '17': 'BE',
  '18': 'LA',
  '19': 'BB',
  '21': 'KR',
};

interface InspectorPanelProps {
  activeTab: MainTab;
  regions: RegionRecord[];
  selectedRegion: RegionRecord;
  onSelectRegion: (kodeBps: string) => void;
  highlightedNeighborCode: string | null;
  onHighlightNeighbor: (kodeBps: string | null) => void;
  simScope: SimScope;
  onSimScopeChange: (scope: SimScope) => void;
  anggaran: number;
  onAnggaranChange: (val: number) => void;
  faktorTemu: number;
  onFaktorTemuChange: (val: number) => void;
  activeStrategy: StrategyKey;
  onStrategyChange: (strategy: StrategyKey) => void;
  simBundle: SimulationBundle;
  onShowQuotaOnMap: () => void;
}

const QUICK_PICKS = [
  { code: '1377', label: 'Kota Pariaman' },
  { code: '1102', label: 'Aceh Singkil' },
  { code: '1301', label: 'Kep. Mentawai' },
  { code: '1376', label: 'Kota Payakumbuh' },
  { code: '1307', label: 'Agam' },
];

export function InspectorPanel({
  activeTab,
  regions,
  selectedRegion,
  onSelectRegion,
  highlightedNeighborCode,
  onHighlightNeighbor,
  simScope,
  onSimScopeChange,
  anggaran,
  onAnggaranChange,
  faktorTemu,
  onFaktorTemuChange,
  activeStrategy,
  onStrategyChange,
  simBundle,
  onShowQuotaOnMap,
}: InspectorPanelProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [provinceFilter, setProvinceFilter] = useState('Semua');
  const [shapMode, setShapMode] = useState<'lokal' | 'global'>('lokal');
  const [showTop10Val, setShowTop10Val] = useState(false);

  const provinces = useMemo(() => {
    const unique = Array.from(new Set(regions.map((r) => r.provinsi)));
    return ['Semua', ...unique];
  }, [regions]);

  const filteredRegions = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return regions
      .filter((r) => {
        if (provinceFilter !== 'Semua' && r.provinsi !== provinceFilter) return false;
        if (!q) return true;
        return (
          r.kabupatenKota.toLowerCase().includes(q) ||
          r.provinsi.toLowerCase().includes(q) ||
          r.kodeBps.includes(q)
        );
      })
      .sort((a, b) => {
        const defA = a.tcAsli2025 !== null ? a.tcPrediksi2025 - a.tcAsli2025 : -999;
        const defB = b.tcAsli2025 !== null ? b.tcPrediksi2025 - b.tcAsli2025 : -999;
        if (defB !== defA) return defB - defA;
        return b.tcPrediksi2025 - a.tcPrediksi2025;
      });
  }, [regions, searchQuery, provinceFilter]);

  const selectedDefisit =
    selectedRegion.tcAsli2025 !== null
      ? selectedRegion.tcPrediksi2025 - selectedRegion.tcAsli2025
      : null;

  const selectedDecomp = hitungDekomposisiGap(
    selectedRegion.insiden2025Proyeksi,
    selectedRegion.tcPrediksi2025,
    selectedRegion.tcAsli2025,
  );

  const netShap = selectedRegion.shapItems.reduce((acc, item) => acc + item.contributionPp, 0);
  const maxLocalAbsShap = Math.max(
    1,
    ...selectedRegion.shapItems.map((i) => Math.abs(i.contributionPp)),
  );
  const maxGlobalAbsShap = Math.max(1, ...GLOBAL_SHAP_97_MISSING.map((i) => i.totalAbsShapPp));

  const topAllocated = useMemo(() => {
    return [...simBundle.rows]
      .sort((a, b) => (b.alokasi[activeStrategy] ?? 0) - (a.alokasi[activeStrategy] ?? 0))
      .slice(0, 12);
  }, [simBundle.rows, activeStrategy]);

  const maxSimCases = Math.max(1, ...simBundle.summary.map((s) => s.ekspektasiKasus));

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
      {/* TAB 1: PETA & AUDIT */}
      {activeTab === 'peta' && (
        <>
          {/* Search + Province filter card */}
          <div className="moon-card" style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
              <Search
                size={16}
                strokeWidth={1.75}
                style={{
                  position: 'absolute',
                  left: '12px',
                  color: 'var(--trunks)',
                  pointerEvents: 'none',
                }}
              />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Cari kabupaten, kota, atau kode BPS"
                aria-label="Cari wilayah"
                style={{
                  width: '100%',
                  padding: '10px 12px 10px 36px',
                  border: '1px solid var(--beerus)',
                  borderRadius: 'var(--radius-i-sm)',
                  backgroundColor: 'var(--goku)',
                  fontSize: 'var(--text-sm)',
                  outline: 'none',
                }}
              />
            </div>

            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: '8px',
              }}
            >
              <BorderlessSelect<string>
                ariaLabel="Filter provinsi"
                value={provinceFilter}
                onChange={setProvinceFilter}
                options={provinces.map((p) => ({
                  value: p,
                  label: p === 'Semua' ? 'Semua 10 provinsi (154 wilayah)' : p,
                }))}
              />
              <span className="tabular" style={{ fontSize: 'var(--text-xs)', color: 'var(--trunks)' }}>
                {filteredRegions.length} wilayah
              </span>
            </div>

            {/* Quick text jump links (no chips, plain underlined links) */}
            <div
              style={{
                display: 'flex',
                flexWrap: 'wrap',
                gap: '12px',
                paddingTop: '4px',
                borderTop: '1px solid var(--beerus)',
              }}
            >
              {QUICK_PICKS.map((item) => {
                const isActive = selectedRegion.kodeBps === item.code;
                return (
                  <button
                    key={item.code}
                    type="button"
                    className="pressable"
                    onClick={() => onSelectRegion(item.code)}
                    style={{
                      border: 'none',
                      background: 'transparent',
                      padding: '4px 0',
                      fontSize: 'var(--text-xs)',
                      fontWeight: isActive ? 600 : 500,
                      color: isActive ? 'var(--piccolo)' : 'var(--trunks)',
                      borderBottom: isActive ? '2px solid var(--piccolo)' : '2px solid transparent',
                      cursor: 'pointer',
                    }}
                  >
                    {item.label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Selected Region KPI Card (strict left alignment, baseline KPI) */}
          <div className="moon-card" style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div>
              <h2
                style={{
                  margin: 0,
                  fontSize: 'var(--text-lg)',
                  fontWeight: 600,
                  letterSpacing: '-0.02em',
                  color: 'var(--bulma)',
                }}
              >
                {selectedRegion.kabupatenKota}
              </h2>
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  marginTop: '4px',
                  fontSize: 'var(--text-xs)',
                  color: 'var(--trunks)',
                }}
              >
                <span
                  className="status-dot"
                  style={{
                    backgroundColor:
                      selectedRegion.sumberTc2025 === 'resmi' ? 'var(--piccolo)' : 'var(--roshi)',
                  }}
                />
                <span>
                  {selectedRegion.provinsi} (BPS {selectedRegion.kodeBps},{' '}
                  {selectedRegion.sumberTc2025 === 'resmi' ? 'TC resmi 2025' : 'estimasi model'})
                </span>
              </div>
            </div>

            {/* Baseline-aligned KPI */}
            <div style={{ display: 'flex', alignItems: 'baseline', gap: '12px', flexWrap: 'wrap' }}>
              <span
                className="tabular"
                style={{
                  fontSize: 'var(--text-kpi)',
                  fontWeight: 600,
                  letterSpacing: '-0.03em',
                  lineHeight: 1.05,
                  color: 'var(--bulma)',
                }}
              >
                {selectedRegion.tcPrediksi2025.toFixed(2)}%
              </span>
              <span style={{ fontSize: 'var(--text-sm)', color: 'var(--trunks)' }}>
                TC prediksi 2025
              </span>
            </div>

            {/* Key metrics comparison row */}
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(3, minmax(0, 1fr))',
                gap: '12px',
                paddingTop: '12px',
                borderTop: '1px solid var(--beerus)',
              }}
            >
              <div>
                <div style={{ fontSize: 'var(--text-xs)', color: 'var(--trunks)' }}>TC resmi 2025</div>
                <div
                  className="tabular"
                  style={{
                    fontSize: 'var(--text-md)',
                    fontWeight: 600,
                    color: 'var(--bulma)',
                    marginTop: '4px',
                  }}
                >
                  {selectedRegion.tcAsli2025 !== null
                    ? `${selectedRegion.tcAsli2025.toFixed(1)}%`
                    : 'Kosong'}
                </div>
              </div>
              <div>
                <div style={{ fontSize: 'var(--text-xs)', color: 'var(--trunks)' }}>Selisih TC</div>
                <div
                  className="tabular"
                  style={{
                    fontSize: 'var(--text-md)',
                    fontWeight: 600,
                    marginTop: '4px',
                    color:
                      selectedDefisit === null
                        ? 'var(--trunks)'
                        : selectedDefisit > 5
                          ? 'var(--chichi)'
                          : 'var(--piccolo)',
                  }}
                >
                  {selectedDefisit !== null
                    ? `${selectedDefisit >= 0 ? '+' : ''}${selectedDefisit.toFixed(2)} pp`
                    : 'Belum ada'}
                </div>
              </div>
              <div>
                <div style={{ fontSize: 'var(--text-xs)', color: 'var(--trunks)' }}>
                  Kasus hilang
                </div>
                <div
                  className="tabular"
                  style={{
                    fontSize: 'var(--text-md)',
                    fontWeight: 600,
                    color: 'var(--bulma)',
                    marginTop: '4px',
                  }}
                >
                  {Math.round(selectedDecomp.gapTotal).toLocaleString('id-ID')}
                </div>
              </div>
            </div>

            {/* Dekomposisi & Kesepakatan 3 Model */}
            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                gap: '8px',
                paddingTop: '12px',
                borderTop: '1px solid var(--beerus)',
                fontSize: 'var(--text-xs)',
                color: 'var(--trunks)',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span>Kesenjangan struktural (perkiraan)</span>
                <span className="tabular" style={{ fontWeight: 600, color: 'var(--bulma)' }}>
                  {Math.round(selectedDecomp.gapStruktural).toLocaleString('id-ID')} kasus
                </span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span>Kesenjangan programatik</span>
                <span
                  className="tabular"
                  style={{
                    fontWeight: 600,
                    color: selectedDecomp.gapProgramatik > 0 ? 'var(--chichi)' : 'var(--piccolo)',
                  }}
                >
                  {selectedDecomp.gapProgramatik >= 0 ? '+' : ''}
                  {Math.round(selectedDecomp.gapProgramatik).toLocaleString('id-ID')} kasus
                </span>
              </div>
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(3, minmax(0, 1fr))',
                  gap: '8px',
                  marginTop: '4px',
                  paddingTop: '8px',
                  borderTop: '1px dashed var(--beerus)',
                }}
              >
                <div>
                  <div>XGBoost</div>
                  <div className="tabular" style={{ fontWeight: 600, color: 'var(--piccolo)' }}>
                    {selectedRegion.tcPrediksiXgboost.toFixed(1)}%
                  </div>
                </div>
                <div>
                  <div>LightGBM</div>
                  <div className="tabular" style={{ fontWeight: 600, color: 'var(--bulma)' }}>
                    {selectedRegion.tcPrediksiLightgbm.toFixed(1)}%
                  </div>
                </div>
                <div>
                  <div>CatBoost</div>
                  <div className="tabular" style={{ fontWeight: 600, color: 'var(--bulma)' }}>
                    {selectedRegion.tcPrediksiCatboost.toFixed(1)}%
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Unified Audit Region List */}
          <div className="moon-card" style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <div style={{ fontSize: 'var(--text-base)', fontWeight: 600, color: 'var(--bulma)' }}>
              Daftar Wilayah dan Audit Selisih TC
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
              {filteredRegions.slice(0, 24).map((r) => {
                const def = r.tcAsli2025 !== null ? r.tcPrediksi2025 - r.tcAsli2025 : null;
                const isSelected = r.kodeBps === selectedRegion.kodeBps;
                const barWidth =
                  def !== null
                    ? Math.min(100, Math.max(4, Math.abs(def) * 2.8))
                    : Math.min(100, r.tcPrediksi2025);

                return (
                  <button
                    key={r.kodeBps}
                    type="button"
                    className="pressable"
                    onClick={() => onSelectRegion(r.kodeBps)}
                    style={{
                      width: '100%',
                      textAlign: 'left',
                      border: 'none',
                      borderRadius: 'var(--radius-i-sm)',
                      padding: '8px 12px',
                      backgroundColor: isSelected ? 'var(--jiren)' : 'transparent',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '12px',
                    }}
                  >
                    <div
                      aria-hidden="true"
                      style={{
                        width: '36px',
                        height: '36px',
                        borderRadius: '999px',
                        flexShrink: 0,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: 'var(--text-xs)',
                        fontWeight: 600,
                        backgroundColor: isSelected
                          ? 'var(--jiren)'
                          : def !== null && def >= 12
                            ? 'var(--chichi-10)'
                            : 'var(--surface-subtle)',
                        color: isSelected
                          ? 'var(--piccolo)'
                          : def !== null && def >= 12
                            ? 'var(--chichi)'
                            : 'var(--trunks)',
                        border: isSelected ? '1px solid var(--piccolo)' : '1px solid var(--beerus)',
                      }}
                    >
                      {PROVINCE_MONOGRAM[r.provinsiKode] ?? r.provinsiKode}
                    </div>
                    <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: '4px' }}>
                      <div
                        style={{
                          display: 'flex',
                          alignItems: 'baseline',
                          justifyContent: 'space-between',
                          gap: '8px',
                        }}
                      >
                        <span
                          style={{
                            fontSize: 'var(--text-sm)',
                            fontWeight: isSelected ? 600 : 500,
                            color: isSelected ? 'var(--piccolo)' : 'var(--bulma)',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            whiteSpace: 'nowrap',
                          }}
                        >
                          {r.kabupatenKota}
                        </span>
                        <span
                          className="tabular"
                          style={{
                            fontSize: 'var(--text-sm)',
                            fontWeight: 600,
                            flexShrink: 0,
                            color:
                              def === null
                                ? 'var(--trunks)'
                                : def > 5
                                  ? 'var(--chichi)'
                                  : 'var(--piccolo)',
                          }}
                        >
                          {def !== null
                            ? `${def >= 0 ? '+' : ''}${def.toFixed(2)} pp`
                            : `${r.tcPrediksi2025.toFixed(1)}%`}
                        </span>
                      </div>
                      <div
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          fontSize: 'var(--text-xs)',
                          color: 'var(--trunks)',
                          gap: '8px',
                        }}
                      >
                        <span>{r.provinsi}</span>
                        <span className="tabular">
                          {r.tcAsli2025 !== null
                            ? `Pred ${r.tcPrediksi2025.toFixed(1)}% vs Asli ${r.tcAsli2025.toFixed(1)}%`
                            : 'Estimasi model'}
                        </span>
                      </div>
                      <div
                        style={{
                          width: '100%',
                          height: '4px',
                          borderRadius: '999px',
                          backgroundColor: 'var(--surface-subtle)',
                          overflow: 'hidden',
                        }}
                      >
                        <div
                          style={{
                            width: `${barWidth}%`,
                            height: '100%',
                            backgroundColor:
                              def === null
                                ? 'var(--roshi)'
                                : def > 5
                                  ? 'var(--chichi)'
                                  : 'var(--piccolo)',
                            borderRadius: '999px',
                          }}
                        />
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        </>
      )}

      {/* TAB 2: PENJELASAN SHAP */}
      {activeTab === 'shap' && (
        <>
          <div className="moon-card" style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <div style={{ display: 'flex', gap: '20px', borderBottom: '1px solid var(--beerus)' }}>
              <button
                type="button"
                className="moon-subtab pressable"
                aria-selected={shapMode === 'lokal'}
                onClick={() => setShapMode('lokal')}
              >
                Lokal ({selectedRegion.kabupatenKota})
              </button>
              <button
                type="button"
                className="moon-subtab pressable"
                aria-selected={shapMode === 'global'}
                onClick={() => setShapMode('global')}
              >
                Global (97 Wilayah Kosong)
              </button>
            </div>

            {shapMode === 'lokal' ? (
              <>
                <div style={{ display: 'flex', alignItems: 'baseline', gap: '12px', flexWrap: 'wrap' }}>
                  <span
                    className="tabular"
                    style={{
                      fontSize: 'var(--text-kpi)',
                      fontWeight: 600,
                      letterSpacing: '-0.03em',
                      color: 'var(--bulma)',
                    }}
                  >
                    {selectedRegion.tcPrediksi2025.toFixed(2)}%
                  </span>
                  <span className="tabular" style={{ fontSize: 'var(--text-sm)', color: 'var(--trunks)' }}>
                    Dasar {selectedRegion.shapBasePct.toFixed(2)}% (bersih{' '}
                    <strong style={{ color: netShap >= 0 ? 'var(--hit)' : 'var(--chichi)' }}>
                      {netShap >= 0 ? '+' : ''}
                      {netShap.toFixed(2)} pp
                    </strong>
                    )
                  </span>
                </div>

                <div style={{ fontSize: 'var(--text-xs)', color: 'var(--trunks)' }}>
                  Klik fitur tetangga untuk menyorot busur 3D spesifik di peta Sumatera.
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginTop: '4px' }}>
                  {selectedRegion.shapItems.map((item) => {
                    const isNeighbor = Boolean(item.neighborCode);
                    const isHighlighted =
                      item.neighborCode && item.neighborCode === highlightedNeighborCode;
                    const widthPct = Math.min(
                      100,
                      Math.max(4, (Math.abs(item.contributionPp) / maxLocalAbsShap) * 100),
                    );
                    const positive = item.contributionPp >= 0;

                    return (
                      <button
                        key={item.feature}
                        type="button"
                        className="pressable"
                        disabled={!isNeighbor}
                        onClick={() => {
                          if (!item.neighborCode) return;
                          onHighlightNeighbor(
                            isHighlighted ? null : item.neighborCode,
                          );
                        }}
                        style={{
                          width: '100%',
                          textAlign: 'left',
                          border: 'none',
                          borderRadius: 'var(--radius-i-sm)',
                          padding: '8px 10px',
                          backgroundColor: isHighlighted ? 'var(--jiren)' : 'transparent',
                          cursor: isNeighbor ? 'pointer' : 'default',
                          display: 'flex',
                          flexDirection: 'column',
                          gap: '4px',
                        }}
                      >
                        <div
                          style={{
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'baseline',
                            gap: '8px',
                          }}
                        >
                          <span style={{ fontSize: 'var(--text-sm)', fontWeight: 500, color: 'var(--bulma)' }}>
                            {item.label}
                          </span>
                          <span
                            className="tabular"
                            style={{
                              fontSize: 'var(--text-sm)',
                              fontWeight: 600,
                              color: positive ? 'var(--hit)' : 'var(--chichi)',
                            }}
                          >
                            {positive ? '+' : ''}
                            {item.contributionPp.toFixed(3)} pp
                          </span>
                        </div>
                        <div
                          style={{
                            display: 'flex',
                            justifyContent: 'space-between',
                            fontSize: 'var(--text-xs)',
                            color: 'var(--trunks)',
                          }}
                        >
                          <span>
                            {item.neighborName
                              ? `${item.neighborName} (BPS ${item.neighborCode})`
                              : 'Fitur wilayah'}
                          </span>
                          <span className="tabular">
                            Nilai:{' '}
                            {item.value === null
                              ? 'kosong'
                              : item.value.toLocaleString('id-ID', { maximumFractionDigits: 2 })}
                          </span>
                        </div>
                        <div
                          style={{
                            width: '100%',
                            height: '5px',
                            borderRadius: '999px',
                            backgroundColor: 'var(--surface-subtle)',
                            overflow: 'hidden',
                          }}
                        >
                          <div
                            style={{
                              width: `${widthPct}%`,
                              height: '100%',
                              borderRadius: '999px',
                              backgroundColor: positive ? 'var(--hit)' : 'var(--chichi)',
                            }}
                          />
                        </div>
                      </button>
                    );
                  })}
                </div>
              </>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginTop: '4px' }}>
                <div style={{ fontSize: 'var(--text-xs)', color: 'var(--trunks)' }}>
                  Total magnitudo kontribusi TreeSHAP pada 97 wilayah tanpa TC resmi 2025.
                </div>
                {GLOBAL_SHAP_97_MISSING.map((row) => {
                  const pct = (row.totalAbsShapPp / maxGlobalAbsShap) * 100;
                  return (
                    <div key={row.feature} style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 'var(--text-sm)' }}>
                        <span style={{ fontWeight: 500, color: 'var(--bulma)' }}>{row.label}</span>
                        <span className="tabular" style={{ fontWeight: 600, color: 'var(--hit)' }}>
                          {row.totalAbsShapPp.toFixed(2)} pp
                        </span>
                      </div>
                      <div
                        style={{
                          width: '100%',
                          height: '6px',
                          borderRadius: '999px',
                          backgroundColor: 'var(--surface-subtle)',
                          overflow: 'hidden',
                        }}
                      >
                        <div
                          style={{
                            width: `${pct}%`,
                            height: '100%',
                            borderRadius: '999px',
                            backgroundColor: 'var(--hit)',
                          }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </>
      )}

      {/* TAB 3: SIMULASI SKRINING */}
      {activeTab === 'simulasi' && (
        <>
          <div className="moon-card" style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div style={{ display: 'flex', gap: '20px', borderBottom: '1px solid var(--beerus)' }}>
              <button
                type="button"
                className="moon-subtab pressable"
                aria-selected={simScope === 'validasi57'}
                onClick={() => onSimScopeChange('validasi57')}
              >
                Validasi 57 Wilayah
              </button>
              <button
                type="button"
                className="moon-subtab pressable"
                aria-selected={simScope === 'proyeksi154'}
                onClick={() => onSimScopeChange('proyeksi154')}
              >
                Proyeksi 154 Wilayah
              </button>
            </div>

            {/* Sliders */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div>
                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'baseline',
                    marginBottom: '6px',
                  }}
                >
                  <span style={{ fontSize: 'var(--text-sm)', color: 'var(--trunks)', fontWeight: 500 }}>
                    Anggaran skrining
                  </span>
                  <span className="tabular" style={{ fontSize: 'var(--text-base)', fontWeight: 600, color: 'var(--piccolo)' }}>
                    {anggaran.toLocaleString('id-ID')} orang
                  </span>
                </div>
                <input
                  type="range"
                  className="moon-range"
                  aria-label="Anggaran skrining"
                  min={20_000}
                  max={500_000}
                  step={10_000}
                  value={anggaran}
                  onChange={(e) => onAnggaranChange(Number(e.target.value))}
                />
              </div>

              <div>
                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'baseline',
                    marginBottom: '6px',
                  }}
                >
                  <span style={{ fontSize: 'var(--text-sm)', color: 'var(--trunks)', fontWeight: 500 }}>
                    Faktor temu (asumsi sensitivitas)
                  </span>
                  <span className="tabular" style={{ fontSize: 'var(--text-base)', fontWeight: 600, color: 'var(--piccolo)' }}>
                    {faktorTemu.toFixed(2)}
                  </span>
                </div>
                <input
                  type="range"
                  className="moon-range"
                  aria-label="Faktor temu"
                  min={0.3}
                  max={1.0}
                  step={0.05}
                  value={faktorTemu}
                  onChange={(e) => onFaktorTemuChange(Number(e.target.value))}
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <button
                  type="button"
                  className="pressable"
                  onClick={onShowQuotaOnMap}
                  style={{
                    border: 'none',
                    background: 'transparent',
                    padding: '4px 0',
                    fontSize: 'var(--text-xs)',
                    fontWeight: 600,
                    color: 'var(--piccolo)',
                    cursor: 'pointer',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '6px',
                  }}
                >
                  <SlidersHorizontal size={14} strokeWidth={1.75} />
                  Tampilkan kuota di peta 3D
                </button>
                <button
                  type="button"
                  className="pressable"
                  onClick={() => {
                    onAnggaranChange(100_000);
                    onFaktorTemuChange(0.8);
                  }}
                  style={{
                    border: 'none',
                    background: 'transparent',
                    padding: '4px 0',
                    fontSize: 'var(--text-xs)',
                    fontWeight: 500,
                    color: 'var(--trunks)',
                    cursor: 'pointer',
                  }}
                >
                  Reset default
                </button>
              </div>
            </div>

            {/* Unified Strategy List (no separate chart + table) */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', paddingTop: '8px', borderTop: '1px solid var(--beerus)' }}>
              <div style={{ fontSize: 'var(--text-xs)', color: 'var(--trunks)' }}>
                Pilih strategi untuk memproyeksikan kuota wilayah ke peta 3D.
              </div>
              {simBundle.summary.map((row) => {
                const isSelected = row.strategi === activeStrategy;
                const barPct = (row.ekspektasiKasus / maxSimCases) * 100;
                return (
                  <button
                    key={row.strategi}
                    type="button"
                    className="pressable"
                    onClick={() => onStrategyChange(row.strategi)}
                    style={{
                      width: '100%',
                      textAlign: 'left',
                      border: isSelected ? '1px solid var(--piccolo)' : '1px solid var(--beerus)',
                      borderRadius: 'var(--radius-s-sm)',
                      padding: '12px',
                      backgroundColor: isSelected ? 'var(--jiren)' : 'var(--gohan)',
                      cursor: 'pointer',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '6px',
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
                      <span
                        style={{
                          fontSize: 'var(--text-sm)',
                          fontWeight: 600,
                          color: isSelected ? 'var(--piccolo)' : 'var(--bulma)',
                        }}
                      >
                        {row.strategi}
                      </span>
                      <span
                        className="tabular"
                        style={{ fontSize: 'var(--text-md)', fontWeight: 600, color: 'var(--bulma)' }}
                      >
                        {row.ekspektasiKasus.toFixed(2)} kasus
                      </span>
                    </div>
                    <div
                      className="tabular"
                      style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        fontSize: 'var(--text-xs)',
                        color: 'var(--trunks)',
                      }}
                    >
                      <span>{row.kasusPer1000Skrining.toFixed(2)} per 1.000 skrining</span>
                      <span>
                        vs Penduduk:{' '}
                        <strong
                          style={{
                            color: row.selisihVsPenduduk >= 0 ? 'var(--piccolo)' : 'var(--trunks)',
                          }}
                        >
                          {row.selisihVsPenduduk >= 0 ? '+' : ''}
                          {row.selisihVsPenduduk.toFixed(2)}
                        </strong>
                      </span>
                    </div>
                    <div
                      style={{
                        width: '100%',
                        height: '5px',
                        borderRadius: '999px',
                        backgroundColor: 'var(--surface-subtle)',
                        overflow: 'hidden',
                      }}
                    >
                      <div
                        style={{
                          width: `${barPct}%`,
                          height: '100%',
                          borderRadius: '999px',
                          backgroundColor: isSelected ? 'var(--piccolo)' : 'var(--roshi)',
                        }}
                      />
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Top Allocated Regions */}
          <div className="moon-card" style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            <div style={{ fontSize: 'var(--text-base)', fontWeight: 600, color: 'var(--bulma)' }}>
              Prioritas Wilayah ({activeStrategy})
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
              {topAllocated.map((row) => {
                const quota = row.alokasi[activeStrategy] ?? 0;
                const exp = row.ekspektasiKasus[activeStrategy] ?? 0;
                const isSelected = row.kodeBps === selectedRegion.kodeBps;
                const provCode = row.kodeBps.slice(0, 2);
                return (
                  <button
                    key={row.kodeBps}
                    type="button"
                    className="pressable"
                    onClick={() => onSelectRegion(row.kodeBps)}
                    style={{
                      width: '100%',
                      textAlign: 'left',
                      border: 'none',
                      borderRadius: 'var(--radius-i-sm)',
                      padding: '8px 12px',
                      backgroundColor: isSelected ? 'var(--jiren)' : 'transparent',
                      cursor: 'pointer',
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      gap: '12px',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px', minWidth: 0 }}>
                      <div
                        aria-hidden="true"
                        style={{
                          width: '36px',
                          height: '36px',
                          borderRadius: '999px',
                          flexShrink: 0,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontSize: 'var(--text-xs)',
                          fontWeight: 600,
                          backgroundColor: isSelected ? 'var(--jiren)' : 'var(--surface-subtle)',
                          color: isSelected ? 'var(--piccolo)' : 'var(--trunks)',
                          border: isSelected ? '1px solid var(--piccolo)' : '1px solid var(--beerus)',
                        }}
                      >
                        {PROVINCE_MONOGRAM[provCode] ?? provCode}
                      </div>
                      <div style={{ minWidth: 0 }}>
                        <div style={{ fontSize: 'var(--text-sm)', fontWeight: 500, color: 'var(--bulma)' }}>
                          {row.kabupatenKota}
                        </div>
                        <div style={{ fontSize: 'var(--text-xs)', color: 'var(--trunks)' }}>
                          {row.provinsi}
                        </div>
                      </div>
                    </div>
                    <div style={{ textAlign: 'right', flexShrink: 0 }}>
                      <div className="tabular" style={{ fontSize: 'var(--text-sm)', fontWeight: 600, color: 'var(--piccolo)' }}>
                        {quota.toLocaleString('id-ID')}
                      </div>
                      <div className="tabular" style={{ fontSize: 'var(--text-xs)', color: 'var(--trunks)' }}>
                        {exp.toFixed(2)} kasus
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        </>
      )}

      {/* TAB 4: PERFORMA MODEL */}
      {activeTab === 'model' && (
        <>
          <div className="moon-card" style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <div style={{ fontSize: 'var(--text-xs)', color: 'var(--trunks)' }}>Model Terpilih</div>
            <div style={{ fontSize: 'var(--text-md)', fontWeight: 600, color: 'var(--piccolo)' }}>
              {SELECTED_MODEL_NAME}
            </div>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: '12px' }}>
              <span
                className="tabular"
                style={{
                  fontSize: 'var(--text-kpi)',
                  fontWeight: 600,
                  letterSpacing: '-0.03em',
                  color: 'var(--bulma)',
                }}
              >
                13,69 pp
              </span>
              <span className="tabular" style={{ fontSize: 'var(--text-sm)', color: 'var(--trunks)' }}>
                MAE uji 2025 (R² = 0,243)
              </span>
            </div>

            <div style={{ fontSize: 'var(--text-xs)', color: 'var(--trunks)' }}>
              Mengungguli model lokal tanpa tetangga (MAE 14,61 pp, R² = 0,136) maupun LightGBM dan
              CatBoost pada validasi temporal 2024 dan uji 2025.
            </div>
          </div>

          <div className="moon-card" style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <div style={{ fontSize: 'var(--text-base)', fontWeight: 600, color: 'var(--bulma)' }}>
              Perbandingan Finalis Uji 2025 (57 Wilayah)
            </div>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 'var(--text-xs)' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid var(--beerus)', color: 'var(--trunks)', textAlign: 'left' }}>
                  <th style={{ padding: '8px 8px 8px 0', fontWeight: 600 }}>Model</th>
                  <th style={{ padding: '8px 8px', fontWeight: 600, textAlign: 'right', whiteSpace: 'nowrap' }}>MAE 24</th>
                  <th style={{ padding: '8px 8px', fontWeight: 600, textAlign: 'right', whiteSpace: 'nowrap' }}>MAE 25</th>
                  <th style={{ padding: '8px 0 8px 8px', fontWeight: 600, textAlign: 'right', whiteSpace: 'nowrap' }}>R² 25</th>
                </tr>
              </thead>
              <tbody className="tabular">
                {FINALIST_TEST_METRICS.map((row) => (
                  <tr key={row.model} style={{ borderBottom: '1px solid var(--beerus)' }}>
                    <td
                      style={{
                        padding: '8px 8px 8px 0',
                        fontWeight: row.isSelected ? 600 : 500,
                        color: row.isSelected ? 'var(--piccolo)' : 'var(--bulma)',
                      }}
                    >
                      {row.model}
                    </td>
                    <td style={{ padding: '8px 8px', textAlign: 'right', whiteSpace: 'nowrap' }}>{row.maeVal2024Pp.toFixed(2)}</td>
                    <td style={{ padding: '8px 8px', textAlign: 'right', whiteSpace: 'nowrap', fontWeight: row.isSelected ? 600 : 400 }}>
                      {row.maeTest2025Pp?.toFixed(2)}
                    </td>
                    <td style={{ padding: '8px 0 8px 8px', textAlign: 'right', whiteSpace: 'nowrap' }}>{row.r2Test2025?.toFixed(3)}</td>
                  </tr>
                ))}
              </tbody>
            </table>

            <button
              type="button"
              className="pressable"
              onClick={() => setShowTop10Val((prev) => !prev)}
              style={{
                border: 'none',
                background: 'transparent',
                padding: '4px 0',
                fontSize: 'var(--text-xs)',
                fontWeight: 600,
                color: 'var(--piccolo)',
                cursor: 'pointer',
                textAlign: 'left',
              }}
            >
              {showTop10Val ? 'Sembunyikan 10 teratas validasi 2024' : 'Lihat 10 teratas validasi 2024'}
            </button>

            {showTop10Val && (
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 'var(--text-xs)' }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid var(--beerus)', color: 'var(--trunks)', textAlign: 'left' }}>
                    <th style={{ padding: '6px 0' }}>Konfigurasi</th>
                    <th style={{ padding: '6px 0', textAlign: 'right' }}>MAE</th>
                    <th style={{ padding: '6px 0', textAlign: 'right' }}>RMSE</th>
                    <th style={{ padding: '6px 0', textAlign: 'right' }}>R²</th>
                  </tr>
                </thead>
                <tbody className="tabular">
                  {TOP_10_VALIDATION_2024.map((row) => (
                    <tr key={row.model} style={{ borderBottom: '1px solid var(--beerus)' }}>
                      <td style={{ padding: '6px 4px 6px 0', color: 'var(--bulma)' }}>{row.model}</td>
                      <td style={{ padding: '6px 0', textAlign: 'right' }}>{row.maeVal2024Pp.toFixed(2)}</td>
                      <td style={{ padding: '6px 0', textAlign: 'right' }}>{row.rmseVal2024Pp.toFixed(2)}</td>
                      <td style={{ padding: '6px 0', textAlign: 'right' }}>{row.r2Val2024.toFixed(3)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>

          <div className="moon-card" style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: 'var(--text-base)', fontWeight: 600 }}>
              <MapPin size={18} strokeWidth={1.75} style={{ color: 'var(--piccolo)' }} />
              <span>Graf Tetangga dan Cakupan Panel</span>
            </div>
            <div style={{ fontSize: 'var(--text-xs)', color: 'var(--trunks)' }}>
              {GRAPH_STATS.wilayah} wilayah dihubungkan oleh {GRAPH_STATS.pasanganBatas} pasangan
              batas administratif (maksimal 5 tetangga per wilayah).
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '8px', marginTop: '4px' }}>
              {COVERAGE_SUMMARY.map((c) => (
                <div
                  key={c.tahun}
                  style={{
                    padding: '10px',
                    borderRadius: 'var(--radius-i-sm)',
                    backgroundColor: 'var(--goku)',
                  }}
                >
                  <div className="tabular" style={{ fontSize: 'var(--text-xs)', fontWeight: 600 }}>
                    Tahun {c.tahun}
                  </div>
                  <div className="tabular" style={{ fontSize: 'var(--text-xs)', color: 'var(--trunks)', marginTop: '4px' }}>
                    Resmi {c.tcResmi}, kosong {c.tcKosong}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
