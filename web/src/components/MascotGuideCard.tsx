import type { MainTab, RegionRecord, StrategyResultRow } from '../types';

interface MascotGuideCardProps {
  activeTab: MainTab;
  selectedRegion: RegionRecord;
  trackTbRow?: StrategyResultRow;
}

export function MascotGuideCard({
  activeTab,
  selectedRegion,
  trackTbRow,
}: MascotGuideCardProps) {
  const defisit =
    selectedRegion.tcAsli2025 !== null
      ? selectedRegion.tcPrediksi2025 - selectedRegion.tcAsli2025
      : null;

  let title = 'Rekomendasi Singkat';
  let body = '';

  if (activeTab === 'peta') {
    if (defisit !== null && defisit >= 12) {
      title = `Prioritas Tinggi di ${selectedRegion.kabupatenKota}`;
      body = `Capaian resmi tertinggal ${defisit.toFixed(1)} pp di bawah prediksi struktural. Fokuskan pelaporan faskes swasta, investigasi kontak, dan skrining aktif.`;
    } else if (defisit !== null && defisit > 0) {
      title = `Celah Programatik di ${selectedRegion.kabupatenKota}`;
      body = `Terdapat selisih ${defisit.toFixed(1)} pp dari potensi strukturalnya. Perlu penguatan pelacakan kasus dan pemanfaatan TCM setempat.`;
    } else if (defisit !== null) {
      title = `Kinerja Baik di ${selectedRegion.kabupatenKota}`;
      body = `Cakupan resmi sudah setara atau melampaui prediksi model (${selectedRegion.tcAsli2025?.toFixed(1)}% vs ${selectedRegion.tcPrediksi2025.toFixed(1)}%). Layak dijadikan rujukan praktik baik.`;
    } else {
      title = `Estimasi Model untuk ${selectedRegion.kabupatenKota}`;
      body = `TC resmi 2025 belum tersedia sehingga model memperkirakan ${selectedRegion.tcPrediksi2025.toFixed(1)}% berdasarkan struktur wilayah dan ${selectedRegion.jumlahTetanggaDipakai} tetangga.`;
    }
  } else if (activeTab === 'shap') {
    const topItem = selectedRegion.shapItems[0];
    title = `Pendorong Utama ${selectedRegion.kabupatenKota}`;
    body = topItem
      ? `Faktor terbesar adalah ${topItem.label.toLowerCase()} (${topItem.contributionPp >= 0 ? '+' : ''}${topItem.contributionPp.toFixed(2)} pp) terhadap nilai dasar 56,30%.`
      : 'Kontribusi fitur dihitung secara aditif dengan TreeSHAP pada model XGBoost.';
  } else if (activeTab === 'simulasi') {
    title = 'Panduan Alokasi Skrining';
    body = trackTbRow
      ? `Dengan anggaran saat ini, strategi ${trackTbRow.strategi} diperkirakan menemukan ${trackTbRow.ekspektasiKasus.toFixed(2)} kasus (${trackTbRow.selisihVsPenduduk >= 0 ? '+' : ''}${trackTbRow.selisihVsPenduduk.toFixed(2)} dibanding alokasi berbasis penduduk).`
      : 'Geser anggaran atau faktor temu untuk menguji sensitivitas alokasi skrining di peta 3D.';
  } else {
    title = 'Catatan Validasi Model';
    body =
      'Penambahan fitur insiden tetangga menurunkan galat uji 2025 dibanding fitur lokal saja, dengan validitas aditivitas SHAP terverifikasi pada seluruh 154 wilayah.';
  }

  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: '8px',
        marginLeft: '-20px',
      }}
    >
      <img
        src="/mascot-pointing.png"
        alt="Maskot Asisten TRACK-TB menunjuk catatan"
        width={92}
        height={92}
        style={{
          width: '92px',
          height: '92px',
          objectFit: 'contain',
          display: 'block',
          flexShrink: 0,
          marginLeft: '-18px',
          transform: 'rotate(4deg)',
        }}
      />
      <div
        className="moon-card"
        style={{
          flex: 1,
          minWidth: 0,
          padding: '16px 20px',
        }}
      >
        <div
          style={{
            fontSize: 'var(--text-sm)',
            fontWeight: 600,
            color: 'var(--piccolo-deep)',
          }}
        >
          {title}
        </div>
        <div
          style={{
            fontSize: 'var(--text-xs)',
            color: 'var(--trunks)',
            marginTop: '4px',
            lineHeight: 1.45,
          }}
        >
          {body}
        </div>
      </div>
    </div>
  );
}
