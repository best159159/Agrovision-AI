from __future__ import annotations

import json
import math
import os
import secrets
import sqlite3
import uuid
from collections import Counter, defaultdict
from datetime import datetime, timedelta, timezone
from pathlib import Path
from typing import Any

from fastapi import APIRouter, Depends, Header, HTTPException, Response
from pydantic import BaseModel, Field


BASE_DIR = Path(__file__).resolve().parent
DB_PATH = Path(os.getenv("AGROVISION_DB_PATH", BASE_DIR / "agrovision.db"))
STORE_FEEDBACK_IMAGES = os.getenv("STORE_FEEDBACK_IMAGES", "false").strip().lower() in {"1", "true", "yes", "on"}
ADMIN_TOKEN = os.getenv("AGROVISION_ADMIN_TOKEN", "")

router = APIRouter(prefix="/intelligence", tags=["agricultural-intelligence"])


def require_admin(x_admin_token: str | None = Header(default=None)) -> None:
    if not ADMIN_TOKEN:
        raise HTTPException(status_code=503, detail="Research data export is disabled until AGROVISION_ADMIN_TOKEN is configured.")
    if not x_admin_token or not secrets.compare_digest(x_admin_token, ADMIN_TOKEN):
        raise HTTPException(status_code=403, detail="Valid research administrator token required.")


SEVERITY_WEIGHT = {
    "Low": 15,
    "Moderate": 35,
    "Medium": 35,
    "High": 65,
    "Critical": 90,
}

RISK_LEVELS = (
    (85, "Critical"),
    (65, "High"),
    (40, "Medium"),
    (0, "Low"),
)

DISEASE_PROFILES: dict[str, dict[str, Any]] = {
    "rice blast": {"weather": "humid", "base_radius_km": 1.8, "cycle_days": 5, "spread_rate": 1.25},
    "bacterial leaf blight": {"weather": "wet", "base_radius_km": 1.2, "cycle_days": 7, "spread_rate": 1.05},
    "powdery mildew": {"weather": "humid_warm", "base_radius_km": 1.0, "cycle_days": 6, "spread_rate": 1.0},
    "downy mildew": {"weather": "cool_wet", "base_radius_km": 1.4, "cycle_days": 4, "spread_rate": 1.3},
    "rust": {"weather": "humid_warm", "base_radius_km": 2.5, "cycle_days": 7, "spread_rate": 1.35},
    "leaf rust": {"weather": "humid_warm", "base_radius_km": 2.5, "cycle_days": 7, "spread_rate": 1.35},
    "late blight": {"weather": "cool_wet", "base_radius_km": 3.0, "cycle_days": 3, "spread_rate": 1.7},
    "anthracnose": {"weather": "wet", "base_radius_km": 1.1, "cycle_days": 6, "spread_rate": 1.05},
    "fusarium": {"weather": "warm_wet", "base_radius_km": 0.5, "cycle_days": 14, "spread_rate": 0.5},
    "panama disease": {"weather": "warm_wet", "base_radius_km": 0.4, "cycle_days": 21, "spread_rate": 0.35},
    "default": {"weather": "humid", "base_radius_km": 1.0, "cycle_days": 7, "spread_rate": 1.0},
}


class FarmIn(BaseModel):
    name: str = Field(min_length=1, max_length=120)
    owner: str | None = Field(default=None, max_length=120)
    region: str | None = Field(default=None, max_length=120)


class FieldIn(BaseModel):
    farm_id: str
    name: str = Field(min_length=1, max_length=120)
    crop: str = Field(min_length=1, max_length=80)
    area_hectares: float = Field(default=1, ge=0)
    lat: float = Field(ge=-90, le=90)
    lng: float = Field(ge=-180, le=180)
    boundary: list[dict[str, float]] | None = None


class WeatherIn(BaseModel):
    temperature: float = 25
    humidity: float = 65
    precipitation: float = 0
    windspeed: float = 8
    winddirection: float = 0  # degrees 0–360, 0 = North


class FieldReportIn(BaseModel):
    field_id: str | None = None
    disease: str = Field(min_length=1, max_length=120)
    crop: str = Field(min_length=1, max_length=80)
    severity: str = "Moderate"
    affected_area: float = Field(default=0, ge=0, le=100)
    lat: float = Field(ge=-90, le=90)
    lng: float = Field(ge=-180, le=180)
    notes: str | None = Field(default=None, max_length=1000)
    source: str = "manual"
    weather: WeatherIn | None = None
    observed_at: str | None = None


class ScanRecordIn(BaseModel):
    field_id: str | None = None
    disease: str | None = None
    media_type: str = "image"
    severity: str = "Low"
    confidence: float = Field(default=0, ge=0, le=1)
    affected_area: float = Field(default=0, ge=0, le=100)
    result: dict[str, Any] | None = None
    scanned_at: str | None = None


class ScanFeedbackIn(BaseModel):
    analysis_id: str = Field(min_length=1, max_length=120)
    prediction_index: int = Field(default=0, ge=0)
    original_disease: str = Field(min_length=1, max_length=160)
    confirmed: bool = True
    corrected_disease: str | None = Field(default=None, max_length=160)
    crop: str | None = Field(default=None, max_length=80)
    confidence: float = Field(default=0, ge=0, le=1)
    severity: str = "Moderate"
    source_model: str | None = Field(default=None, max_length=160)
    image_data: str | None = None
    notes: str | None = Field(default=None, max_length=1200)


class RiskRequest(BaseModel):
    disease: str
    severity: str = "Moderate"
    crop: str | None = None
    affected_area: float = Field(default=0, ge=0, le=100)
    lat: float = Field(ge=-90, le=90)
    lng: float = Field(ge=-180, le=180)
    field_id: str | None = None
    weather: WeatherIn | None = None


def now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


def parse_dt(value: str | None) -> datetime:
    if not value:
        return datetime.now(timezone.utc)
    try:
        parsed = datetime.fromisoformat(value.replace("Z", "+00:00"))
        return parsed if parsed.tzinfo else parsed.replace(tzinfo=timezone.utc)
    except ValueError:
        return datetime.now(timezone.utc)


def db() -> sqlite3.Connection:
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    conn.execute("PRAGMA foreign_keys = ON")
    return conn


def init_db() -> None:
    DB_PATH.parent.mkdir(parents=True, exist_ok=True)
    with db() as conn:
        conn.executescript(
            """
            CREATE TABLE IF NOT EXISTS farms (
              id TEXT PRIMARY KEY,
              name TEXT NOT NULL,
              owner TEXT,
              region TEXT,
              created_at TEXT NOT NULL
            );

            CREATE TABLE IF NOT EXISTS fields (
              id TEXT PRIMARY KEY,
              farm_id TEXT NOT NULL,
              name TEXT NOT NULL,
              crop TEXT NOT NULL,
              area_hectares REAL NOT NULL DEFAULT 0,
              lat REAL NOT NULL,
              lng REAL NOT NULL,
              boundary_json TEXT,
              created_at TEXT NOT NULL,
              FOREIGN KEY (farm_id) REFERENCES farms(id) ON DELETE CASCADE
            );

            CREATE TABLE IF NOT EXISTS field_reports (
              id TEXT PRIMARY KEY,
              field_id TEXT,
              disease TEXT NOT NULL,
              crop TEXT NOT NULL,
              severity TEXT NOT NULL,
              affected_area REAL NOT NULL DEFAULT 0,
              lat REAL NOT NULL,
              lng REAL NOT NULL,
              notes TEXT,
              source TEXT NOT NULL,
              weather_json TEXT,
              observed_at TEXT NOT NULL,
              created_at TEXT NOT NULL,
              FOREIGN KEY (field_id) REFERENCES fields(id) ON DELETE SET NULL
            );

            CREATE TABLE IF NOT EXISTS scan_records (
              id TEXT PRIMARY KEY,
              field_id TEXT,
              disease TEXT,
              media_type TEXT NOT NULL,
              severity TEXT NOT NULL,
              confidence REAL NOT NULL DEFAULT 0,
              affected_area REAL NOT NULL DEFAULT 0,
              result_json TEXT,
              scanned_at TEXT NOT NULL,
              created_at TEXT NOT NULL,
              FOREIGN KEY (field_id) REFERENCES fields(id) ON DELETE SET NULL
            );

            CREATE TABLE IF NOT EXISTS scan_feedback (
              id TEXT PRIMARY KEY,
              analysis_id TEXT NOT NULL,
              prediction_index INTEGER NOT NULL DEFAULT 0,
              original_disease TEXT NOT NULL,
              confirmed INTEGER NOT NULL DEFAULT 1,
              corrected_disease TEXT,
              crop TEXT,
              confidence REAL NOT NULL DEFAULT 0,
              severity TEXT NOT NULL,
              source_model TEXT,
              image_data TEXT,
              notes TEXT,
              created_at TEXT NOT NULL
            );

            CREATE INDEX IF NOT EXISTS idx_reports_geo ON field_reports(lat, lng);
            CREATE INDEX IF NOT EXISTS idx_reports_disease_time ON field_reports(disease, observed_at);
            CREATE INDEX IF NOT EXISTS idx_scans_field_time ON scan_records(field_id, scanned_at);
            CREATE INDEX IF NOT EXISTS idx_feedback_analysis ON scan_feedback(analysis_id, created_at);
            """
        )


def row_to_dict(row: sqlite3.Row) -> dict[str, Any]:
    item = dict(row)
    for source, target in (("boundary_json", "boundary"), ("weather_json", "weather"), ("result_json", "result")):
        if source in item:
            raw = item.pop(source)
            item[target] = json.loads(raw) if raw else None
    return item


def disease_profile(disease: str) -> dict[str, Any]:
    key = disease.lower().strip()
    for name, profile in DISEASE_PROFILES.items():
        if name in key or key in name:
            return profile
    return DISEASE_PROFILES["default"]


def risk_level(score: float) -> str:
    for threshold, label in RISK_LEVELS:
        if score >= threshold:
            return label
    return "Low"


def haversine_km(lat1: float, lng1: float, lat2: float, lng2: float) -> float:
    radius = 6371.0
    p1, p2 = math.radians(lat1), math.radians(lat2)
    dlat = math.radians(lat2 - lat1)
    dlng = math.radians(lng2 - lng1)
    a = math.sin(dlat / 2) ** 2 + math.cos(p1) * math.cos(p2) * math.sin(dlng / 2) ** 2
    return 2 * radius * math.atan2(math.sqrt(a), math.sqrt(1 - a))


def weather_score(weather: WeatherIn | None, disease: str) -> tuple[float, list[str]]:
    if not weather:
        return 20, ["No current weather supplied; using conservative baseline."]
    profile = disease_profile(disease)
    temp = weather.temperature
    humidity = weather.humidity
    rain = weather.precipitation
    wind = weather.windspeed
    score = 0.0
    reasons: list[str] = []

    if humidity >= 85:
        score += 28
        reasons.append("Very high humidity supports spore survival and infection.")
    elif humidity >= 70:
        score += 18
        reasons.append("Humidity is high enough for many foliar diseases.")

    if rain >= 8:
        score += 24
        reasons.append("Recent rainfall increases leaf wetness and splash dispersal.")
    elif rain > 0:
        score += 12
        reasons.append("Rainfall can move spores and bacteria between plants.")

    if 18 <= temp <= 30:
        score += 16
        reasons.append("Temperature is within a common infection range.")
    elif 10 <= temp < 18 and profile["weather"] == "cool_wet":
        score += 18
        reasons.append("Cool wet conditions match this disease profile.")
    elif temp > 30 and profile["weather"] == "warm_wet":
        score += 14
        reasons.append("Warm wet conditions match this disease profile.")

    if wind >= 20:
        score += 10
        reasons.append("Wind can spread airborne spores beyond the infected area.")
    elif wind >= 10:
        score += 5
        reasons.append("Moderate wind can move spores locally.")

    return min(score, 40), reasons


def fetch_nearby_reports(lat: float, lng: float, disease: str, radius_km: float = 10) -> list[dict[str, Any]]:
    cutoff = (datetime.now(timezone.utc) - timedelta(days=30)).isoformat()
    with db() as conn:
        rows = conn.execute(
            """
            SELECT * FROM field_reports
            WHERE observed_at >= ?
            ORDER BY observed_at DESC
            LIMIT 500
            """,
            (cutoff,),
        ).fetchall()
    nearby = []
    needle = disease.lower().strip()
    for row in rows:
        item = row_to_dict(row)
        distance = haversine_km(lat, lng, item["lat"], item["lng"])
        if distance <= radius_km:
            item["distance_km"] = round(distance, 2)
            item["same_disease"] = needle in item["disease"].lower() or item["disease"].lower() in needle
            nearby.append(item)
    return nearby


def calculate_risk(req: RiskRequest) -> dict[str, Any]:
    weather_points, weather_reasons = weather_score(req.weather, req.disease)
    severity_points = SEVERITY_WEIGHT.get(req.severity, 35) * 0.28
    affected_points = min(req.affected_area, 100) * 0.18
    nearby = fetch_nearby_reports(req.lat, req.lng, req.disease, 10)
    same_nearby = [item for item in nearby if item["same_disease"]]
    outbreak_points = min(len(same_nearby) * 8 + max(0, len(nearby) - len(same_nearby)) * 3, 28)
    history_points = 0.0
    if req.field_id:
        with db() as conn:
            recent_count = conn.execute(
                """
                SELECT COUNT(*) FROM scan_records
                WHERE field_id = ? AND scanned_at >= ?
                """,
                (req.field_id, (datetime.now(timezone.utc) - timedelta(days=21)).isoformat()),
            ).fetchone()[0]
        history_points = min(recent_count * 4, 12)

    score = min(round(weather_points + severity_points + affected_points + outbreak_points + history_points), 100)
    level = risk_level(score)
    profile = disease_profile(req.disease)
    radius = profile["base_radius_km"] * (1 + score / 100) + len(same_nearby) * 0.25
    if req.weather and req.weather.windspeed >= 20:
        radius *= 1.25
        # Wind direction: cross-field winds (roughly E–W or W–E) spread spores
        # further across adjacent rows. Multiply radius when wind is
        # blowing at a non-trivial angle (45–135° or 225–315°).
        wd = req.weather.winddirection % 360
        if (45 <= wd <= 135) or (225 <= wd <= 315):
            radius *= 1.3
    elif req.weather and req.weather.windspeed >= 10:
        wd = req.weather.winddirection % 360
        if (45 <= wd <= 135) or (225 <= wd <= 315):
            radius *= 1.15
    radius = round(min(radius, 12), 2)
    cycle = int(profile["cycle_days"])
    timeline = [
        {
            "day": day,
            "date": (datetime.now(timezone.utc) + timedelta(days=day)).date().isoformat(),
            "expected": label,
            "radius_km": round(radius * (day / 14), 2),
        }
        for day, label in (
            (0, "current infection focus"),
            (cycle, "visible symptom expansion likely if unmanaged"),
            (14, "secondary spread risk window"),
        )
    ]
    reasons = [
        *weather_reasons,
        f"Current severity contributes {severity_points:.1f} points.",
        f"Affected area contributes {affected_points:.1f} points.",
    ]
    if same_nearby:
        reasons.append(f"{len(same_nearby)} nearby matching outbreak reports found within 10 km.")
    if history_points:
        reasons.append("Recent scan history on this field increases recurrence concern.")

    return {
        "riskScore": score,
        "riskLevel": level,
        "validationStatus": "uncalibrated_research_heuristic",
        "intendedUse": "scenario prioritisation for expert review; not a validated outbreak forecast",
        "predictedSpreadRadiusKm": radius,
        "predictedOutbreakTimeline": timeline,
        "nearbyOutbreaks": same_nearby[:10],
        "drivers": reasons,
    }


def compute_hotspots() -> dict[str, Any]:
    with db() as conn:
        rows = conn.execute(
            """
            SELECT * FROM field_reports
            WHERE observed_at >= ?
            ORDER BY observed_at DESC
            LIMIT 1000
            """,
            ((datetime.now(timezone.utc) - timedelta(days=45)).isoformat(),),
        ).fetchall()
    reports = [row_to_dict(row) for row in rows]
    buckets: dict[tuple[float, float, str], list[dict[str, Any]]] = defaultdict(list)
    for report in reports:
        key = (round(report["lat"], 1), round(report["lng"], 1), report["disease"].lower())
        buckets[key].append(report)

    hotspots = []
    heatmap = []
    for (lat, lng, disease), items in buckets.items():
        severities = [SEVERITY_WEIGHT.get(item["severity"], 35) for item in items]
        intensity = min(len(items) * 12 + sum(severities) / max(len(severities), 1) * 0.6, 100)
        if len(items) >= 2 or intensity >= 45:
            hotspots.append(
                {
                    "id": f"{lat}:{lng}:{disease}",
                    "lat": lat,
                    "lng": lng,
                    "disease": disease.title(),
                    "reports": len(items),
                    "intensity": round(intensity),
                    "riskLevel": risk_level(intensity),
                    "radiusKm": round(0.8 + len(items) * 0.35, 2),
                }
            )
        heatmap.append({"lat": lat, "lng": lng, "weight": round(intensity), "disease": disease.title()})

    clusters = sorted(hotspots, key=lambda item: item["intensity"], reverse=True)
    simulations = []
    for cluster in clusters[:8]:
        profile = disease_profile(cluster["disease"])
        simulations.append(
            {
                "hotspotId": cluster["id"],
                "disease": cluster["disease"],
                "center": {"lat": cluster["lat"], "lng": cluster["lng"]},
                "day7RadiusKm": round(cluster["radiusKm"] + profile["spread_rate"], 2),
                "day14RadiusKm": round(cluster["radiusKm"] + profile["spread_rate"] * 2.2, 2),
                "recommendedAction": "Scout neighboring fields and treat confirmed infection zones.",
            }
        )

    return {"heatmap": heatmap, "clusters": clusters, "spreadSimulation": simulations, "hotspots": clusters[:10]}


def field_health(field_id: str) -> dict[str, Any]:
    with db() as conn:
        field = conn.execute("SELECT * FROM fields WHERE id = ?", (field_id,)).fetchone()
        if not field:
            raise HTTPException(status_code=404, detail="Field not found")
        scans = [row_to_dict(row) for row in conn.execute(
            "SELECT * FROM scan_records WHERE field_id = ? ORDER BY scanned_at DESC LIMIT 30",
            (field_id,),
        ).fetchall()]
        reports = [row_to_dict(row) for row in conn.execute(
            "SELECT * FROM field_reports WHERE field_id = ? ORDER BY observed_at DESC LIMIT 30",
            (field_id,),
        ).fetchall()]

    score = 100.0
    reasons = []
    if scans:
        latest = scans[0]
        scan_penalty = SEVERITY_WEIGHT.get(latest["severity"], 15) * 0.35 + latest["affected_area"] * 0.25
        score -= scan_penalty
        reasons.append(f"Latest scan severity is {latest['severity']} with {latest['affected_area']:.1f}% affected area.")
    else:
        reasons.append("No scan history exists for this field.")
    if reports:
        report_penalty = min(len(reports) * 4, 25)
        critical = sum(1 for item in reports if item["severity"] == "Critical")
        score -= report_penalty + critical * 6
        reasons.append(f"{len(reports)} recent field reports are associated with this field.")
        if critical:
            reasons.append(f"{critical} critical reports require immediate scouting.")

    timeline = []
    grouped: dict[str, list[float]] = defaultdict(list)
    for scan in scans:
        day = parse_dt(scan["scanned_at"]).date().isoformat()
        grouped[day].append(max(0, 100 - SEVERITY_WEIGHT.get(scan["severity"], 15) * 0.35 - scan["affected_area"] * 0.25))
    for day, values in sorted(grouped.items()):
        timeline.append({"date": day, "score": round(sum(values) / len(values))})

    final_score = max(0, min(round(score), 100))
    trend = "Stable"
    if len(timeline) >= 2:
        delta = timeline[-1]["score"] - timeline[0]["score"]
        trend = "Improving" if delta >= 5 else "Declining" if delta <= -5 else "Stable"

    return {
        "field": row_to_dict(field),
        "healthScore": final_score,
        "healthLevel": risk_level(100 - final_score),
        "trend": trend,
        "explanation": reasons,
        "timeline": timeline,
        "latestScans": scans[:5],
        "latestReports": reports[:5],
    }


def early_warnings() -> dict[str, Any]:
    warnings = []
    with db() as conn:
        fields = [row_to_dict(row) for row in conn.execute("SELECT * FROM fields").fetchall()]
    for field in fields:
        nearby = fetch_nearby_reports(field["lat"], field["lng"], field["crop"], 12)
        disease_counts = Counter(item["disease"] for item in nearby)
        for disease, count in disease_counts.most_common(3):
            req = RiskRequest(
                disease=disease,
                crop=field["crop"],
                severity="Moderate",
                affected_area=0,
                lat=field["lat"],
                lng=field["lng"],
                field_id=field["id"],
                weather=None,
            )
            risk = calculate_risk(req)
            if risk["riskScore"] >= 45 or count >= 2:
                warnings.append(
                    {
                        "fieldId": field["id"],
                        "fieldName": field["name"],
                        "crop": field["crop"],
                        "disease": disease,
                        "riskScore": risk["riskScore"],
                        "riskLevel": risk["riskLevel"],
                        "reason": f"{count} nearby reports plus weather/history baseline indicate elevated pre-symptom risk.",
                        "recommendedActions": [
                            "Scout this field within 24-48 hours.",
                            "Inspect lower canopy and field edges first.",
                            "Avoid unnecessary blanket spraying until symptoms are confirmed.",
                            "Prepare targeted treatment plan if new lesions are found.",
                        ],
                    }
                )
    warnings.sort(key=lambda item: item["riskScore"], reverse=True)
    return {"warnings": warnings, "generatedAt": now_iso()}


def esc_pdf(text: str) -> str:
    return text.replace("\\", "\\\\").replace("(", "\\(").replace(")", "\\)")


def simple_pdf(title: str, lines: list[str]) -> bytes:
    content = ["BT", "/F1 16 Tf", "50 790 Td", f"({esc_pdf(title)}) Tj", "/F1 10 Tf"]
    y_step = 16
    for line in lines[:42]:
        content.append(f"0 -{y_step} Td")
        content.append(f"({esc_pdf(line[:110])}) Tj")
    content.append("ET")
    stream = "\n".join(content).encode("latin-1", "replace")
    objects = [
        b"<< /Type /Catalog /Pages 2 0 R >>",
        b"<< /Type /Pages /Kids [3 0 R] /Count 1 >>",
        b"<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 842] /Resources << /Font << /F1 4 0 R >> >> /Contents 5 0 R >>",
        b"<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>",
        b"<< /Length " + str(len(stream)).encode() + b" >>\nstream\n" + stream + b"\nendstream",
    ]
    pdf = bytearray(b"%PDF-1.4\n")
    offsets = [0]
    for i, obj in enumerate(objects, 1):
        offsets.append(len(pdf))
        pdf.extend(f"{i} 0 obj\n".encode())
        pdf.extend(obj)
        pdf.extend(b"\nendobj\n")
    xref = len(pdf)
    pdf.extend(f"xref\n0 {len(objects)+1}\n0000000000 65535 f \n".encode())
    for offset in offsets[1:]:
        pdf.extend(f"{offset:010d} 00000 n \n".encode())
    pdf.extend(f"trailer << /Size {len(objects)+1} /Root 1 0 R >>\nstartxref\n{xref}\n%%EOF".encode())
    return bytes(pdf)


@router.on_event("startup")
def startup() -> None:
    init_db()


@router.post("/farms")
def create_farm(payload: FarmIn):
    init_db()
    farm_id = str(uuid.uuid4())
    with db() as conn:
        conn.execute(
            "INSERT INTO farms (id, name, owner, region, created_at) VALUES (?, ?, ?, ?, ?)",
            (farm_id, payload.name, payload.owner, payload.region, now_iso()),
        )
        row = conn.execute("SELECT * FROM farms WHERE id = ?", (farm_id,)).fetchone()
    return row_to_dict(row)


@router.get("/farms")
def list_farms():
    init_db()
    with db() as conn:
        return [row_to_dict(row) for row in conn.execute("SELECT * FROM farms ORDER BY created_at DESC").fetchall()]


@router.post("/fields")
def create_field(payload: FieldIn):
    init_db()
    field_id = str(uuid.uuid4())
    with db() as conn:
        farm = conn.execute("SELECT id FROM farms WHERE id = ?", (payload.farm_id,)).fetchone()
        if not farm:
            raise HTTPException(status_code=404, detail="Farm not found")
        conn.execute(
            """
            INSERT INTO fields (id, farm_id, name, crop, area_hectares, lat, lng, boundary_json, created_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
            """,
            (
                field_id,
                payload.farm_id,
                payload.name,
                payload.crop,
                payload.area_hectares,
                payload.lat,
                payload.lng,
                json.dumps(payload.boundary) if payload.boundary else None,
                now_iso(),
            ),
        )
        row = conn.execute("SELECT * FROM fields WHERE id = ?", (field_id,)).fetchone()
    return row_to_dict(row)


@router.get("/fields")
def list_fields(farm_id: str | None = None):
    init_db()
    with db() as conn:
        if farm_id:
            rows = conn.execute("SELECT * FROM fields WHERE farm_id = ? ORDER BY created_at DESC", (farm_id,)).fetchall()
        else:
            rows = conn.execute("SELECT * FROM fields ORDER BY created_at DESC").fetchall()
    return [row_to_dict(row) for row in rows]


@router.post("/field-reports")
def create_field_report(payload: FieldReportIn):
    init_db()
    report_id = str(uuid.uuid4())
    observed = parse_dt(payload.observed_at).isoformat()
    with db() as conn:
        if payload.field_id:
            field = conn.execute("SELECT id FROM fields WHERE id = ?", (payload.field_id,)).fetchone()
            if not field:
                raise HTTPException(status_code=404, detail="Field not found")
        conn.execute(
            """
            INSERT INTO field_reports
            (id, field_id, disease, crop, severity, affected_area, lat, lng, notes, source, weather_json, observed_at, created_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """,
            (
                report_id,
                payload.field_id,
                payload.disease,
                payload.crop,
                payload.severity,
                payload.affected_area,
                payload.lat,
                payload.lng,
                payload.notes,
                payload.source,
                payload.weather.model_dump_json() if payload.weather else None,
                observed,
                now_iso(),
            ),
        )
        row = conn.execute("SELECT * FROM field_reports WHERE id = ?", (report_id,)).fetchone()
    report = row_to_dict(row)
    report["risk"] = calculate_risk(
        RiskRequest(
            disease=report["disease"],
            severity=report["severity"],
            crop=report["crop"],
            affected_area=report["affected_area"],
            lat=report["lat"],
            lng=report["lng"],
            field_id=report["field_id"],
            weather=payload.weather,
        )
    )
    return report


@router.get("/field-reports")
def list_field_reports(field_id: str | None = None):
    init_db()
    with db() as conn:
        if field_id:
            rows = conn.execute(
                "SELECT * FROM field_reports WHERE field_id = ? ORDER BY observed_at DESC",
                (field_id,),
            ).fetchall()
        else:
            rows = conn.execute("SELECT * FROM field_reports ORDER BY observed_at DESC LIMIT 300").fetchall()
    return [row_to_dict(row) for row in rows]


@router.post("/scans")
def create_scan_record(payload: ScanRecordIn):
    init_db()
    scan_id = str(uuid.uuid4())
    scanned = parse_dt(payload.scanned_at).isoformat()
    with db() as conn:
        if payload.field_id:
            field = conn.execute("SELECT id FROM fields WHERE id = ?", (payload.field_id,)).fetchone()
            if not field:
                raise HTTPException(status_code=404, detail="Field not found")
        conn.execute(
            """
            INSERT INTO scan_records
            (id, field_id, disease, media_type, severity, confidence, affected_area, result_json, scanned_at, created_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """,
            (
                scan_id,
                payload.field_id,
                payload.disease,
                payload.media_type,
                payload.severity,
                payload.confidence,
                payload.affected_area,
                json.dumps(payload.result) if payload.result else None,
                scanned,
                now_iso(),
            ),
        )
        row = conn.execute("SELECT * FROM scan_records WHERE id = ?", (scan_id,)).fetchone()
    return row_to_dict(row)


@router.get("/scans")
def list_scan_records(field_id: str | None = None):
    init_db()
    with db() as conn:
        if field_id:
            rows = conn.execute(
                "SELECT * FROM scan_records WHERE field_id = ? ORDER BY scanned_at DESC",
                (field_id,),
            ).fetchall()
        else:
            rows = conn.execute("SELECT * FROM scan_records ORDER BY scanned_at DESC LIMIT 300").fetchall()
    return [row_to_dict(row) for row in rows]


@router.post("/scan-feedback")
def create_scan_feedback(payload: ScanFeedbackIn):
    init_db()
    feedback_id = str(uuid.uuid4())
    with db() as conn:
        conn.execute(
            """
            INSERT INTO scan_feedback
            (id, analysis_id, prediction_index, original_disease, confirmed, corrected_disease,
             crop, confidence, severity, source_model, image_data, notes, created_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """,
            (
                feedback_id,
                payload.analysis_id,
                payload.prediction_index,
                payload.original_disease,
                1 if payload.confirmed else 0,
                payload.corrected_disease,
                payload.crop,
                payload.confidence,
                payload.severity,
                payload.source_model,
                payload.image_data if STORE_FEEDBACK_IMAGES else None,
                payload.notes,
                now_iso(),
            ),
        )
        row = conn.execute("SELECT * FROM scan_feedback WHERE id = ?", (feedback_id,)).fetchone()
    return row_to_dict(row)


@router.get("/scan-feedback", dependencies=[Depends(require_admin)])
def list_scan_feedback(analysis_id: str | None = None):
    init_db()
    with db() as conn:
        if analysis_id:
            rows = conn.execute(
                "SELECT * FROM scan_feedback WHERE analysis_id = ? ORDER BY created_at DESC",
                (analysis_id,),
            ).fetchall()
        else:
            rows = conn.execute("SELECT * FROM scan_feedback ORDER BY created_at DESC LIMIT 500").fetchall()
    items = [row_to_dict(row) for row in rows]
    for item in items:
        item["confirmed"] = bool(item["confirmed"])
    return items


@router.get("/training-dataset", dependencies=[Depends(require_admin)])
def export_training_dataset():
    init_db()
    with db() as conn:
        rows = conn.execute("SELECT * FROM scan_feedback ORDER BY created_at DESC").fetchall()
    items = []
    for row in rows:
        item = row_to_dict(row)
        item["confirmed"] = bool(item["confirmed"])
        item["training_label"] = item["original_disease"] if item["confirmed"] else item.get("corrected_disease")
        items.append(item)
    return {
        "count": len(items),
        "format": "feedback-jsonl-ready",
        "items": items,
    }


@router.post("/risk")
def predict_risk(payload: RiskRequest):
    init_db()
    return calculate_risk(payload)


@router.get("/map-intelligence")
def map_intelligence():
    init_db()
    return compute_hotspots()


@router.get("/field-health/{field_id}")
def get_field_health(field_id: str):
    init_db()
    return field_health(field_id)


@router.get("/early-warning")
def get_early_warning():
    init_db()
    return early_warnings()


@router.get("/reports/field/{field_id}.pdf")
def export_field_pdf(field_id: str):
    init_db()
    health = field_health(field_id)
    field = health["field"]
    lines = [
        f"Field: {field['name']} ({field['crop']})",
        f"Area: {field['area_hectares']} ha",
        f"Location: {field['lat']}, {field['lng']}",
        f"Health score: {health['healthScore']} / 100",
        f"Health level: {health['healthLevel']}",
        f"Trend: {health['trend']}",
        "",
        "Explanation:",
        *[f"- {item}" for item in health["explanation"]],
        "",
        "Recent reports:",
        *[
            f"- {item['observed_at'][:10]} {item['disease']} {item['severity']} {item['affected_area']:.1f}%"
            for item in health["latestReports"]
        ],
        "",
        "Recent scans:",
        *[
            f"- {item['scanned_at'][:10]} {item['disease'] or 'No disease'} {item['severity']} conf {item['confidence']:.2f}"
            for item in health["latestScans"]
        ],
    ]
    pdf = simple_pdf("AgroVision AI Field Health Report", lines)
    return Response(
        content=pdf,
        media_type="application/pdf",
        headers={"Content-Disposition": f'attachment; filename="field-{field_id}-report.pdf"'},
    )
