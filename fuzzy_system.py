"""
Implementasi Logika Fuzzy (Mamdani) untuk estimasi tingkat stress.
Referensi: Zadeh, L. A. (1965). Fuzzy sets. Information and Control.
"""
import os
from pathlib import Path

BASE_DIR = Path(__file__).resolve().parent
MPL_DIR = BASE_DIR / ".matplotlib"
MPL_DIR.mkdir(exist_ok=True)
os.environ.setdefault("MPLCONFIGDIR", str(MPL_DIR))

import numpy as np
import skfuzzy as fuzz
from skfuzzy import control as ctrl

SLEEP_RANGE = (0, 12)
TASK_RANGE = (0, 10)
MOOD_RANGE = (0, 10)


def _clamp(value, min_value, max_value):
    return max(min_value, min(max_value, int(value)))


def _build_stress_system():
    jam_tidur = ctrl.Antecedent(np.arange(0, 13, 1), "jam_tidur")
    jumlah_tugas = ctrl.Antecedent(np.arange(0, 11, 1), "jumlah_tugas")
    mood = ctrl.Antecedent(np.arange(0, 11, 1), "mood")
    tingkat_stress = ctrl.Consequent(np.arange(0, 101, 1), "tingkat_stress")

    jam_tidur["sedikit"] = fuzz.trimf(jam_tidur.universe, [0, 0, 5])
    jam_tidur["cukup"] = fuzz.trimf(jam_tidur.universe, [4, 6, 8])
    jam_tidur["banyak"] = fuzz.trimf(jam_tidur.universe, [7, 12, 12])

    jumlah_tugas["sedikit"] = fuzz.trimf(jumlah_tugas.universe, [0, 0, 3])
    jumlah_tugas["sedang"] = fuzz.trimf(jumlah_tugas.universe, [2, 5, 8])
    jumlah_tugas["banyak"] = fuzz.trimf(jumlah_tugas.universe, [7, 10, 10])

    mood["buruk"] = fuzz.trimf(mood.universe, [0, 0, 4])
    mood["biasa"] = fuzz.trimf(mood.universe, [3, 5, 7])
    mood["baik"] = fuzz.trimf(mood.universe, [6, 10, 10])

    tingkat_stress["rendah"] = fuzz.trimf(tingkat_stress.universe, [0, 0, 40])
    tingkat_stress["sedang"] = fuzz.trimf(tingkat_stress.universe, [30, 50, 70])
    tingkat_stress["tinggi"] = fuzz.trimf(tingkat_stress.universe, [60, 100, 100])

    # Rule dasar agar setiap term selalu terhubung dan simulasi tidak kosong.
    rules = [
        ctrl.Rule(jam_tidur["sedikit"], tingkat_stress["sedang"]),
        ctrl.Rule(jam_tidur["cukup"], tingkat_stress["sedang"]),
        ctrl.Rule(jam_tidur["banyak"], tingkat_stress["rendah"]),
        ctrl.Rule(jumlah_tugas["sedikit"], tingkat_stress["rendah"]),
        ctrl.Rule(jumlah_tugas["sedang"], tingkat_stress["sedang"]),
        ctrl.Rule(jumlah_tugas["banyak"], tingkat_stress["tinggi"]),
        ctrl.Rule(mood["buruk"], tingkat_stress["tinggi"]),
        ctrl.Rule(mood["biasa"], tingkat_stress["sedang"]),
        ctrl.Rule(mood["baik"], tingkat_stress["rendah"]),
        # Rule kombinasi untuk mempertajam keputusan.
        ctrl.Rule(jumlah_tugas["banyak"] & jam_tidur["sedikit"], tingkat_stress["tinggi"]),
        ctrl.Rule(mood["buruk"] & jumlah_tugas["banyak"], tingkat_stress["tinggi"]),
        ctrl.Rule(jam_tidur["sedikit"] & mood["buruk"], tingkat_stress["tinggi"]),
        ctrl.Rule(jam_tidur["cukup"] & mood["baik"], tingkat_stress["rendah"]),
        ctrl.Rule(jam_tidur["banyak"] & jumlah_tugas["sedikit"], tingkat_stress["rendah"]),
        ctrl.Rule(jumlah_tugas["sedang"] & mood["biasa"], tingkat_stress["sedang"]),
    ]

    return ctrl.ControlSystem(rules)


STRESS_SYSTEM = _build_stress_system()


def calculate_stress(jam_tidur, jumlah_tugas, mood):
    jam_tidur = _clamp(jam_tidur, *SLEEP_RANGE)
    jumlah_tugas = _clamp(jumlah_tugas, *TASK_RANGE)
    mood = _clamp(mood, *MOOD_RANGE)

    sim = ctrl.ControlSystemSimulation(STRESS_SYSTEM)
    sim.input["jam_tidur"] = jam_tidur
    sim.input["jumlah_tugas"] = jumlah_tugas
    sim.input["mood"] = mood
    sim.compute()

    skor = float(sim.output["tingkat_stress"])

    if skor >= 60:
        label = "Tinggi"
        saran = "Perlu istirahat, evaluasi prioritas, dan manajemen waktu yang lebih baik."
        warna = "danger"
    elif skor >= 30:
        label = "Sedang"
        saran = "Coba atur jadwal, kurangi overthinking, dan sisihkan waktu pemulihan."
        warna = "warning"
    else:
        label = "Rendah"
        saran = "Kondisi cukup stabil, pertahankan pola hidup sehat dan ritme belajar yang seimbang."
        warna = "success"

    return {
        "score": round(skor, 2),
        "label": label,
        "saran": saran,
        "color": warna,
        "input": {
            "jam_tidur": jam_tidur,
            "jumlah_tugas": jumlah_tugas,
            "mood": mood,
        },
    }
