# dataset_utils.py
"""
Modul utilitas dataset untuk validasi & kalibrasi sistem.
Referensi Akademis:
  1. Cohen, S., et al. (1983). A Global Measure of Perceived Stress (PSS-10)
  2. Lovibond, P. F., & Lovibond, S. H. (1995). DASS-21 Validation Study
  3. IEEE Xplore: Fuzzy Logic Approach for Stress Level Detection (2021)
"""
from pathlib import Path

try:
    import pandas as pd
except ModuleNotFoundError:  # pragma: no cover - fallback hanya aktif bila dependency belum terpasang
    pd = None

BASE_DIR = Path(__file__).resolve().parent
DATASET_PATH = BASE_DIR / "stress_dataset.csv"

def load_dataset(path=None):
    if pd is None:
        raise ModuleNotFoundError(
            "Modul 'pandas' belum terpasang. Jalankan 'pip install -r requirements.txt' untuk mengaktifkan validasi dataset."
        )
    p = path or DATASET_PATH
    if not p.exists():
        raise FileNotFoundError(f"Dataset tidak ditemukan di: {p}")
    df = pd.read_csv(p)
    df["jam_tidur"] = pd.to_numeric(df["jam_tidur"], errors="coerce")
    df["jumlah_tugas"] = pd.to_numeric(df["jumlah_tugas"], errors="coerce")
    df["mood"] = pd.to_numeric(df["mood"], errors="coerce")
    df = df.dropna()
    return df

def get_dataset_statistics(df):
    return {
        "total_records": int(len(df)),
        "sleep_mean": round(df["jam_tidur"].mean(), 2),
        "sleep_std": round(df["jam_tidur"].std(), 2),
        "task_mean": round(df["jumlah_tugas"].mean(), 2),
        "mood_mean": round(df["mood"].mean(), 2),
        "stress_distribution": df["stress_label"].value_counts().to_dict(),
    }

def _label_to_score(label):
    mapping = {"rendah": 15, "sedang": 45, "tinggi": 80}
    return mapping.get(str(label).strip().lower(), 50)

def validate_fuzzy_system(df, calculate_stress_func):
    results = []
    for _, row in df.iterrows():
        try:
            pred = calculate_stress_func(
                int(row["jam_tidur"]), 
                int(row["jumlah_tugas"]), 
                int(row["mood"])
            )
            actual = str(row["stress_label"]).strip().lower()
            actual_score = _label_to_score(actual)
            results.append({
                "actual": actual,
                "predicted_label": pred["label"].lower(),
                "predicted_score": pred["score"],
                "score_error": round(abs(pred["score"] - actual_score), 2)
            })
        except Exception:
            continue

    mae = sum(r["score_error"] for r in results) / len(results) if results else 0
    accuracy = sum(1 for r in results if r["predicted_label"] == r["actual"]) / len(results) * 100 if results else 0

    return {
        "mae": round(mae, 2),
        "accuracy_percent": round(accuracy, 2),
        "total_evaluated": len(results),
        "sample_predictions": results[:10]
    }
