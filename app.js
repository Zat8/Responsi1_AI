const semuaGejala = [
    ["G1", "Sulit tidur"],
    ["G2", "Lelah berlebihan"],
    ["G3", "Overthinking"],
    ["G4", "Kehilangan motivasi"],
    ["G5", "Merasa jenuh"],
    ["G6", "Cemas berlebihan"],
    ["G7", "Sulit fokus"],
];

const databaseKondisi = {
    "Stress Ringan": ["G1", "G2", "G3"],
    "Burnout": ["G2", "G3", "G4", "G5"],
    "Anxiety Ringan": ["G1", "G3", "G6", "G7"],
};

const databaseSolusi = {
    "Stress Ringan": "Istirahat cukup, kurangi beban tugas sementara.",
    Burnout: "Ambil jeda dari aktivitas, lakukan hal yang menyenangkan.",
    "Anxiety Ringan": "Latihan pernapasan, journaling, dan kurangi overthinking.",
};

const stressTerms = {
    rendah: [0, 0, 40],
    sedang: [30, 50, 70],
    tinggi: [60, 100, 100],
};

const rules = [
    { if: [["jam_tidur", "sedikit"]], then: "sedang" },
    { if: [["jam_tidur", "cukup"]], then: "sedang" },
    { if: [["jam_tidur", "banyak"]], then: "rendah" },
    { if: [["jumlah_tugas", "sedikit"]], then: "rendah" },
    { if: [["jumlah_tugas", "sedang"]], then: "sedang" },
    { if: [["jumlah_tugas", "banyak"]], then: "tinggi" },
    { if: [["mood", "buruk"]], then: "tinggi" },
    { if: [["mood", "biasa"]], then: "sedang" },
    { if: [["mood", "baik"]], then: "rendah" },
    { if: [["jumlah_tugas", "banyak"], ["jam_tidur", "sedikit"]], then: "tinggi" },
    { if: [["mood", "buruk"], ["jumlah_tugas", "banyak"]], then: "tinggi" },
    { if: [["jam_tidur", "sedikit"], ["mood", "buruk"]], then: "tinggi" },
    { if: [["jam_tidur", "cukup"], ["mood", "baik"]], then: "rendah" },
    { if: [["jam_tidur", "banyak"], ["jumlah_tugas", "sedikit"]], then: "rendah" },
    { if: [["jumlah_tugas", "sedang"], ["mood", "biasa"]], then: "sedang" },
];

const membershipConfig = {
    jam_tidur: {
        sedikit: [0, 0, 5],
        cukup: [4, 6, 8],
        banyak: [7, 12, 12],
    },
    jumlah_tugas: {
        sedikit: [0, 0, 3],
        sedang: [2, 5, 8],
        banyak: [7, 10, 10],
    },
    mood: {
        buruk: [0, 0, 4],
        biasa: [3, 5, 7],
        baik: [6, 10, 10],
    },
};

function clamp(value, min, max) {
    const numeric = Number.parseInt(value, 10);
    const safeValue = Number.isNaN(numeric) ? min : numeric;
    return Math.max(min, Math.min(max, safeValue));
}

function trimf(x, [a, b, c]) {
    if (a === b && x <= b) {
        return c === b ? 1 : (c - x) / (c - b);
    }
    if (b === c && x >= b) {
        return a === b ? 1 : (x - a) / (b - a);
    }
    if (x <= a || x >= c) {
        return 0;
    }
    if (x === b) {
        return 1;
    }
    if (x < b) {
        return (x - a) / (b - a);
    }
    return (c - x) / (c - b);
}

function fuzzify(inputs) {
    return Object.fromEntries(
        Object.entries(membershipConfig).map(([variable, terms]) => {
            const variableValue = inputs[variable];
            const memberships = Object.fromEntries(
                Object.entries(terms).map(([label, points]) => [label, trimf(variableValue, points)])
            );
            return [variable, memberships];
        })
    );
}

function centroid(values) {
    let numerator = 0;
    let denominator = 0;

    for (let x = 0; x <= 100; x += 1) {
        const mu = values[x] || 0;
        numerator += x * mu;
        denominator += mu;
    }

    return denominator === 0 ? 0 : numerator / denominator;
}

function calculateStress(jamTidur, jumlahTugas, mood) {
    const inputs = {
        jam_tidur: clamp(jamTidur, 0, 12),
        jumlah_tugas: clamp(jumlahTugas, 0, 10),
        mood: clamp(mood, 0, 10),
    };

    const fuzzified = fuzzify(inputs);
    const aggregated = new Array(101).fill(0);

    for (const rule of rules) {
        const firingStrength = Math.min(
            ...rule.if.map(([variable, label]) => fuzzified[variable][label])
        );

        if (firingStrength <= 0) {
            continue;
        }

        for (let x = 0; x <= 100; x += 1) {
            const consequentMembership = trimf(x, stressTerms[rule.then]);
            aggregated[x] = Math.max(aggregated[x], Math.min(firingStrength, consequentMembership));
        }
    }

    const score = Number(centroid(aggregated).toFixed(2));

    if (score >= 60) {
        return {
            score,
            label: "Tinggi",
            saran: "Perlu istirahat, evaluasi prioritas, dan manajemen waktu yang lebih baik.",
            color: "high",
            input: inputs,
        };
    }

    if (score >= 30) {
        return {
            score,
            label: "Sedang",
            saran: "Coba atur jadwal, kurangi overthinking, dan sisihkan waktu pemulihan.",
            color: "medium",
            input: inputs,
        };
    }

    return {
        score,
        label: "Rendah",
        saran: "Kondisi cukup stabil, pertahankan pola hidup sehat dan ritme belajar yang seimbang.",
        color: "low",
        input: inputs,
    };
}

function diagnoseMentalHealth(gejalaSelected) {
    if (!gejalaSelected.length) {
        return {
            diagnosa_utama: null,
            semua_hasil: [],
            gejala_dipilih: [],
            pesan: "Silakan pilih minimal satu gejala untuk mendapatkan diagnosa.",
        };
    }

    const semuaHasil = Object.entries(databaseKondisi)
        .map(([kondisi, gejala]) => {
            const cocok = gejala.filter((item) => gejalaSelected.includes(item)).length;
            const confidence = gejala.length ? (cocok / gejala.length) * 100 : 0;

            return {
                kondisi,
                confidence: Number(confidence.toFixed(2)),
                solusi: databaseSolusi[kondisi] || "-",
                gejala_cocok: cocok,
                total_gejala: gejala.length,
            };
        })
        .sort((a, b) => b.confidence - a.confidence);

    return {
        diagnosa_utama: semuaHasil[0] || null,
        semua_hasil: semuaHasil,
        gejala_dipilih: gejalaSelected,
    };
}

function labelToScore(label) {
    const mapping = {
        rendah: 15,
        sedang: 45,
        tinggi: 80,
    };

    return mapping[String(label).trim().toLowerCase()] ?? 50;
}

function parseCsvLine(line) {
    const cells = [];
    let current = "";
    let inQuotes = false;

    for (let i = 0; i < line.length; i += 1) {
        const char = line[i];

        if (char === '"') {
            inQuotes = !inQuotes;
            continue;
        }

        if (char === "," && !inQuotes) {
            cells.push(current);
            current = "";
            continue;
        }

        current += char;
    }

    cells.push(current);
    return cells;
}

function parseCsv(text) {
    const lines = text.trim().split(/\r?\n/);
    const headers = parseCsvLine(lines[0]);

    return lines.slice(1).map((line) => {
        const values = parseCsvLine(line);
        return Object.fromEntries(headers.map((header, index) => [header, values[index] ?? ""]));
    });
}

function getDatasetStatistics(rows) {
    const sleepValues = rows.map((row) => Number(row.jam_tidur));
    const taskValues = rows.map((row) => Number(row.jumlah_tugas));
    const moodValues = rows.map((row) => Number(row.mood));
    const distribution = rows.reduce((acc, row) => {
        const key = row.stress_label;
        acc[key] = (acc[key] || 0) + 1;
        return acc;
    }, {});

    const mean = (values) => values.reduce((sum, value) => sum + value, 0) / values.length;
    const std = (values) => {
        const avg = mean(values);
        const variance = values.reduce((sum, value) => sum + (value - avg) ** 2, 0) / (values.length - 1 || 1);
        return Math.sqrt(variance);
    };

    return {
        total_records: rows.length,
        sleep_mean: mean(sleepValues).toFixed(2),
        sleep_std: std(sleepValues).toFixed(2),
        task_mean: mean(taskValues).toFixed(2),
        mood_mean: mean(moodValues).toFixed(2),
        stress_distribution: distribution,
    };
}

function validateFuzzySystem(rows) {
    const results = rows.map((row) => {
        const pred = calculateStress(row.jam_tidur, row.jumlah_tugas, row.mood);
        const actual = String(row.stress_label).trim().toLowerCase();
        const actualScore = labelToScore(actual);

        return {
            actual,
            predicted_label: pred.label.toLowerCase(),
            predicted_score: pred.score,
            score_error: Number(Math.abs(pred.score - actualScore).toFixed(2)),
        };
    });

    const mae = results.reduce((sum, item) => sum + item.score_error, 0) / (results.length || 1);
    const accuracy = (results.filter((item) => item.actual === item.predicted_label).length / (results.length || 1)) * 100;

    return {
        mae: Number(mae.toFixed(2)),
        accuracy_percent: Number(accuracy.toFixed(2)),
        total_evaluated: results.length,
        sample_predictions: results.slice(0, 10),
    };
}

function renderFuzzyResult(result) {
    const fuzzyResult = document.getElementById("fuzzy-result");
    const fuzzyEmpty = document.getElementById("fuzzy-empty");

    fuzzyEmpty.classList.add("hidden");
    fuzzyResult.classList.remove("hidden");
    fuzzyResult.innerHTML = `
        <div class="result-panel result-${result.color}">
            <div class="result-head">
                <div>
                    <div class="mini-note">Kategori</div>
                    <h3>${result.label}</h3>
                </div>
                <div>
                    <div class="mini-note">Skor fuzzy</div>
                    <div class="result-score">${result.score}</div>
                </div>
            </div>
        </div>
        <div class="progress-track">
            <div class="progress-fill fill-${result.color}" style="width:${result.score}%"></div>
        </div>
        <div class="pill-row">
            <span class="metric-pill">Tidur ${result.input.jam_tidur} jam</span>
            <span class="metric-pill">Tugas ${result.input.jumlah_tugas}</span>
            <span class="metric-pill">Mood ${result.input.mood}/10</span>
        </div>
        <div class="info-box">
            <strong>Saran:</strong> ${result.saran}
        </div>
    `;
}

function renderExpertOptions() {
    const gejalaList = document.getElementById("gejala-list");
    gejalaList.innerHTML = semuaGejala
        .map(
            ([kode, label]) => `
                <label class="symptom-card">
                    <input type="checkbox" name="gejala" value="${kode}">
                    <span>
                        <strong>${kode}</strong>
                        <span class="mini-note">${label}</span>
                    </span>
                </label>
            `
        )
        .join("");
}

function renderExpertResult(result) {
    const expertResult = document.getElementById("expert-result");
    const expertEmpty = document.getElementById("expert-empty");

    expertEmpty.classList.add("hidden");
    expertResult.classList.remove("hidden");

    if (result.pesan) {
        expertResult.innerHTML = `<div class="empty-state">${result.pesan}</div>`;
        return;
    }

    const selectedLabels = semuaGejala
        .filter(([kode]) => result.gejala_dipilih.includes(kode))
        .map(([, label]) => label);

    const colorClass = result.diagnosa_utama.confidence >= 60
        ? "high"
        : result.diagnosa_utama.confidence >= 30
            ? "medium"
            : "low";

    expertResult.innerHTML = `
        <div class="result-panel result-${colorClass}">
            <div class="mini-note">Kondisi paling mungkin</div>
            <h3>${result.diagnosa_utama.kondisi}</h3>
            <div class="pill-row">
                <span class="metric-pill">Confidence ${result.diagnosa_utama.confidence}%</span>
                <span class="metric-pill">${result.diagnosa_utama.gejala_cocok}/${result.diagnosa_utama.total_gejala} gejala cocok</span>
            </div>
        </div>
        <div class="selected-tags">
            ${selectedLabels.map((label) => `<span class="tag-pill">${label}</span>`).join("")}
        </div>
        <div class="info-box">
            <strong>Saran:</strong> ${result.diagnosa_utama.solusi}
        </div>
        <div class="table-wrap">
            <table class="rank-table">
                <thead>
                    <tr>
                        <th>Kondisi</th>
                        <th>Kecocokan</th>
                        <th>Confidence</th>
                    </tr>
                </thead>
                <tbody>
                    ${result.semua_hasil.map((item) => `
                        <tr>
                            <td>${item.kondisi}</td>
                            <td>${item.gejala_cocok}/${item.total_gejala}</td>
                            <td>${item.confidence}%</td>
                        </tr>
                    `).join("")}
                </tbody>
            </table>
        </div>
    `;
}

function renderDatasetMetrics(stats, validation) {
    const metrics = document.getElementById("dataset-metrics");
    metrics.innerHTML = `
        <div class="metric-card">
            <span class="mini-note">Total record</span>
            <strong>${stats.total_records}</strong>
        </div>
        <div class="metric-card">
            <span class="mini-note">Rata-rata tidur</span>
            <strong>${stats.sleep_mean} jam</strong>
        </div>
        <div class="metric-card">
            <span class="mini-note">Rata-rata tugas</span>
            <strong>${stats.task_mean}</strong>
        </div>
        <div class="metric-card">
            <span class="mini-note">Rata-rata mood</span>
            <strong>${stats.mood_mean}</strong>
        </div>
        <div class="metric-card">
            <span class="mini-note">Akurasi label</span>
            <strong>${validation.accuracy_percent}%</strong>
        </div>
        <div class="metric-card">
            <span class="mini-note">MAE skor</span>
            <strong>${validation.mae}</strong>
        </div>
    `;
}

function renderDatasetTable(rows) {
    const tableWrap = document.getElementById("dataset-table-wrap");
    const tableBody = document.getElementById("dataset-table-body");

    tableWrap.classList.remove("hidden");
    tableBody.innerHTML = rows
        .map((row) => `
            <tr>
                <td>${row.actual}</td>
                <td>${row.predicted_label}</td>
                <td>${row.predicted_score}</td>
                <td>${row.score_error}</td>
            </tr>
        `)
        .join("");
}

async function loadDataset() {
    const status = document.getElementById("dataset-status");
    status.textContent = "Memuat dataset...";

    try {
        const response = await fetch("./data/stress_dataset.csv");
        if (!response.ok) {
            throw new Error(`HTTP ${response.status}`);
        }

        const csvText = await response.text();
        const rows = parseCsv(csvText).map((row) => ({
            ...row,
            jam_tidur: Number(row.jam_tidur),
            jumlah_tugas: Number(row.jumlah_tugas),
            mood: Number(row.mood),
        }));

        const stats = getDatasetStatistics(rows);
        const validation = validateFuzzySystem(rows);

        renderDatasetMetrics(stats, validation);
        renderDatasetTable(validation.sample_predictions);
        status.textContent = `Dataset berhasil dimuat. Distribusi label: ${Object.entries(stats.stress_distribution).map(([key, value]) => `${key} ${value}`).join(", ")}.`;
    } catch (error) {
        status.textContent = `Gagal memuat dataset: ${error.message}`;
    }
}

function syncRangeOutput(inputId, suffix) {
    const input = document.getElementById(inputId);
    const output = document.getElementById(`${inputId}_output`);

    const render = () => {
        output.value = `${input.value}${suffix}`;
        output.textContent = `${input.value}${suffix}`;
    };

    input.addEventListener("input", render);
    render();
}

function initFuzzyPage() {
    syncRangeOutput("jam_tidur", " jam");
    syncRangeOutput("jumlah_tugas", " tugas");
    syncRangeOutput("mood", "/10");

    document.getElementById("fuzzy-form").addEventListener("submit", (event) => {
        event.preventDefault();
        const result = calculateStress(
            document.getElementById("jam_tidur").value,
            document.getElementById("jumlah_tugas").value,
            document.getElementById("mood").value
        );
        renderFuzzyResult(result);
    });
}

function initExpertPage() {
    renderExpertOptions();

    document.getElementById("expert-form").addEventListener("submit", (event) => {
        event.preventDefault();
        const selected = Array.from(document.querySelectorAll('input[name="gejala"]:checked')).map((item) => item.value);
        const result = diagnoseMentalHealth(selected);
        renderExpertResult(result);
    });
}

function initDatasetPage() {
    document.getElementById("reload-dataset").addEventListener("click", loadDataset);
    loadDataset();
}

function initPage() {
    const page = document.body.dataset.page;

    if (page === "fuzzy") {
        initFuzzyPage();
        return;
    }

    if (page === "expert") {
        initExpertPage();
        return;
    }

    if (page === "dataset") {
        initDatasetPage();
    }
}

initPage();
