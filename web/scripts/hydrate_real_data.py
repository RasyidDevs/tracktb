import json
from pathlib import Path
import numpy as np
import pandas as pd
from xgboost import DMatrix, XGBRegressor

WEB_DIR = Path(__file__).resolve().parent.parent
REPO_DIR = WEB_DIR.parent
DATA_DIR = REPO_DIR / "data"
CSV_PATH = REPO_DIR / "prediksi_tc_2025.csv"
OOF_2023_PATH = REPO_DIR / "prediksi_tc_2023_oof.csv"
REGIONS_PATH = WEB_DIR / "src" / "data" / "regions.json"
GEOJSON_PATH = WEB_DIR / "public" / "data" / "sumatra_kabkota.geojson"

TARGET = "tc_resmi_pct"
INCIDENCE = "estimasi_insiden_tbc"
MAX_NEIGHBORS = 5
YEARS = (2023, 2024, 2025)
LOCAL_FEATURES = [
    "penduduk_jiwa",
    "kepadatan_jiwa_km2",
    "penduduk_miskin_pct",
    "rt_hunian_layak_pct",
    "puskesmas_per_100rb_penduduk",
    "wilayah_kota",
]

FEATURE_LABELS = {
    "penduduk_jiwa": "Jumlah penduduk",
    "kepadatan_jiwa_km2": "Kepadatan penduduk",
    "penduduk_miskin_pct": "Penduduk miskin (%)",
    "rt_hunian_layak_pct": "Hunian layak (%)",
    "puskesmas_per_100rb_penduduk": "Puskesmas / 100 ribu",
    "wilayah_kota": "Status kota",
    "kasus_tetangga_1": "Estimasi kasus tetangga 1",
    "kasus_tetangga_2": "Estimasi kasus tetangga 2",
    "kasus_tetangga_3": "Estimasi kasus tetangga 3",
    "kasus_tetangga_4": "Estimasi kasus tetangga 4",
    "kasus_tetangga_5": "Estimasi kasus tetangga 5",
}


def workbook(year: int) -> Path:
    return DATA_DIR / f"TRACK-TB_Join_Sumatera_{year}.xlsx"


def load_year(year: int) -> pd.DataFrame:
    frame = pd.read_excel(workbook(year), sheet_name=f"JOIN_{year}", dtype={"kode_bps": str})
    frame["kode_bps"] = frame["kode_bps"].str.strip()
    frame = frame.set_index("kode_bps").sort_index()
    if not frame.index.is_unique or frame.index.hasnans or not frame["tahun"].eq(year).all():
        raise ValueError(f"Kode BPS atau tahun tidak valid pada JOIN_{year}.")
    frame["wilayah_kota"] = frame["jenis_wilayah"].eq("Kota").astype(int)
    if not np.isfinite(frame[LOCAL_FEATURES]).to_numpy().all():
        raise ValueError(f"Ada fitur wilayah yang kosong atau tidak valid pada {year}.")
    return frame


def main() -> None:
    existing_regions = json.loads(REGIONS_PATH.read_text(encoding="utf-8"))
    centroid_by_code = {r["kodeBps"]: r["centroid"] for r in existing_regions}
    kemendagri_by_code = {r["kodeBps"]: r["kodeKemendagri"] for r in existing_regions}

    frames = {year: load_year(year) for year in YEARS}
    # Prediksi out-of-fold 2023 dari research.ipynb (bobot TRACK-TB pada pengujian 2024)
    oof_2023 = pd.read_csv(OOF_2023_PATH, dtype={"kode_bps": str}, encoding="utf-8-sig").set_index("kode_bps")
    codes = frames[2023].index
    if len(codes) != 154:
        raise ValueError(f"Expected 154 codes, got {len(codes)}")

    missing_centroids = [c for c in codes if c not in centroid_by_code]
    if missing_centroids:
        raise ValueError(f"Centroids missing for BPS codes: {missing_centroids[:10]}")

    # Load GNN_NODES & GNN_EDGES exactly as in research.ipynb
    nodes = pd.read_excel(
        workbook(2023),
        sheet_name="GNN_NODES",
        dtype={"kode_bps": str},
        usecols=["node_id", "kode_bps"],
    )
    nodes["kode_bps"] = nodes["kode_bps"].str.strip()
    edges = pd.read_excel(
        workbook(2023),
        sheet_name="GNN_EDGES",
        dtype={"kode_bps_a": str, "kode_bps_b": str},
        usecols=["src_node_id", "dst_node_id", "kode_bps_a", "kode_bps_b", "panjang_batas_aproksimasi_km"],
    ).rename(columns={"panjang_batas_aproksimasi_km": "batas_km"})
    edges["kode_bps_a"] = edges["kode_bps_a"].str.strip()
    edges["kode_bps_b"] = edges["kode_bps_b"].str.strip()

    directed = pd.concat(
        [
            edges.rename(columns={"kode_bps_a": "wilayah", "kode_bps_b": "tetangga"}),
            edges.rename(columns={"kode_bps_b": "wilayah", "kode_bps_a": "tetangga"}),
        ],
        ignore_index=True,
    )
    ranked = directed.sort_values(["wilayah", "batas_km", "tetangga"], ascending=[True, False, True])
    selected_edges = ranked.groupby("wilayah", sort=False).head(MAX_NEIGHBORS)
    total_neighbors = directed.groupby("wilayah").size().reindex(codes, fill_value=0)
    used_neighbors = selected_edges.groupby("wilayah").size().reindex(codes, fill_value=0)

    slots = selected_edges.assign(
        peringkat=selected_edges.groupby("wilayah", sort=False).cumcount().add(1),
    ).pivot(index="wilayah", columns="peringkat", values="tetangga")
    slots = slots.reindex(index=codes, columns=range(1, MAX_NEIGHBORS + 1))

    border_lookup = {
        (row.wilayah, row.tetangga): float(row.batas_km)
        for row in selected_edges.itertuples(index=False)
    }

    incidence_2023 = frames[2023][INCIDENCE]
    spatial_df = pd.DataFrame(
        {f"kasus_tetangga_{rank}": slots[rank].map(incidence_2023).astype(float) for rank in slots.columns},
        index=codes,
    )
    X_by_year = {year: frames[year][LOCAL_FEATURES].join(spatial_df) for year in YEARS}

    # Exact selected model from research.ipynb
    model = XGBRegressor(
        tree_method="hist",
        n_jobs=1,
        random_state=42,
        base_score=0.5,
        min_child_weight=5,
        learning_rate=0.05,
        reg_lambda=2,
        objective="reg:squarederror",
        max_depth=3,
        n_estimators=110,
    )
    model.fit(X_by_year[2023], frames[2023][TARGET] / 100.0)

    pred_2024 = pd.Series(100.0 * np.asarray(model.predict(X_by_year[2024]), dtype=float), index=codes)
    pred_2025 = pd.Series(100.0 * np.asarray(model.predict(X_by_year[2025]), dtype=float), index=codes)

    contribs = np.asarray(model.get_booster().predict(DMatrix(X_by_year[2025]), pred_contribs=True), dtype=float) * 100.0
    impact = pd.DataFrame(contribs[:, :-1], index=codes, columns=X_by_year[2025].columns)
    base_series = pd.Series(contribs[:, -1], index=codes)

    csv_df = pd.read_csv(CSV_PATH, dtype={"kode_bps": str}).set_index("kode_bps")
    csv_df.index = csv_df.index.str.strip()

    pop_2023 = frames[2023]["penduduk_jiwa"]
    pop_2024 = frames[2024]["penduduk_jiwa"]
    pop_2025 = frames[2025]["penduduk_jiwa"]
    inc_2024_full = frames[2024][INCIDENCE].fillna(incidence_2023 * pop_2024.div(pop_2023))
    inc_2025_proj = incidence_2023 * pop_2025.div(pop_2023)

    # Verify exact match with csv predictions
    max_diff = float((pred_2025.round(2) - csv_df.loc[codes, "tc_percentage_prediksi"]).abs().max())
    print(f"Max pred_2025 vs prediksi_tc_2025.csv diff: {max_diff:.4f}")
    assert max_diff <= 0.02, f"Model predictions diverged from CSV: {max_diff}"

    out_records = []
    for code in codes:
        r23 = frames[2023].loc[code]
        r24 = frames[2024].loc[code]
        r25 = frames[2025].loc[code]
        rcsv = csv_df.loc[code]

        tc24_raw = r24[TARGET]
        tc25_raw = r25[TARGET]
        tc24 = None if pd.isna(tc24_raw) else round(float(tc24_raw), 2)
        tc25 = None if pd.isna(tc25_raw) else round(float(tc25_raw), 2)

        neighbors_out = []
        neighbor_by_col = {}
        for rank in range(1, MAX_NEIGHBORS + 1):
            col = f"kasus_tetangga_{rank}"
            nb_code = slots.at[code, rank]
            if pd.notna(nb_code):
                nb_code = str(nb_code)
                nb_row = frames[2025].loc[nb_code]
                shap_val = round(float(impact.at[code, col]), 4)
                neighbor_by_col[col] = (nb_code, str(nb_row["kabupaten_kota"]))
                neighbors_out.append({
                    "kodeBps": nb_code,
                    "nama": str(nb_row["kabupaten_kota"]),
                    "provinsi": str(nb_row["provinsi"]),
                    "borderKm": round(border_lookup.get((code, nb_code), 0.0), 2),
                    "kasusTetangga": round(float(incidence_2023.at[nb_code]), 2),
                    "centroid": centroid_by_code[nb_code],
                    "shapPp": shap_val,
                })

        shap_items = []
        for col in X_by_year[2025].columns:
            raw_val = X_by_year[2025].at[code, col]
            val = None if pd.isna(raw_val) else round(float(raw_val), 3)
            item = {
                "feature": col,
                "label": FEATURE_LABELS[col],
                "value": val,
                "contributionPp": round(float(impact.at[code, col]), 4),
            }
            if col in neighbor_by_col:
                item["neighborCode"] = neighbor_by_col[col][0]
                item["neighborName"] = neighbor_by_col[col][1]
            shap_items.append(item)

        shap_items.sort(key=lambda x: abs(x["contributionPp"]), reverse=True)

        pred25_val = round(float(pred_2025.at[code]), 4)
        base_val = round(float(base_series.at[code]), 4)
        assert abs((base_val + sum(i["contributionPp"] for i in shap_items)) - pred25_val) < 0.02

        out_records.append({
            "kodeBps": code,
            "kodeKemendagri": kemendagri_by_code[code],
            "provinsiKode": code[:2],
            "provinsi": str(r25["provinsi"]),
            "kabupatenKota": str(r25["kabupaten_kota"]),
            "jenisWilayah": str(r25["jenis_wilayah"]),
            "centroid": centroid_by_code[code],
            "penduduk2023": int(round(float(pop_2023.at[code]))),
            "penduduk2024": int(round(float(pop_2024.at[code]))),
            "penduduk2025": int(round(float(pop_2025.at[code]))),
            "kepadatanJiwaKm2": round(float(r25["kepadatan_jiwa_km2"]), 2),
            "pendudukMiskinPct": round(float(r25["penduduk_miskin_pct"]), 2),
            "rtHunianLayakPct": round(float(r25["rt_hunian_layak_pct"]), 2),
            "puskesmasPer100rb": round(float(r25["puskesmas_per_100rb_penduduk"]), 3),
            "insiden2023": round(float(incidence_2023.at[code]), 2),
            "insiden2024": round(float(inc_2024_full.at[code]), 4),
            "insiden2025Proyeksi": round(float(inc_2025_proj.at[code]), 4),
            "tcAsli2023": round(float(frames[2023].at[code, TARGET]), 4),
            "tcPrediksiOof2023": round(float(oof_2023.at[code, "tc_prediksi_oof_2023_pct"]), 4),
            "tcAsli2024": tc24,
            "tcPrediksi2024": round(float(pred_2024.at[code]), 4),
            "tcAsli2025": tc25,
            "tcPrediksi2025": pred25_val,
            "tcPrediksiXgboost": float(rcsv["tc_percentage_prediksi_xgboost"]),
            "tcPrediksiLightgbm": float(rcsv["tc_percentage_prediksi_lightgbm"]),
            "tcPrediksiCatboost": float(rcsv["tc_percentage_prediksi_catboost"]),
            "sumberTc2025": str(rcsv["sumber_tc_percentage"]),
            "jumlahTetanggaTersedia": int(total_neighbors.at[code]),
            "jumlahTetanggaDipakai": int(used_neighbors.at[code]),
            "neighbors": neighbors_out,
            "shapBasePct": base_val,
            "shapItems": shap_items,
        })

    REGIONS_PATH.write_text(json.dumps(out_records, ensure_ascii=False), encoding="utf-8")

    # Sync official kabupatenKota / provinsi names inside sumatra_kabkota.geojson too
    gj = json.loads(GEOJSON_PATH.read_text(encoding="utf-8"))
    rec_by_code = {r["kodeBps"]: r for r in out_records}
    for feat in gj["features"]:
        c = feat["properties"]["kodeBps"]
        if c in rec_by_code:
            feat["properties"]["kabupatenKota"] = rec_by_code[c]["kabupatenKota"]
            feat["properties"]["provinsi"] = rec_by_code[c]["provinsi"]
            feat["properties"]["jenisWilayah"] = rec_by_code[c]["jenisWilayah"]
    GEOJSON_PATH.write_text(json.dumps(gj, separators=(",", ":"), ensure_ascii=False), encoding="utf-8")

    print(f"Hydrated {len(out_records)} real Sumatra regions into {REGIONS_PATH}")


if __name__ == "__main__":
    main()
