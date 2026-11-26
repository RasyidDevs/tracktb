import { useEffect, useMemo, useRef, useState } from 'react';
import { BookOpen, Upload } from 'lucide-react';
import regionsRaw from './data/regions.json';
import { InspectorPanel } from './components/InspectorPanel';
import { MascotGuideCard } from './components/MascotGuideCard';
import { MethodologyModal } from './components/MethodologyModal';
import { SumatraMap3D } from './components/SumatraMap3D';
import { mergePrediksiCsv } from './lib/csvImport';
import { runSimulasi } from './lib/simulation';
import type { MainTab, MapMetric, RegionRecord, SimScope, StrategyKey } from './types';

const INITIAL_REGIONS = regionsRaw as RegionRecord[];

export function App() {
  const [regions, setRegions] = useState<RegionRecord[]>(INITIAL_REGIONS);
  const [activeTab, setActiveTab] = useState<MainTab>('peta');
  const [selectedCode, setSelectedCode] = useState<string>('1102');
  const [highlightedNeighborCode, setHighlightedNeighborCode] = useState<string | null>(null);
  const [mapMetric, setMapMetric] = useState<MapMetric>('defisit');

  const [simScope, setSimScope] = useState<SimScope>('validasi57');
  const [anggaran, setAnggaran] = useState<number>(100_000);
  const [faktorTemu, setFaktorTemu] = useState<number>(0.8);
  const [activeStrategy, setActiveStrategy] = useState<StrategyKey>('TRACK-TB');

  const [dataSourceLabel, setDataSourceLabel] = useState<string>('Data Resmi Sumatera 2023-2025 (154 Wilayah)');
  const [csvFeedback, setCsvFeedback] = useState<string | null>(null);
  const [methodOpen, setMethodOpen] = useState(false);
  const [teamOpen, setTeamOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(
    typeof window !== 'undefined' ? window.innerWidth < 920 : false,
  );
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const teamPopoverRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const onResize = () => setIsMobile(window.innerWidth < 920);
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  useEffect(() => {
    if (!teamOpen) return;
    const onDocClick = (e: MouseEvent) => {
      if (teamPopoverRef.current && !teamPopoverRef.current.contains(e.target as Node)) {
        setTeamOpen(false);
      }
    };
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setTeamOpen(false);
    };
    document.addEventListener('mousedown', onDocClick);
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('mousedown', onDocClick);
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [teamOpen]);

  const selectedRegion = useMemo(() => {
    return regions.find((r) => r.kodeBps === selectedCode) ?? regions[0];
  }, [regions, selectedCode]);

  const simBundle = useMemo(() => {
    return runSimulasi(regions, simScope, anggaran, faktorTemu);
  }, [regions, simScope, anggaran, faktorTemu]);

  const quotaByCode = useMemo(() => {
    const out: Record<string, number> = {};
    for (const row of simBundle.rows) {
      out[row.kodeBps] = row.alokasi[activeStrategy] ?? 0;
    }
    return out;
  }, [simBundle, activeStrategy]);

  const handleTabChange = (tab: MainTab) => {
    setActiveTab(tab);
    if (tab === 'shap') {
      // Keep current selected region, reset neighbor highlight
      setHighlightedNeighborCode(null);
    } else if (tab === 'simulasi') {
      setMapMetric('kuota');
    }
  };

  const handleSimScopeChange = (nextScope: SimScope) => {
    setSimScope(nextScope);
    if (nextScope === 'validasi57') {
      setActiveStrategy('TRACK-TB');
    } else {
      setActiveStrategy('Proyeksi beban');
    }
  };

  const handleSelectRegion = (code: string) => {
    setSelectedCode(code);
    setHighlightedNeighborCode(null);
  };

  const handleCsvUpload = async (file: File | undefined) => {
    if (!file) return;
    try {
      const text = await file.text();
      const merged = mergePrediksiCsv(text, regions);
      setRegions(merged.regions);
      setDataSourceLabel(`CSV ${file.name} (${merged.matchedCount} wilayah)`);
      setCsvFeedback(
        `Berhasil memuat ${merged.matchedCount} wilayah (${merged.officialCount} resmi, ${merged.estimatedCount} estimasi model).`,
      );
    } catch (err) {
      setCsvFeedback(err instanceof Error ? err.message : 'Gagal membaca berkas CSV.');
    }
  };

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        width: '100%',
        height: '100%',
        backgroundColor: 'var(--goku)',
        overflow: isMobile ? 'auto' : 'hidden',
      }}
    >
      {/* Top Moon Header (56px, crisp --gohan, 1px --beerus bottom border) */}
      <header
        style={{
          flexShrink: 0,
          minHeight: '56px',
          backgroundColor: 'var(--gohan)',
          borderBottom: '1px solid var(--beerus)',
          padding: isMobile ? '0 16px' : '0 24px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '16px',
          flexWrap: isMobile ? 'wrap' : 'nowrap',
        }}
      >
        {/* Brand */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '10px 0' }}>
          <img
            src="/track-tb-logo.png"
            alt="Logo TRACK-TB"
            width={32}
            height={32}
            style={{
              width: '32px',
              height: '32px',
              objectFit: 'contain',
              display: 'block',
              flexShrink: 0,
            }}
          />
          <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px' }}>
            <span
              style={{
                fontSize: 'var(--text-md)',
                fontWeight: 600,
                letterSpacing: '-0.02em',
                color: 'var(--bulma)',
              }}
            >
              TRACK-TB
            </span>
            {!isMobile && (
              <span style={{ fontSize: 'var(--text-xs)', color: 'var(--trunks)' }}>
                Sumatera 2025
              </span>
            )}
          </div>
        </div>

        {/* Moon Underlined Navigation Tabs */}
        <nav
          aria-label="Navigasi utama"
          style={{
            display: 'flex',
            alignItems: 'stretch',
            justifyContent: isMobile ? 'space-between' : 'flex-start',
            gap: isMobile ? '12px' : '24px',
            height: isMobile ? '44px' : '56px',
            overflow: 'hidden',
            maxWidth: '100%',
            order: isMobile ? 3 : 2,
            width: isMobile ? '100%' : 'auto',
          }}
        >
          {(
            [
              { id: 'peta', label: 'Peta & Audit', mobileLabel: 'Peta' },
              { id: 'shap', label: 'Penjelasan SHAP', mobileLabel: 'SHAP' },
              { id: 'simulasi', label: 'Simulasi Skrining', mobileLabel: 'Simulasi' },
              { id: 'model', label: 'Performa Model', mobileLabel: 'Model' },
            ] as Array<{ id: MainTab; label: string; mobileLabel: string }>
          ).map((tab) => (
            <button
              key={tab.id}
              type="button"
              role="tab"
              aria-selected={activeTab === tab.id}
              className="moon-tab pressable"
              onClick={() => handleTabChange(tab.id)}
            >
              {isMobile ? tab.mobileLabel : tab.label}
            </button>
          ))}
        </nav>

        {/* Right Borderless Actions */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '16px',
            order: isMobile ? 2 : 3,
          }}
        >
          <input
            ref={fileInputRef}
            type="file"
            accept=".csv,text/csv"
            style={{ display: 'none' }}
            onChange={(e) => {
              void handleCsvUpload(e.target.files?.[0]);
              e.target.value = '';
            }}
          />
          <button
            type="button"
            className="pressable"
            onClick={() => fileInputRef.current?.click()}
            style={{
              border: 'none',
              background: 'transparent',
              padding: '6px 0',
              fontSize: 'var(--text-sm)',
              fontWeight: 600,
              color: 'var(--piccolo)',
              cursor: 'pointer',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              whiteSpace: 'nowrap',
            }}
          >
            <Upload size={16} strokeWidth={1.75} />
            Impor CSV
          </button>

          <button
            type="button"
            className="pressable"
            onClick={() => setMethodOpen(true)}
            style={{
              border: 'none',
              background: 'transparent',
              padding: '4px 0',
              fontSize: 'var(--text-sm)',
              fontWeight: 500,
              color: 'var(--trunks)',
              cursor: 'pointer',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '8px',
              whiteSpace: 'nowrap',
            }}
          >
            <BookOpen size={16} strokeWidth={1.75} />
            Metodologi
          </button>

          <div ref={teamPopoverRef} style={{ position: 'relative' }}>
            <button
              type="button"
              aria-label="Profil Tim TRACK-TB"
              aria-expanded={teamOpen}
              className="pressable"
              onClick={() => setTeamOpen((prev) => !prev)}
              style={{
                width: '32px',
                height: '32px',
                padding: 0,
                borderRadius: '999px',
                border: teamOpen ? '2px solid var(--piccolo)' : '1px solid var(--beerus)',
                overflow: 'hidden',
                backgroundColor: 'var(--surface-subtle)',
                cursor: 'pointer',
                display: 'block',
                flexShrink: 0,
              }}
            >
              <img
                src="/avatar-analis.png"
                alt="Avatar Analis TRACK-TB"
                width={32}
                height={32}
                style={{
                  width: '100%',
                  height: '100%',
                  objectFit: 'cover',
                  display: 'block',
                }}
              />
            </button>

            {teamOpen && (
              <div
                role="dialog"
                aria-label="Profil Tim TRACK-TB"
                style={{
                  position: isMobile ? 'fixed' : 'absolute',
                  top: isMobile ? '60px' : 'calc(100% + 12px)',
                  right: isMobile ? '16px' : 0,
                  zIndex: 45,
                  width: isMobile ? 'min(280px, calc(100vw - 32px))' : '280px',
                  backgroundColor: 'var(--gohan)',
                  border: '1px solid var(--beerus)',
                  borderRadius: 'var(--radius-s-md)',
                  boxShadow: 'var(--shadow-md)',
                  padding: '16px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '12px',
                }}
              >
                <div>
                  <div style={{ fontSize: 'var(--text-sm)', fontWeight: 600, color: 'var(--bulma)' }}>
                    Tim TRACK-TB (ITS)
                  </div>
                  <div style={{ fontSize: 'var(--text-xs)', color: 'var(--trunks)', marginTop: '4px' }}>
                    Essay Quest Dateraquest 2.0
                  </div>
                </div>

                <div
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '12px',
                    paddingTop: '12px',
                    borderTop: '1px solid var(--beerus)',
                  }}
                >
                  {[
                    { initials: 'MR', name: 'M. Rasyid', role: 'Data dan visualisasi spasial' },
                    { initials: 'MA', name: 'Maria', role: 'Penulisan ilmiah dan substansi' },
                    { initials: 'AZ', name: 'Azka', role: 'Pemodelan ML dan simulasi' },
                  ].map((member) => (
                    <div
                      key={member.initials}
                      style={{ display: 'flex', alignItems: 'center', gap: '12px' }}
                    >
                      <div
                        aria-hidden="true"
                        style={{
                          width: '36px',
                          height: '36px',
                          borderRadius: '999px',
                          flexShrink: 0,
                          backgroundColor: 'var(--jiren)',
                          color: 'var(--piccolo)',
                          border: '1px solid var(--beerus)',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontSize: 'var(--text-xs)',
                          fontWeight: 600,
                        }}
                      >
                        {member.initials}
                      </div>
                      <div style={{ minWidth: 0 }}>
                        <div style={{ fontSize: 'var(--text-sm)', fontWeight: 500, color: 'var(--bulma)' }}>
                          {member.name}
                        </div>
                        <div style={{ fontSize: 'var(--text-xs)', color: 'var(--trunks)' }}>
                          {member.role}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                <div
                  style={{
                    paddingTop: '12px',
                    borderTop: '1px solid var(--beerus)',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    fontSize: 'var(--text-xs)',
                    color: 'var(--trunks)',
                  }}
                >
                  <span className="status-dot" style={{ backgroundColor: 'var(--roshi)' }} />
                  <span>{dataSourceLabel}</span>
                </div>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* Main Workspace: 3D Map + Side Inspector */}
      <main
        style={{
          flex: 1,
          minHeight: 0,
          display: 'flex',
          flexDirection: isMobile ? 'column' : 'row',
          overflow: isMobile ? 'visible' : 'hidden',
        }}
      >
        {/* 3D Map Canvas */}
        <section
          aria-label="Peta spasial 3D Sumatera"
          style={{
            flex: isMobile ? 'none' : 1,
            width: isMobile ? '100%' : 'auto',
            height: isMobile ? '420px' : '100%',
            minWidth: 0,
            position: 'relative',
          }}
        >
          <SumatraMap3D
            regions={regions}
            selectedCode={selectedRegion.kodeBps}
            highlightedNeighborCode={highlightedNeighborCode}
            metric={mapMetric}
            onMetricChange={setMapMetric}
            quotaByCode={quotaByCode}
            activeStrategyLabel={activeStrategy}
            onSelectRegion={handleSelectRegion}
          />
        </section>

        {/* Right Side Inspector Panel */}
        <aside
          aria-label="Panel analisis TRACK-TB"
          className="panel-scroll"
          style={{
            width: isMobile ? '100%' : '420px',
            flexShrink: 0,
            height: isMobile ? 'auto' : '100%',
            backgroundColor: 'var(--goku)',
            borderLeft: isMobile ? 'none' : '1px solid var(--beerus)',
            borderTop: isMobile ? '1px solid var(--beerus)' : 'none',
            padding: '20px',
            overflowX: 'hidden',
            overflowY: isMobile ? 'visible' : 'auto',
            display: 'flex',
            flexDirection: 'column',
            gap: '16px',
          }}
        >
          {/* Active Data Source Status Row (dot + plain text, no chip) */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: '8px',
              fontSize: 'var(--text-xs)',
              color: 'var(--trunks)',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span className="status-dot" style={{ backgroundColor: 'var(--roshi)' }} />
              <span>{dataSourceLabel}</span>
            </div>
            {csvFeedback && (
              <button
                type="button"
                onClick={() => setCsvFeedback(null)}
                style={{
                  border: 'none',
                  background: 'transparent',
                  padding: 0,
                  fontSize: 'var(--text-xs)',
                  color: 'var(--piccolo)',
                  cursor: 'pointer',
                }}
              >
                Tutup
              </button>
            )}
          </div>

          <MascotGuideCard
            activeTab={activeTab}
            selectedRegion={selectedRegion}
            trackTbRow={
              simBundle.summary.find((s) => s.strategi === activeStrategy) ?? simBundle.summary[0]
            }
          />

          {csvFeedback && (
            <div
              style={{
                padding: '12px 16px',
                borderRadius: 'var(--radius-s-sm)',
                backgroundColor: 'var(--roshi-10)',
                color: 'var(--piccolo-deep)',
                fontSize: 'var(--text-xs)',
              }}
            >
              {csvFeedback}
            </div>
          )}

          <InspectorPanel
            activeTab={activeTab}
            regions={regions}
            selectedRegion={selectedRegion}
            onSelectRegion={handleSelectRegion}
            highlightedNeighborCode={highlightedNeighborCode}
            onHighlightNeighbor={setHighlightedNeighborCode}
            simScope={simScope}
            onSimScopeChange={handleSimScopeChange}
            anggaran={anggaran}
            onAnggaranChange={setAnggaran}
            faktorTemu={faktorTemu}
            onFaktorTemuChange={setFaktorTemu}
            activeStrategy={activeStrategy}
            onStrategyChange={(strat) => {
              setActiveStrategy(strat);
              setMapMetric('kuota');
            }}
            simBundle={simBundle}
            onShowQuotaOnMap={() => setMapMetric('kuota')}
          />
        </aside>
      </main>

      <MethodologyModal open={methodOpen} onClose={() => setMethodOpen(false)} />
    </div>
  );
}

export default App;
