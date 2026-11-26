import { X } from 'lucide-react';
import { COVERAGE_SUMMARY, GRAPH_STATS, SELECTED_MODEL_NAME } from '../data/benchmarkData';

interface MethodologyModalProps {
  open: boolean;
  onClose: () => void;
}

export function MethodologyModal({ open, onClose }: MethodologyModalProps) {
  if (!open) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Penjelasan Metodologi TRACK-TB"
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 50,
        backgroundColor: 'rgba(14, 31, 24, 0.36)',
        display: 'flex',
        justifyContent: 'flex-end',
      }}
      onClick={onClose}
    >
      <div
        className="panel-scroll"
        style={{
          width: '100%',
          maxWidth: '460px',
          height: '100%',
          backgroundColor: 'var(--gohan)',
          borderLeft: '1px solid var(--beerus)',
          boxShadow: 'var(--shadow-lg)',
          padding: '24px',
          overflowY: 'auto',
          display: 'flex',
          flexDirection: 'column',
          gap: '20px',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <img
              src="/mascot-tracktb.png"
              alt="Maskot TRACK-TB"
              width={44}
              height={44}
              style={{
                width: '44px',
                height: '44px',
                objectFit: 'contain',
                display: 'block',
                flexShrink: 0,
              }}
            />
            <h2 style={{ margin: 0, fontSize: 'var(--text-lg)', fontWeight: 600, color: 'var(--bulma)' }}>
              Metodologi TRACK-TB
            </h2>
          </div>
          <button
            type="button"
            aria-label="Tutup panel metodologi"
            className="pressable"
            onClick={onClose}
            style={{
              border: 'none',
              background: 'transparent',
              padding: '8px',
              cursor: 'pointer',
              color: 'var(--trunks)',
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <X size={20} strokeWidth={1.75} />
          </button>
        </div>

        <div className="moon-card" style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <div style={{ fontSize: 'var(--text-base)', fontWeight: 600, color: 'var(--bulma)' }}>
            1. Alur Prediksi Tanpa Kebocoran Target
          </div>
          <p style={{ margin: 0, fontSize: 'var(--text-sm)', color: 'var(--trunks)', lineHeight: 1.55 }}>
            Model pohon ({SELECTED_MODEL_NAME}) dilatih penuh pada 154 kabupaten/kota tahun 2023,
            dipilih melalui validasi temporal 2024 (71 wilayah), lalu dikunci untuk menguji tahun
            2025 (57 wilayah berlabel resmi) dan mengisi 97 wilayah tanpa laporan TC 2025.
          </p>
          <p style={{ margin: 0, fontSize: 'var(--text-sm)', color: 'var(--trunks)', lineHeight: 1.55 }}>
            Fitur input hanya memakai faktor struktural lokal (penduduk, kepadatan, kemiskinan,
            hunian layak, rasio puskesmas, status kota) dan estimasi insiden 2023 pada maksimal
            5 tetangga graf batas administratif. Estimasi insiden wilayah target, notifikasi, dan
            TC historis dikeluarkan sepenuhnya dari fitur.
          </p>
        </div>

        <div className="moon-card" style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <div style={{ fontSize: 'var(--text-base)', fontWeight: 600, color: 'var(--bulma)' }}>
            2. Dekomposisi Struktural dan Programatik
          </div>
          <p style={{ margin: 0, fontSize: 'var(--text-sm)', color: 'var(--trunks)', lineHeight: 1.55 }}>
            Prediksi TC menggambarkan capaian yang wajar diharapkan berdasarkan struktur demografi
            dan layanan wilayah. Selisih positif (TC prediksi dikurangi TC asli) menandai defisit
            atau kesenjangan programatik yang perlu dibenahi lewat pelaporan faskes swasta,
            investigasi kontak, dan optimalisasi TCM.
          </p>
        </div>

        <div className="moon-card" style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <div style={{ fontSize: 'var(--text-base)', fontWeight: 600, color: 'var(--bulma)' }}>
            3. Asumsi dan Batasan Simulasi Skrining
          </div>
          <p style={{ margin: 0, fontSize: 'var(--text-sm)', color: 'var(--trunks)', lineHeight: 1.55 }}>
            Simulasi membagi kuota tetap (default 100.000 skrining, faktor temu ilustratif 0,80)
            secara proporsional dengan batas kapasitas penduduk. Hasil merupakan ekspektasi model
            untuk membandingkan strategi alokasi, bukan klaim uji lapangan, dengan asumsi biaya per
            skrining seragam dan laju insiden 2023 ke 2025 tetap.
          </p>
        </div>

        <div className="moon-card" style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <div style={{ fontSize: 'var(--text-base)', fontWeight: 600, color: 'var(--bulma)' }}>
            Ringkasan Panel dan Graf Spasial
          </div>
          <div style={{ fontSize: 'var(--text-sm)', color: 'var(--trunks)' }}>
            Graf batas administratif: {GRAPH_STATS.wilayah} wilayah, {GRAPH_STATS.pasanganBatas}{' '}
            pasangan batas ({GRAPH_STATS.wilayahDipotongLima} wilayah dipotong ke 5 tetangga).
          </div>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 'var(--text-xs)' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid var(--beerus)', color: 'var(--trunks)', textAlign: 'left' }}>
                <th style={{ padding: '8px 0', fontWeight: 600 }}>Tahun</th>
                <th style={{ padding: '8px 0', fontWeight: 600, textAlign: 'right' }}>TC Resmi</th>
                <th style={{ padding: '8px 0', fontWeight: 600, textAlign: 'right' }}>TC Kosong</th>
                <th style={{ padding: '8px 0', fontWeight: 600, textAlign: 'right' }}>Insiden Asli</th>
              </tr>
            </thead>
            <tbody className="tabular">
              {COVERAGE_SUMMARY.map((row) => (
                <tr key={row.tahun} style={{ borderBottom: '1px solid var(--beerus)' }}>
                  <td style={{ padding: '8px 0', fontWeight: 600, color: 'var(--bulma)' }}>{row.tahun}</td>
                  <td style={{ padding: '8px 0', textAlign: 'right' }}>{row.tcResmi}</td>
                  <td style={{ padding: '8px 0', textAlign: 'right' }}>{row.tcKosong}</td>
                  <td style={{ padding: '8px 0', textAlign: 'right' }}>{row.estimasiInsidenAsli}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
