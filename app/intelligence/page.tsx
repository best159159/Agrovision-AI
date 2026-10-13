"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  AlertTriangle,
  Brain,
  ChevronDown,
  Download,
  Flame,
  LineChart as LineChartIcon,
  LocateFixed,
  MapPin,
  Plus,
  RefreshCw,
  ShieldCheck,
  Sprout,
  X,
} from "lucide-react";
import { Area, AreaChart, Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { Nav } from "@/components/nav";
import type { EarlyWarning, EnvironmentContext, Farm, FieldHealth, FieldRecord, MapIntelligence, RiskPrediction } from "@/lib/types";

const apiBase = process.env.NEXT_PUBLIC_API_URL ?? "http://127.0.0.1:8000";

const CASSAVA_DISEASES = [
  "Cassava Bacterial Blight (CBB)",
  "Cassava Brown Streak Disease (CBSD)",
  "Cassava Green Mottle (CGM)",
  "Cassava Mosaic Disease (CMD)",
  "Healthy",
];

const riskTone: Record<string, string> = {
  Low: "border-green-200 bg-green-50 text-green-700",
  Medium: "border-yellow-200 bg-yellow-50 text-yellow-700",
  High: "border-orange-200 bg-orange-50 text-orange-700",
  Critical: "border-red-200 bg-red-50 text-red-700",
};

type ReportForm = {
  disease: string;
  severity: string;
  affected_area: number;
  temperature: number;
  humidity: number;
  precipitation: number;
  windspeed: number;
};

const DEFAULT_REPORT: ReportForm = {
  disease: "Cassava Mosaic Disease (CMD)",
  severity: "Moderate",
  affected_area: 8,
  temperature: 27,
  humidity: 82,
  precipitation: 4,
  windspeed: 12,
};

export default function IntelligencePage() {
  const [farm, setFarm] = useState<Farm | null>(null);
  const [fields, setFields] = useState<FieldRecord[]>([]);
  const [mapIntel, setMapIntel] = useState<MapIntelligence | null>(null);
  const [warnings, setWarnings] = useState<EarlyWarning[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [loaded, setLoaded] = useState(false);

  const [expandedFieldId, setExpandedFieldId] = useState<string | null>(null);
  const [risk, setRisk] = useState<RiskPrediction | null>(null);
  const [health, setHealth] = useState<FieldHealth | null>(null);
  const [report, setReport] = useState<ReportForm>(DEFAULT_REPORT);
  const [fetchingWeather, setFetchingWeather] = useState(false);
  const [weatherFetched, setWeatherFetched] = useState<EnvironmentContext | null>(null);

  const [showAddPlot, setShowAddPlot] = useState(false);
  const [plotName, setPlotName] = useState("");
  const [plotArea, setPlotArea] = useState(1);
  const [plotLat, setPlotLat] = useState("");
  const [plotLng, setPlotLng] = useState("");

  const expandedField = useMemo(() => fields.find((f) => f.id === expandedFieldId) ?? null, [fields, expandedFieldId]);

  async function api<T>(path: string, init?: RequestInit): Promise<T> {
    const response = await fetch(`${apiBase}${path}`, {
      ...init,
      headers: { "Content-Type": "application/json", ...(init?.headers ?? {}) },
    });
    if (!response.ok) {
      let message = await response.text();
      try {
        const payload = JSON.parse(message);
        message = payload.detail ?? message;
      } catch {
        /* keep text */
      }
      throw new Error(message);
    }
    return response.json() as Promise<T>;
  }

  const load = useCallback(async () => {
    setError(null);
    try {
      let farms = await api<Farm[]>("/intelligence/farms");
      if (farms.length === 0) {
        const created = await api<Farm>("/intelligence/farms", {
          method: "POST",
          body: JSON.stringify({ name: "My Cassava Farm", region: "Thailand" }),
        });
        farms = [created];
      }
      const activeFarm = farms[0];
      setFarm(activeFarm);

      const [fieldRows, mapRows, warningRows] = await Promise.all([
        api<FieldRecord[]>(`/intelligence/fields?farm_id=${activeFarm.id}`),
        api<MapIntelligence>("/intelligence/map-intelligence"),
        api<{ warnings: EarlyWarning[] }>("/intelligence/early-warning"),
      ]);
      setFields(fieldRows);
      setMapIntel(mapRows);
      setWarnings(warningRows.warnings);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load intelligence data.");
    } finally {
      setLoaded(true);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  function openField(field: FieldRecord) {
    if (expandedFieldId === field.id) {
      setExpandedFieldId(null);
      return;
    }
    setExpandedFieldId(field.id);
    setRisk(null);
    setWeatherFetched(null);
    setReport(DEFAULT_REPORT);
    setHealth(null);
    api<FieldHealth>(`/intelligence/field-health/${field.id}`)
      .then(setHealth)
      .catch(() => setHealth(null));
  }

  function useMyLocationForPlot() {
    if (!navigator.geolocation) { setError("Geolocation is not available on this device."); return; }
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setPlotLat(pos.coords.latitude.toFixed(5));
        setPlotLng(pos.coords.longitude.toFixed(5));
      },
      (err) => setError(err.message),
    );
  }

  async function addPlot() {
    if (!farm) return;
    const lat = Number(plotLat);
    const lng = Number(plotLng);
    if (!plotName.trim()) { setError("Give the plot a name."); return; }
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) { setError("Enter a valid latitude and longitude for the plot."); return; }
    setBusy(true);
    setError(null);
    try {
      await api<FieldRecord>("/intelligence/fields", {
        method: "POST",
        body: JSON.stringify({
          farm_id: farm.id,
          name: plotName.trim(),
          crop: "Cassava",
          area_hectares: plotArea,
          lat,
          lng,
        }),
      });
      setPlotName("");
      setPlotArea(1);
      setPlotLat("");
      setPlotLng("");
      setShowAddPlot(false);
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not add plot.");
    } finally {
      setBusy(false);
    }
  }

  async function fetchWeather() {
    if (!expandedField) return;
    setFetchingWeather(true);
    setError(null);
    try {
      const env = await api<EnvironmentContext>(`/environment?lat=${expandedField.lat}&lng=${expandedField.lng}`);
      setWeatherFetched(env);
      if (env.available && env.current) {
        setReport((prev) => ({
          ...prev,
          temperature: env.current!.temperature,
          humidity: env.current!.humidity,
          precipitation: env.current!.precipitation,
          windspeed: env.current!.windspeed,
        }));
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not fetch live weather from Open-Meteo.");
    } finally {
      setFetchingWeather(false);
    }
  }

  function reportPayload() {
    if (!expandedField) return null;
    return {
      field_id: expandedField.id,
      disease: report.disease,
      crop: "Cassava",
      severity: report.severity,
      affected_area: report.affected_area,
      lat: expandedField.lat,
      lng: expandedField.lng,
      weather: {
        temperature: report.temperature,
        humidity: report.humidity,
        precipitation: report.precipitation,
        windspeed: report.windspeed,
      },
    };
  }

  async function predictRisk() {
    const payload = reportPayload();
    if (!payload) return;
    setBusy(true);
    setError(null);
    try {
      setRisk(await api<RiskPrediction>("/intelligence/risk", { method: "POST", body: JSON.stringify(payload) }));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Risk prediction failed.");
    } finally {
      setBusy(false);
    }
  }

  async function submitReport() {
    const payload = reportPayload();
    if (!payload || !expandedField) return;
    setBusy(true);
    setError(null);
    try {
      const saved = await api<{ risk: RiskPrediction }>("/intelligence/field-reports", {
        method: "POST",
        body: JSON.stringify({ ...payload, notes: "Operator-entered scouting report", source: "manual" }),
      });
      setRisk(saved.risk);
      setHealth(await api<FieldHealth>(`/intelligence/field-health/${expandedField.id}`));
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not save report.");
    } finally {
      setBusy(false);
    }
  }

  const reportHistoryUrl = expandedField ? `${apiBase}/intelligence/reports/field/${expandedField.id}.pdf` : "#";

  return (
    <main className="min-h-screen bg-slate-50">
      <Nav />
      <div className="mx-auto max-w-7xl px-6 py-8">
        <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-widest text-green-600">Cassava Field Intelligence</p>
            <h1 className="mt-2 text-3xl font-bold text-slate-900">Your Plots</h1>
            <p className="mt-1 max-w-2xl text-sm text-slate-500">
              Every card below is one cassava plot. Add a plot, log what you see, pull live weather, and get an
              explainable risk score — an uncalibrated scenario score for expert review, not a validated forecast.
            </p>
          </div>
          <button onClick={() => void load()} className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-600 hover:bg-slate-50">
            <RefreshCw className="h-4 w-4" /> Refresh
          </button>
        </div>

        {error && (
          <div className="mb-5 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>
        )}

        {/* Plot grid */}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <button
            onClick={() => setShowAddPlot((v) => !v)}
            className="flex min-h-[140px] flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed border-green-300 bg-green-50/50 text-green-700 transition-colors hover:bg-green-50"
          >
            <Plus className="h-6 w-6" />
            <span className="text-sm font-semibold">Add a plot</span>
          </button>

          {fields.map((field) => (
            <button
              key={field.id}
              onClick={() => openField(field)}
              className={`rounded-xl border bg-white p-4 text-left shadow-sm transition-all ${
                expandedFieldId === field.id ? "border-green-400 ring-2 ring-green-100" : "border-slate-200 hover:border-green-200"
              }`}
            >
              <div className="flex items-start justify-between gap-2">
                <div>
                  <p className="text-sm font-semibold text-slate-900">{field.name}</p>
                  <p className="mt-0.5 flex items-center gap-1 text-xs text-slate-400">
                    <Sprout className="h-3 w-3 text-green-500" /> Cassava · {field.area_hectares} ha
                  </p>
                </div>
                <ChevronDown className={`h-4 w-4 shrink-0 text-slate-400 transition-transform ${expandedFieldId === field.id ? "rotate-180" : ""}`} />
              </div>
              <p className="mt-2 flex items-center gap-1 text-[11px] text-slate-400">
                <MapPin className="h-3 w-3" /> {field.lat.toFixed(4)}, {field.lng.toFixed(4)}
              </p>
            </button>
          ))}

          {loaded && fields.length === 0 && (
            <div className="flex min-h-[140px] items-center justify-center rounded-xl border border-dashed border-slate-200 bg-slate-50 p-4 text-center text-xs text-slate-400 sm:col-span-2 lg:col-span-2">
              No plots yet — click &quot;Add a plot&quot; to create your first cassava plot.
            </div>
          )}
        </div>

        {/* Add plot form */}
        {showAddPlot && (
          <div className="mt-4 rounded-xl border border-green-200 bg-white p-5 shadow-sm">
            <div className="mb-3 flex items-center justify-between">
              <p className="flex items-center gap-2 text-sm font-semibold text-slate-800">
                <Plus className="h-4 w-4 text-green-600" /> New cassava plot
              </p>
              <button onClick={() => setShowAddPlot(false)} className="text-slate-400 hover:text-slate-600">
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <input value={plotName} onChange={(e) => setPlotName(e.target.value)} className="sm:col-span-2 rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-green-400" placeholder="Plot name (e.g. Block A)" />
              <input type="number" value={plotArea} onChange={(e) => setPlotArea(Number(e.target.value))} className="rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-green-400" placeholder="Area (hectares)" />
              <div className="grid grid-cols-2 gap-2">
                <input value={plotLat} onChange={(e) => setPlotLat(e.target.value)} className="rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-green-400" placeholder="Latitude" />
                <input value={plotLng} onChange={(e) => setPlotLng(e.target.value)} className="rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-green-400" placeholder="Longitude" />
              </div>
            </div>
            <div className="mt-3 flex flex-wrap gap-2">
              <button onClick={useMyLocationForPlot} className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-medium text-slate-600 hover:bg-slate-50">
                <LocateFixed className="h-3.5 w-3.5 text-green-600" /> Use current location
              </button>
              <button onClick={() => void addPlot()} disabled={busy} className="ml-auto inline-flex items-center gap-2 rounded-lg bg-green-600 px-4 py-2 text-sm font-medium text-white disabled:opacity-50">
                <Plus className="h-4 w-4" /> Create plot
              </button>
            </div>
          </div>
        )}

        {/* Expanded plot detail */}
        {expandedField && (
          <div className="mt-5 space-y-5">
            <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-green-200 bg-green-50 px-4 py-3">
              <p className="text-sm font-semibold text-green-900">
                Viewing <strong>{expandedField.name}</strong> — Cassava · {expandedField.area_hectares} ha
              </p>
              <a href={reportHistoryUrl} className="inline-flex items-center gap-2 rounded-lg bg-green-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-green-700">
                <Download className="h-3.5 w-3.5" /> PDF Report
              </a>
            </div>

            <div className="grid gap-5 lg:grid-cols-[360px_1fr]">
              <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
                <p className="mb-3 flex items-center gap-2 text-sm font-semibold text-slate-800">
                  <Brain className="h-4 w-4 text-green-600" /> Log a scouting report
                </p>
                <div className="grid grid-cols-2 gap-2">
                  <select value={report.disease} onChange={(e) => setReport({ ...report, disease: e.target.value })} className="col-span-2 rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-green-400">
                    {CASSAVA_DISEASES.map((disease) => <option key={disease}>{disease}</option>)}
                  </select>
                  <select value={report.severity} onChange={(e) => setReport({ ...report, severity: e.target.value })} className="rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-green-400">
                    {["Low", "Moderate", "High", "Critical"].map((item) => <option key={item}>{item}</option>)}
                  </select>
                  <input type="number" value={report.affected_area} onChange={(e) => setReport({ ...report, affected_area: Number(e.target.value) })} className="rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-green-400" placeholder="Affected %" />
                </div>

                <button
                  onClick={() => void fetchWeather()}
                  disabled={fetchingWeather}
                  className="mt-3 flex w-full items-center justify-center gap-2 rounded-lg border border-sky-200 bg-sky-50 px-3 py-2 text-sm font-medium text-sky-700 disabled:opacity-50"
                >
                  <RefreshCw className={`h-3.5 w-3.5 ${fetchingWeather ? "animate-spin" : ""}`} />
                  {fetchingWeather ? "Fetching live weather…" : "Fetch live weather (Open-Meteo)"}
                </button>
                {weatherFetched && !weatherFetched.available && (
                  <p className="mt-1.5 text-xs text-red-600">{weatherFetched.error ?? "Open-Meteo unavailable — using manual values below."}</p>
                )}

                <div className="mt-2 grid grid-cols-2 gap-2">
                  <input type="number" value={report.temperature} onChange={(e) => setReport({ ...report, temperature: Number(e.target.value) })} className="rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-green-400" placeholder="Temp °C" />
                  <input type="number" value={report.humidity} onChange={(e) => setReport({ ...report, humidity: Number(e.target.value) })} className="rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-green-400" placeholder="Humidity %" />
                  <input type="number" value={report.precipitation} onChange={(e) => setReport({ ...report, precipitation: Number(e.target.value) })} className="rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-green-400" placeholder="Rain mm" />
                  <input type="number" value={report.windspeed} onChange={(e) => setReport({ ...report, windspeed: Number(e.target.value) })} className="rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-green-400" placeholder="Wind km/h" />
                </div>
                <p className="mt-1.5 text-[11px] text-slate-400">Weather auto-fills from the button above; edit manually only if you have a better local reading.</p>

                <div className="mt-3 grid grid-cols-2 gap-2">
                  <button onClick={() => void predictRisk()} disabled={busy} className="rounded-lg border border-green-200 bg-green-50 px-3 py-2 text-sm font-medium text-green-700 disabled:opacity-50">Predict</button>
                  <button onClick={() => void submitReport()} disabled={busy} className="rounded-lg bg-green-600 px-3 py-2 text-sm font-medium text-white disabled:opacity-50">Save Report</button>
                </div>
              </div>

              <div className="space-y-5">
                <div className="grid gap-4 md:grid-cols-3">
                  <Metric label="Risk Score" value={risk ? `${risk.riskScore}` : "--"} sub={risk?.riskLevel ?? "No prediction"} icon={AlertTriangle} tone={risk?.riskLevel} />
                  <Metric label="Spread Radius" value={risk ? `${risk.predictedSpreadRadiusKm} km` : "--"} sub="predicted" icon={MapPin} />
                  <Metric label="Field Health" value={health ? `${health.healthScore}` : "--"} sub={health?.trend ?? "No reports yet"} icon={ShieldCheck} tone={health?.healthLevel} />
                </div>

                <Panel title="Risk Drivers" icon={Brain}>
                  {risk ? (
                    <div className="space-y-3">
                      <div className={`rounded-lg border p-4 ${riskTone[risk.riskLevel] ?? riskTone.Low}`}>
                        <p className="text-3xl font-bold">{risk.riskScore}/100</p>
                        <p className="text-sm font-semibold">{risk.riskLevel} risk</p>
                      </div>
                      <ul className="space-y-2">
                        {risk.drivers.map((driver) => <li key={driver} className="text-sm text-slate-600">{driver}</li>)}
                      </ul>
                      <p className="border-t border-slate-100 pt-2 text-[11px] leading-relaxed text-slate-400">
                        Thresholds follow published plant-pathology epidemiology (e.g. Campbell &amp; Madden 1990;
                        Huber &amp; Gillespie 1992; Savary et al. 2019) — this is an explainable heuristic, not a
                        fitted statistical model. Full references and formulae in <span className="font-mono">TECHNICAL_VALIDATION.md</span>.
                      </p>
                    </div>
                  ) : (
                    <Empty text="Run a risk prediction or save a scouting report." />
                  )}
                </Panel>

                <Panel title="Predicted Outbreak Timeline" icon={LineChartIcon}>
                  {risk ? (
                    <div className="h-56">
                      <ResponsiveContainer width="100%" height="100%">
                        <AreaChart data={risk.predictedOutbreakTimeline}>
                          <CartesianGrid stroke="#e2e8f0" strokeDasharray="3 3" />
                          <XAxis dataKey="day" tickFormatter={(day) => `Day ${day}`} />
                          <YAxis />
                          <Tooltip />
                          <Area type="monotone" dataKey="radius_km" stroke="#16a34a" fill="#bbf7d0" />
                        </AreaChart>
                      </ResponsiveContainer>
                    </div>
                  ) : <Empty text="No timeline yet." />}
                </Panel>

                <Panel title="Field Health Explanation" icon={ShieldCheck}>
                  {health ? (
                    <div className="grid gap-4 lg:grid-cols-[160px_1fr]">
                      <div className={`rounded-lg border p-4 text-center ${riskTone[health.healthLevel] ?? riskTone.Low}`}>
                        <p className="text-4xl font-bold">{health.healthScore}</p>
                        <p className="text-sm font-semibold">Health score</p>
                        <p className="mt-1 text-xs">{health.trend}</p>
                      </div>
                      <div className="space-y-2">
                        {health.explanation.map((item) => <p key={item} className="text-sm text-slate-600">{item}</p>)}
                      </div>
                    </div>
                  ) : <Empty text="Save a scouting report to compute health scoring." />}
                </Panel>
              </div>
            </div>
          </div>
        )}

        {/* Farm-wide panels */}
        <div className="mt-8 grid gap-5 lg:grid-cols-2">
          <Panel title="Early Disease Warnings" icon={AlertTriangle}>
            {warnings.length ? (
              <div className="space-y-3">
                {warnings.slice(0, 5).map((warning) => (
                  <div key={`${warning.fieldId}-${warning.disease}`} className={`rounded-lg border p-3 ${riskTone[warning.riskLevel] ?? riskTone.Low}`}>
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="text-sm font-semibold">{warning.disease}</p>
                        <p className="mt-0.5 text-xs opacity-80">{warning.fieldName}</p>
                      </div>
                      <span className="text-lg font-bold">{warning.riskScore}</span>
                    </div>
                    <p className="mt-2 text-xs leading-relaxed opacity-90">{warning.reason}</p>
                  </div>
                ))}
              </div>
            ) : (
              <Empty text="No early warnings yet. Save scouting reports on nearby plots to activate warning logic." />
            )}
          </Panel>

          <Panel title="Disease Hotspots" icon={Flame}>
            {mapIntel?.hotspots.length ? (
              <div className="h-56">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={mapIntel.hotspots.slice(0, 8)}>
                    <CartesianGrid stroke="#e2e8f0" strokeDasharray="3 3" />
                    <XAxis dataKey="disease" tick={{ fontSize: 10 }} />
                    <YAxis />
                    <Tooltip />
                    <Bar dataKey="intensity" fill="#ea580c" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            ) : <Empty text="No hotspots yet. Hotspots appear after repeated reports in nearby areas." />}
          </Panel>
        </div>
      </div>
    </main>
  );
}

function Metric({ label, value, sub, icon: Icon, tone }: {
  label: string;
  value: string;
  sub: string;
  icon: typeof AlertTriangle;
  tone?: string;
}) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="flex items-center justify-between">
        <p className="text-xs font-medium text-slate-500">{label}</p>
        <Icon className="h-4 w-4 text-green-600" />
      </div>
      <p className="mt-2 text-2xl font-bold text-slate-900">{value}</p>
      <p className={`mt-1 inline-flex rounded-full border px-2 py-0.5 text-xs ${tone ? riskTone[tone] ?? "border-slate-200 bg-slate-50 text-slate-500" : "border-slate-200 bg-slate-50 text-slate-500"}`}>{sub}</p>
    </div>
  );
}

function Panel({ title, icon: Icon, children }: { title: string; icon: typeof AlertTriangle; children: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
      <p className="mb-4 flex items-center gap-2 text-sm font-semibold text-slate-800">
        <Icon className="h-4 w-4 text-green-600" /> {title}
      </p>
      {children}
    </div>
  );
}

function Empty({ text }: { text: string }) {
  return <div className="rounded-lg border border-dashed border-slate-200 bg-slate-50 p-6 text-center text-sm text-slate-400">{text}</div>;
}
