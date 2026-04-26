# expert_system.py
"""
Sistem Pakar Berbasis Rule Matching untuk diagnosis kondisi mental.
Referensi: Buchanan, B. G., & Shortliffe, E. H. (1984). Rule-Based Expert Systems.
"""
DATABASE_KONDISI = {
    "Stress Ringan": ["G1", "G2", "G3"],
    "Burnout": ["G2", "G3", "G4", "G5"],
    "Anxiety Ringan": ["G1", "G3", "G6", "G7"],
}

DATABASE_SOLUSI = {
    "Stress Ringan": "Istirahat cukup, kurangi beban tugas sementara.",
    "Burnout": "Ambil jeda dari aktivitas, lakukan hal yang menyenangkan.",
    "Anxiety Ringan": "Latihan pernapasan, journaling, dan kurangi overthinking.",
}

SEMUA_GEJALA = [
    ("G1", "Sulit tidur"),
    ("G2", "Lelah berlebihan"),
    ("G3", "Overthinking"),
    ("G4", "Kehilangan motivasi"),
    ("G5", "Merasa jenuh"),
    ("G6", "Cemas berlebihan"),
    ("G7", "Sulit fokus"),
]

def diagnose_mental_health(gejala_selected):
    if not gejala_selected:
        return {
            "diagnosa_utama": None,
            "semua_hasil": [],
            "gejala_dipilih": [],
            "pesan": "Silakan pilih minimal satu gejala untuk mendapatkan diagnosa."
        }

    hasil = {}

    for kondisi, gejala in DATABASE_KONDISI.items():
        cocok = sum(1 for item in gejala if item in gejala_selected)
        persen = (cocok / len(gejala)) * 100 if len(gejala) > 0 else 0

        hasil[kondisi] = {
            "kondisi": kondisi,
            "confidence": round(persen, 2),
            "solusi": DATABASE_SOLUSI.get(kondisi, "-"),
            "gejala_cocok": cocok,
            "total_gejala": len(gejala),
        }

    semua_hasil = sorted(hasil.values(), key=lambda x: x["confidence"], reverse=True)
    terbaik = semua_hasil[0] if semua_hasil else None

    return {
        "diagnosa_utama": terbaik,
        "semua_hasil": semua_hasil,
        "gejala_dipilih": gejala_selected,
    }