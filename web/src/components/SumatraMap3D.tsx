import { useEffect, useMemo, useRef, useState } from 'react';
import maplibregl from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import { Compass, Layers, RotateCcw } from 'lucide-react';
import type { BasemapMode, MapMetric, RegionRecord } from '../types';
import { estimasiGap } from '../lib/simulation';
import { createThreeOverlayController, type ThreeOverlayController } from '../lib/threeMapLayer';
import { BorderlessSelect } from './BorderlessSelect';

interface SumatraMap3DProps {
  regions: RegionRecord[];
  selectedCode: string;
  highlightedNeighborCode: string | null;
  metric: MapMetric;
  onMetricChange: (metric: MapMetric) => void;
  quotaByCode: Record<string, number>;
  activeStrategyLabel: string;
  onSelectRegion: (kodeBps: string) => void;
}

const SUMATRA_CENTER: [number, number] = [101.4, -0.4];
const SUMATRA_ZOOM = 5.35;

const BASEMAP_TILES: Record<BasemapMode, { url: string; label: string; attribution: string }> = {
  osm_hijau: {
    url: 'https://tile.openstreetmap.org/{z}/{x}/{y}.png',
    label: 'OSM Hijau',
    attribution: 'OpenStreetMap contributors',
  },
  osm_standar: {
    url: 'https://tile.openstreetmap.org/{z}/{x}/{y}.png',
    label: 'OSM Standar',
    attribution: 'OpenStreetMap contributors',
  },
  polos: {
    url: 'https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Light_Gray_Base/MapServer/tile/{z}/{y}/{x}',
    label: 'Kanvas Terang',
    attribution: 'Esri, HERE, Garmin, OpenStreetMap',
  },
};

function computeVisualValues(
  region: RegionRecord,
  metric: MapMetric,
  quotaByCode: Record<string, number>,
  maxQuota: number,
): { color: string; height: number; displayVal: string } {
  if (metric === 'defisit') {
    const defisit =
      region.tcAsli2025 !== null ? region.tcPrediksi2025 - region.tcAsli2025 : null;
    if (defisit === null) {
      const h = 4_000 + Math.min(110, region.tcPrediksi2025) * 65;
      return {
        color: '#84B59F',
        height: h,
        displayVal: `Estimasi model ${region.tcPrediksi2025.toFixed(1)}%`,
      };
    }
    if (defisit >= 12) {
      return {
        color: '#B45441',
        height: 22_000 + Math.min(40, defisit) * 400,
        displayVal: `Defisit +${defisit.toFixed(1)} pp`,
      };
    }
    if (defisit >= 3) {
      return {
        color: '#C27D1A',
        height: 12_000 + defisit * 800,
        displayVal: `Defisit +${defisit.toFixed(1)} pp`,
      };
    }
    if (defisit >= -3) {
      return {
        color: '#2E9E6B',
        height: 7_000,
        displayVal: `Seimbang (${defisit >= 0 ? '+' : ''}${defisit.toFixed(1)} pp)`,
      };
    }
    return {
      color: '#117A66',
      height: 5_500,
      displayVal: `Melampaui prediksi (${defisit.toFixed(1)} pp)`,
    };
  }

  if (metric === 'prediksi') {
    const tc = region.tcPrediksi2025;
    const norm = Math.max(0, Math.min(1, (tc - 30) / 75));
    const palette =
      tc >= 85 ? '#0A4A3E' : tc >= 68 ? '#117A66' : tc >= 52 ? '#2E9E6B' : '#73AE92';
    return {
      color: palette,
      height: 3_500 + norm * 32_000,
      displayVal: `${tc.toFixed(1)}%`,
    };
  }

  if (metric === 'kuota') {
    const q = quotaByCode[region.kodeBps] ?? 0;
    const ratio = maxQuota > 0 ? Math.min(1, q / maxQuota) : 0;
    const color =
      q <= 0
        ? '#CBDCD2'
        : ratio > 0.55
          ? '#0A4A3E'
          : ratio > 0.25
            ? '#117A66'
            : ratio > 0.08
              ? '#2E9E6B'
              : '#6CAE90';
    return {
      color,
      height: 2_500 + ratio * 36_000,
      displayVal: `${q.toLocaleString('id-ID')} skrining`,
    };
  }

  const gap = estimasiGap(
    region.insiden2025Proyeksi,
    region.tcAsli2025 ?? region.tcPrediksi2025,
  );
  const ratio = Math.min(1, gap / 1800);
  const color =
    gap >= 1000
      ? '#B45441'
      : gap >= 550
        ? '#C27D1A'
        : gap >= 250
          ? '#226D72'
          : '#2E9E6B';
  return {
    color,
    height: 3_000 + ratio * 34_000,
    displayVal: `${Math.round(gap).toLocaleString('id-ID')} kasus hilang`,
  };
}

export function SumatraMap3D({
  regions,
  selectedCode,
  highlightedNeighborCode,
  metric,
  onMetricChange,
  quotaByCode,
  activeStrategyLabel,
  onSelectRegion,
}: SumatraMap3DProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<maplibregl.Map | null>(null);
  const threeCtrlRef = useRef<ThreeOverlayController | null>(null);
  const onSelectRef = useRef(onSelectRegion);
  onSelectRef.current = onSelectRegion;

  const [is3D, setIs3D] = useState(true);
  const [basemap, setBasemap] = useState<BasemapMode>('osm_hijau');
  const [mapReady, setMapReady] = useState(false);
  const [isNarrowMap, setIsNarrowMap] = useState(
    typeof window !== 'undefined' ? window.innerWidth < 640 : false,
  );
  const [hoverInfo, setHoverInfo] = useState<{
    region: RegionRecord;
    x: number;
    y: number;
  } | null>(null);

  useEffect(() => {
    const onResize = () => setIsNarrowMap(window.innerWidth < 640);
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  const regionByCode = useMemo(() => {
    const map = new Map<string, RegionRecord>();
    for (const r of regions) map.set(r.kodeBps, r);
    return map;
  }, [regions]);

  const maxQuota = useMemo(() => {
    let m = 1;
    for (const val of Object.values(quotaByCode)) {
      if (val > m) m = val;
    }
    return m;
  }, [quotaByCode]);

  const selectedRegion = regionByCode.get(selectedCode) ?? null;

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;

    const prefersReduced =
      typeof window !== 'undefined' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    const initialBasemap = BASEMAP_TILES.osm_hijau;
    const map = new maplibregl.Map({
      container: containerRef.current,
      center: SUMATRA_CENTER,
      zoom: SUMATRA_ZOOM,
      pitch: 48,
      bearing: -16,
      maxPitch: 70,
      minZoom: 4.3,
      maxZoom: 11,
      attributionControl: false,
      canvasContextAttributes: {
        preserveDrawingBuffer: true,
        antialias: true,
      },
      style: {
        version: 8,
        light: {
          anchor: 'viewport',
          color: '#ffffff',
          intensity: 0.38,
          position: [1.5, 195, 42],
        },
        sources: {
          basemap: {
            type: 'raster',
            tiles: [initialBasemap.url],
            tileSize: 256,
            attribution: initialBasemap.attribution,
          },
          sumatra: {
            type: 'geojson',
            data: '/data/sumatra_kabkota.geojson',
            promoteId: 'kodeBps',
          },
        },
        layers: [
          {
            id: 'background-botanical',
            type: 'background',
            paint: {
              'background-color': '#E5EFE9',
            },
          },
          {
            id: 'basemap-raster',
            type: 'raster',
            source: 'basemap',
            paint: {
              'raster-opacity': 0.72,
              'raster-saturation': -0.45,
              'raster-hue-rotate': 24,
              'raster-brightness-min': 0.14,
              'raster-contrast': -0.05,
            },
          },
          {
            id: 'sumatra-extrusion',
            type: 'fill-extrusion',
            source: 'sumatra',
            paint: {
              'fill-extrusion-color': ['coalesce', ['feature-state', 'color'], '#2E9E6B'],
              'fill-extrusion-height': ['coalesce', ['feature-state', 'height'], 8000],
              'fill-extrusion-base': 0,
              'fill-extrusion-opacity': 0.96,
              'fill-extrusion-vertical-gradient': true,
            },
          },
          {
            id: 'sumatra-outline',
            type: 'line',
            source: 'sumatra',
            paint: {
              'line-opacity': 0,
              'line-color': [
                'case',
                ['boolean', ['feature-state', 'selected'], false],
                '#0A4A3E',
                ['boolean', ['feature-state', 'hovered'], false],
                '#117A66',
                'rgba(255,255,255,0.65)',
              ],
              'line-width': [
                'case',
                ['boolean', ['feature-state', 'selected'], false],
                2.5,
                ['boolean', ['feature-state', 'hovered'], false],
                1.8,
                0.7,
              ],
            },
          },
        ],
      },
    });

    const threeCtrl = createThreeOverlayController();
    threeCtrl.setReducedMotion(prefersReduced);
    threeCtrlRef.current = threeCtrl;
    mapRef.current = map;

    map.addControl(new maplibregl.AttributionControl({ compact: true }), 'bottom-right');

    let lastHoveredId: string | null = null;

    map.on('load', () => {
      try {
        map.addLayer(threeCtrl.layer);
      } catch {
        // Fallback if WebGL limits custom layer
      }
      setMapReady(true);
    });

    map.on('mousemove', 'sumatra-extrusion', (e) => {
      const feat = e.features?.[0];
      const code = feat?.properties?.kodeBps as string | undefined;
      if (!code) return;
      map.getCanvas().style.cursor = 'pointer';

      if (lastHoveredId && lastHoveredId !== code) {
        map.setFeatureState({ source: 'sumatra', id: lastHoveredId }, { hovered: false });
      }
      lastHoveredId = code;
      map.setFeatureState({ source: 'sumatra', id: code }, { hovered: true });

      const rec = regionByCode.get(code);
      if (rec) {
        setHoverInfo({
          region: rec,
          x: e.point.x,
          y: e.point.y,
        });
      }
    });

    map.on('mouseleave', 'sumatra-extrusion', () => {
      map.getCanvas().style.cursor = '';
      if (lastHoveredId) {
        map.setFeatureState({ source: 'sumatra', id: lastHoveredId }, { hovered: false });
        lastHoveredId = null;
      }
      setHoverInfo(null);
    });

    map.on('click', 'sumatra-extrusion', (e) => {
      const code = e.features?.[0]?.properties?.kodeBps as string | undefined;
      if (code) {
        onSelectRef.current(code);
      }
    });

    return () => {
      map.remove();
      mapRef.current = null;
      threeCtrlRef.current = null;
      setMapReady(false);
    };
  }, []);

  const heightByCode = useMemo(() => {
    const out: Record<string, number> = {};
    for (const r of regions) {
      out[r.kodeBps] = computeVisualValues(r, metric, quotaByCode, maxQuota).height;
    }
    return out;
  }, [regions, metric, quotaByCode, maxQuota]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !mapReady) return;

    const applyStates = () => {
      for (const r of regions) {
        const vis = computeVisualValues(r, metric, quotaByCode, maxQuota);
        map.setFeatureState(
          { source: 'sumatra', id: r.kodeBps },
          {
            color: vis.color,
            height: vis.height,
            selected: r.kodeBps === selectedCode,
          },
        );
      }
      map.triggerRepaint();
    };

    if (map.isSourceLoaded('sumatra')) {
      applyStates();
    } else {
      const onData = (ev: maplibregl.MapSourceDataEvent) => {
        if (ev.sourceId === 'sumatra' && ev.isSourceLoaded) {
          applyStates();
          map.off('sourcedata', onData);
        }
      };
      map.on('sourcedata', onData);
      return () => {
        map.off('sourcedata', onData);
      };
    }
  }, [mapReady, regions, metric, quotaByCode, maxQuota, selectedCode]);

  useEffect(() => {
    threeCtrlRef.current?.setSelection(selectedRegion, highlightedNeighborCode, heightByCode);
    const map = mapRef.current;
    if (!map || !mapReady || !selectedRegion) return;

    const prefersReduced =
      typeof window !== 'undefined' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    map.flyTo({
      center: selectedRegion.centroid,
      zoom: Math.max(map.getZoom(), 6.8),
      pitch: is3D ? 52 : 0,
      bearing: is3D ? -14 : 0,
      duration: prefersReduced ? 0 : 850,
      essential: true,
    });
  }, [mapReady, selectedRegion, highlightedNeighborCode, heightByCode, is3D]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !mapReady) return;
    if (map.getLayer('sumatra-outline')) {
      map.setPaintProperty('sumatra-outline', 'line-opacity', is3D ? 0 : 0.85);
    }
  }, [mapReady, is3D]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !mapReady) return;
    const src = map.getSource('basemap') as maplibregl.RasterTileSource | undefined;
    if (src && typeof src.setTiles === 'function') {
      src.setTiles([BASEMAP_TILES[basemap].url]);
    }
    if (basemap === 'osm_hijau') {
      map.setPaintProperty('basemap-raster', 'raster-saturation', -0.45);
      map.setPaintProperty('basemap-raster', 'raster-hue-rotate', 24);
      map.setPaintProperty('basemap-raster', 'raster-brightness-min', 0.14);
      map.setPaintProperty('basemap-raster', 'raster-opacity', 0.72);
    } else if (basemap === 'osm_standar') {
      map.setPaintProperty('basemap-raster', 'raster-saturation', 0);
      map.setPaintProperty('basemap-raster', 'raster-hue-rotate', 0);
      map.setPaintProperty('basemap-raster', 'raster-brightness-min', 0);
      map.setPaintProperty('basemap-raster', 'raster-opacity', 0.88);
    } else {
      map.setPaintProperty('basemap-raster', 'raster-saturation', -0.35);
      map.setPaintProperty('basemap-raster', 'raster-hue-rotate', 16);
      map.setPaintProperty('basemap-raster', 'raster-brightness-min', 0.08);
      map.setPaintProperty('basemap-raster', 'raster-opacity', 0.65);
    }
  }, [mapReady, basemap]);

  const toggle3D = (next3D: boolean) => {
    setIs3D(next3D);
    const map = mapRef.current;
    if (!map) return;
    map.easeTo({
      pitch: next3D ? 48 : 0,
      bearing: is3D ? -16 : 0,
      duration: 500,
    });
  };

  const resetCamera = () => {
    const map = mapRef.current;
    if (!map) return;
    map.flyTo({
      center: SUMATRA_CENTER,
      zoom: SUMATRA_ZOOM,
      pitch: is3D ? 48 : 0,
      bearing: is3D ? -16 : 0,
      duration: 800,
    });
  };

  const hoverComputed = hoverInfo
    ? computeVisualValues(hoverInfo.region, metric, quotaByCode, maxQuota)
    : null;

  return (
    <div
      style={{
        position: 'relative',
        width: '100%',
        height: '100%',
        backgroundColor: 'var(--map-water)',
        overflow: 'hidden',
      }}
    >
      <div ref={containerRef} style={{ width: '100%', height: '100%' }} />

      {/* Top-left floating layer & basemap bar (Grid-4 spacing, custom borderless dropdown) */}
      <div
        style={{
          position: 'absolute',
          top: '16px',
          left: '16px',
          right: isNarrowMap ? '16px' : 'auto',
          zIndex: 10,
          display: 'flex',
          flexWrap: 'wrap',
          alignItems: 'center',
          gap: '12px',
          padding: '8px 16px',
          backgroundColor: 'rgba(255, 255, 255, 0.94)',
          backdropFilter: 'blur(10px)',
          border: '1px solid var(--beerus)',
          borderRadius: 'var(--radius-s-md)',
          boxShadow: 'var(--shadow-sm)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Layers size={16} strokeWidth={1.75} style={{ color: 'var(--piccolo)', flexShrink: 0 }} />
          <BorderlessSelect<MapMetric>
            ariaLabel="Pilih metrik peta 3D"
            prefix="Lapisan"
            value={metric}
            onChange={onMetricChange}
            options={[
              { value: 'defisit', label: 'Defisit TC (Prediksi minus Asli)' },
              { value: 'prediksi', label: 'TC Prediksi 2025' },
              { value: 'kuota', label: `Kuota Skrining (${activeStrategyLabel})` },
              { value: 'beban', label: 'Beban Kasus Hilang' },
            ]}
          />
        </div>

        {!isNarrowMap && (
          <div style={{ width: '1px', height: '16px', backgroundColor: 'var(--beerus)' }} />
        )}

        <BorderlessSelect<BasemapMode>
          ariaLabel="Pilih gaya peta dasar OpenStreetMap"
          prefix="Peta Dasar"
          value={basemap}
          onChange={setBasemap}
          options={[
            { value: 'osm_hijau', label: 'OSM Hijau' },
            { value: 'osm_standar', label: 'OSM Standar' },
            { value: 'polos', label: 'Kanvas Terang' },
          ]}
        />
      </div>

      {/* Top-right Three.js beacon indicator (desktop only, completely avoids bottom attribution) */}
      {selectedRegion && !isNarrowMap && (
        <div
          style={{
            position: 'absolute',
            top: '16px',
            right: '16px',
            zIndex: 9,
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            padding: '8px 12px',
            backgroundColor: 'rgba(255, 255, 255, 0.94)',
            backdropFilter: 'blur(10px)',
            border: '1px solid var(--beerus)',
            borderRadius: 'var(--radius-s-sm)',
            boxShadow: 'var(--shadow-sm)',
            fontSize: 'var(--text-xs)',
            color: 'var(--trunks)',
            pointerEvents: 'none',
          }}
        >
          <Compass size={16} strokeWidth={1.75} style={{ color: 'var(--piccolo)' }} />
          <span>
            Busur 3D aktif untuk {selectedRegion.kabupatenKota} ({selectedRegion.jumlahTetanggaDipakai}{' '}
            tetangga)
          </span>
        </div>
      )}

      {/* Bottom-left camera + legend bar */}
      <div
        style={{
          position: 'absolute',
          bottom: '16px',
          left: '16px',
          zIndex: 10,
          display: 'flex',
          flexDirection: 'column',
          gap: '8px',
          padding: isNarrowMap ? '8px 12px' : '12px 16px',
          backgroundColor: 'rgba(255, 255, 255, 0.94)',
          backdropFilter: 'blur(10px)',
          border: '1px solid var(--beerus)',
          borderRadius: 'var(--radius-s-md)',
          boxShadow: 'var(--shadow-sm)',
          maxWidth: isNarrowMap ? 'calc(100% - 64px)' : 'calc(100% - 180px)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <button
              type="button"
              className="moon-subtab pressable"
              aria-selected={is3D}
              onClick={() => toggle3D(true)}
              style={{ padding: '4px 0' }}
            >
              Peta 3D
            </button>
            <button
              type="button"
              className="moon-subtab pressable"
              aria-selected={!is3D}
              onClick={() => toggle3D(false)}
              style={{ padding: '4px 0' }}
            >
              Peta 2D
            </button>
          </div>

          <div style={{ width: '1px', height: '16px', backgroundColor: 'var(--beerus)' }} />

          <button
            type="button"
            className="pressable"
            onClick={resetCamera}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '4px',
              border: 'none',
              background: 'transparent',
              padding: '4px 0',
              fontSize: 'var(--text-sm)',
              fontWeight: 500,
              color: 'var(--trunks)',
              cursor: 'pointer',
              whiteSpace: 'nowrap',
            }}
          >
            <RotateCcw size={14} strokeWidth={1.75} />
            Reset Sumatera
          </button>
        </div>

        {/* Clean legend row (dot + text, token colors, hidden on super narrow mobile to keep map clear) */}
        {!isNarrowMap && (
          <div
            style={{
              display: 'flex',
              flexWrap: 'wrap',
              alignItems: 'center',
              gap: '12px',
              fontSize: 'var(--text-xs)',
              color: 'var(--trunks)',
            }}
          >
            {metric === 'defisit' && (
              <>
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: '8px' }}>
                  <span className="status-dot" style={{ backgroundColor: 'var(--chichi)' }} />
                  Defisit tinggi (12+ pp)
                </span>
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: '8px' }}>
                  <span className="status-dot" style={{ backgroundColor: 'var(--krillin)' }} />
                  Defisit sedang (3 sampai 12 pp)
                </span>
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: '8px' }}>
                  <span className="status-dot" style={{ backgroundColor: 'var(--piccolo)' }} />
                  Sesuai atau melampaui prediksi
                </span>
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: '8px' }}>
                  <span className="status-dot" style={{ backgroundColor: 'var(--map-missing)' }} />
                  Belum ada TC resmi 2025
                </span>
              </>
            )}
            {metric === 'prediksi' && (
              <>
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: '8px' }}>
                  <span className="status-dot" style={{ backgroundColor: 'var(--map-low)' }} />
                  Rendah (&lt;52%)
                </span>
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: '8px' }}>
                  <span className="status-dot" style={{ backgroundColor: 'var(--map-mid)' }} />
                  Menengah (52 sampai 68%)
                </span>
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: '8px' }}>
                  <span className="status-dot" style={{ backgroundColor: 'var(--piccolo-deep)' }} />
                  Tinggi (&ge;85%)
                </span>
              </>
            )}
            {metric === 'kuota' && (
              <>
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: '8px' }}>
                  <span className="status-dot" style={{ backgroundColor: 'var(--map-zero)' }} />
                  Di luar cakupan atau nol
                </span>
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: '8px' }}>
                  <span className="status-dot" style={{ backgroundColor: 'var(--map-mid)' }} />
                  Kuota sedang
                </span>
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: '8px' }}>
                  <span className="status-dot" style={{ backgroundColor: 'var(--piccolo-deep)' }} />
                  Prioritas tertinggi ({activeStrategyLabel})
                </span>
              </>
            )}
            {metric === 'beban' && (
              <>
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: '8px' }}>
                  <span className="status-dot" style={{ backgroundColor: 'var(--roshi)' }} />
                  &lt;250 kasus hilang
                </span>
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: '8px' }}>
                  <span className="status-dot" style={{ backgroundColor: 'var(--krillin)' }} />
                  550 sampai 999 kasus
                </span>
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: '8px' }}>
                  <span className="status-dot" style={{ backgroundColor: 'var(--chichi)' }} />
                  &ge;1.000 kasus hilang
                </span>
              </>
            )}
          </div>
        )}
      </div>

      {/* Clean hover tooltip clamped inside container */}
      {hoverInfo && hoverComputed && (() => {
        const boxW = containerRef.current?.clientWidth ?? 800;
        const boxH = containerRef.current?.clientHeight ?? 600;
        const clampedLeft = Math.max(16, Math.min(hoverInfo.x + 16, boxW - 236));
        const preferredTop = hoverInfo.y < 160 ? hoverInfo.y + 18 : hoverInfo.y - 96;
        const clampedTop = Math.max(76, Math.min(preferredTop, boxH - 120));
        return (
          <div
            style={{
              position: 'absolute',
              left: clampedLeft,
              top: clampedTop,
              zIndex: 20,
              pointerEvents: 'none',
              backgroundColor: 'var(--gohan)',
              border: '1px solid var(--beerus-strong)',
              borderRadius: 'var(--radius-s-md)',
              padding: '12px 16px',
              boxShadow: 'var(--shadow-md)',
              minWidth: '210px',
              maxWidth: '240px',
            }}
          >
            <div style={{ fontSize: 'var(--text-sm)', fontWeight: 600, color: 'var(--bulma)' }}>
              {hoverInfo.region.kabupatenKota}
            </div>
            <div style={{ fontSize: 'var(--text-xs)', color: 'var(--trunks)', marginTop: '4px' }}>
              {hoverInfo.region.provinsi} (BPS {hoverInfo.region.kodeBps})
            </div>
            <div
              className="tabular"
              style={{
                fontSize: 'var(--text-sm)',
                fontWeight: 600,
                color: 'var(--piccolo)',
                marginTop: '8px',
              }}
            >
              {hoverComputed.displayVal}
            </div>
          </div>
        );
      })()}
    </div>
  );
}
