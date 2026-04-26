# app.py
import os
from pathlib import Path

from flask import Flask, jsonify, render_template, request

BASE_DIR = Path(__file__).resolve().parent
MPL_DIR = BASE_DIR / ".matplotlib"
MPL_DIR.mkdir(exist_ok=True)
os.environ.setdefault("MPLCONFIGDIR", str(MPL_DIR))

from dataset_utils import get_dataset_statistics, load_dataset, validate_fuzzy_system
from expert_system import SEMUA_GEJALA, diagnose_mental_health
from fuzzy_system import calculate_stress

app = Flask(__name__)
app.config["SECRET_KEY"] = "mental-health-2026"


def _parse_bounded_int(raw_value, default, min_value, max_value):
    try:
        value = int(raw_value)
    except (TypeError, ValueError):
        value = default
    return max(min_value, min(max_value, value))


@app.route("/")
def index():
    return render_template("index.html")


@app.route("/fuzzy", methods=["GET", "POST"])
def fuzzy_page():
    input_data = {
        "jam_tidur": 6,
        "jumlah_tugas": 5,
        "mood": 5,
    }
    result = None
    error_message = None

    if request.method == "POST":
        input_data = {
            "jam_tidur": _parse_bounded_int(request.form.get("jam_tidur"), 6, 0, 12),
            "jumlah_tugas": _parse_bounded_int(request.form.get("jumlah_tugas"), 5, 0, 10),
            "mood": _parse_bounded_int(request.form.get("mood"), 5, 0, 10),
        }

        try:
            result = calculate_stress(
                input_data["jam_tidur"],
                input_data["jumlah_tugas"],
                input_data["mood"],
            )
        except Exception as exc:  # pragma: no cover - guard untuk runtime web
            error_message = f"Perhitungan fuzzy gagal: {exc}"

    return render_template(
        "fuzzy.html",
        result=result,
        input_data=input_data,
        error_message=error_message,
    )


@app.route("/expert", methods=["GET", "POST"])
def expert_page():
    if request.method == "POST":
        gejala_selected = request.form.getlist("gejala")
        result = diagnose_mental_health(gejala_selected)
        selected_labels = [label for kode, label in SEMUA_GEJALA if kode in gejala_selected]

        return render_template(
            "expert.html",
            result=result,
            semua_gejala=SEMUA_GEJALA,
            selected=gejala_selected,
            selected_labels=selected_labels,
        )

    return render_template(
        "expert.html",
        result=None,
        semua_gejala=SEMUA_GEJALA,
        selected=[],
        selected_labels=[],
    )


@app.route("/api/fuzzy", methods=["POST"])
def api_fuzzy():
    data = request.get_json(silent=True) or {}
    try:
        result = calculate_stress(
            _parse_bounded_int(data.get("jam_tidur"), 6, 0, 12),
            _parse_bounded_int(data.get("jumlah_tugas"), 5, 0, 10),
            _parse_bounded_int(data.get("mood"), 5, 0, 10),
        )
        return jsonify({"status": "success", "data": result})
    except Exception as exc:
        return jsonify({"status": "error", "message": str(exc)}), 400


@app.route("/api/expert", methods=["POST"])
def api_expert():
    data = request.get_json(silent=True) or {}
    try:
        result = diagnose_mental_health(data.get("gejala", []))
        return jsonify({"status": "success", "data": result})
    except Exception as exc:
        return jsonify({"status": "error", "message": str(exc)}), 400


@app.route("/api/validate", methods=["GET"])
def api_validate():
    try:
        df = load_dataset()
        stats = get_dataset_statistics(df)
        fuzzy_val = validate_fuzzy_system(df, calculate_stress)
        return jsonify(
            {
                "status": "success",
                "dataset": stats,
                "validation": fuzzy_val,
            }
        )
    except Exception as exc:
        return jsonify({"status": "error", "message": str(exc)}), 400


if __name__ == "__main__":
    app.run(debug=True, port=5000)
