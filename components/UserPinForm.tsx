"use client";
import { useEffect, useState } from "react";
import { CloudRain, Droplets, Loader2, MapPin, Thermometer, Wind, X, CheckCircle2 } from "lucide-react";
import type { UserMapPin } from "@/lib/types";

const DISEASES = [
  "Rice Blast","Bacterial Leaf Blight","Brown Spot","Sheath Blight","Powdery Mildew",
  "Downy Mildew","Rust","Leaf Rust","Early Blight","Late Blight","Gray Leaf Spot",
  "Northern Corn Leaf Blight","Anthracnose","Leaf Spot","Sugarcane Smut","Sugarcane Mosaic",
  "Cassava Mosaic","Cassava Bacterial Blight","Panama Disease","Banana Sigatoka",
  "Bacterial Blight","Wilt","Septoria Leaf Spot","Cercospora Leaf Spot",
  "Root Rot","Damping Off","Fire Blight","Citrus Canker","Other / Unknown",
];
const CROPS = [
  "Rice","Wheat","Corn / Maize","Sugarcane","Cassava","Banana / Plantain",
  "Tomato","Potato","Mango","Citrus","Coffee","Soybean","Peanut","Cotton","Pepper","Other",
];
const SEVERITIES: { v: UserMapPin["severity"]; label: string; cls: string }[] = [
  { v:"Low",      label:"Low",      cls:"border-green-200 bg-green-50 text-green-700 hover:bg-green-100" },
  { v:"Moderate", label:"Moderate", cls:"border-yellow-200 bg-yellow-50 text-yellow-700 hover:bg-yellow-100" },
  { v:"High",     label:"High",     cls:"border-orange-200 bg-orange-50 text-orange-700 hover:bg-orange-100" },
  { v:"Critical", label:"Critical", cls:"border-red-200 bg-red-50 text-red-700 hover:bg-red-100" },
];

async function getWeather(lat: number, lng: number): Promise<UserMapPin["weather"]> {
  try {
    const url = new URL("https://api.open-meteo.com/v1/forecast");
    url.searchParams.set("latitude",  lat.toFixed(4));
    url.searchParams.set("longitude", lng.toFixed(4));
    url.searchParams.set("current",   "temperature_2m,relative_humidity_2m,precipitation,windspeed_10m");
    url.searchParams.set("timezone",  "auto");
    const r = await fetch(url.toString(), { signal: AbortSignal.timeout(8000) });
    if (!r.ok) return null;
    const d = await r.json(); const c = d?.current ?? {};
    const temperature = Number(c.temperature_2m ?? 20);
    const humidity    = Number(c.relative_humidity_2m ?? 60);
    const precipitation = Number(c.precipitation ?? 0);
    const windspeed   = Number(c.windspeed_10m ?? 10);
    const s = (temperature >= 18 && temperature <= 32 ? 1 : 0) + (humidity >= 70 ? 1 : 0) + (precipitation > 0 ? 1 : 0);
    const riskLevel = s === 3 ? "High" : s >= 2 ? "Moderate" : "Low";
    return { temperature, humidity, precipitation, windspeed, riskLevel };
  } catch { return null; }
}

export function UserPinForm({ lat, lng, onSubmit, onCancel }:
  { lat: number; lng: number; onSubmit: (p: UserMapPin) => void; onCancel: () => void }) {

  const [disease,  setDisease]  = useState(DISEASES[0]);
  const [crop,     setCrop]     = useState(CROPS[0]);
  const [severity, setSeverity] = useState<UserMapPin["severity"]>("Moderate");
  const [notes,    setNotes]    = useState("");
  const [weather,  setWeather]  = useState<UserMapPin["weather"]>(undefined);
  const [fetching, setFetching] = useState(true);

  useEffect(() => {
    getWeather(lat, lng).then(setWeather).finally(() => setFetching(false));
  }, [lat, lng]);

  function submit() {
    onSubmit({ id: crypto.randomUUID(), lat, lng, disease, crop, severity, notes: notes.trim(), createdAt: new Date().toISOString(), weather });
  }

  const riskColor = weather?.riskLevel === "High" ? "text-red-600 bg-red-50 border-red-200"
    : weather?.riskLevel === "Moderate" ? "text-amber-600 bg-amber-50 border-amber-200"
    : "text-green-600 bg-green-50 border-green-200";

  return (
    <div className="fixed inset-0 z-[9000] flex items-center justify-center bg-black/40 p-4" onClick={onCancel}>
      <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white shadow-2xl" onClick={e => e.stopPropagation()}>

        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
          <div className="flex items-center gap-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-green-50 border border-green-100">
              <MapPin className="h-4 w-4 text-green-600" />
            </div>
            <div>
              <p className="text-sm font-semibold text-slate-900">Add Field Report</p>
              <p className="text-xs text-slate-400 font-mono">{lat.toFixed(4)}°, {lng.toFixed(4)}°</p>
            </div>
          </div>
          <button onClick={onCancel} className="flex h-7 w-7 items-center justify-center rounded-lg text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition-colors">
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="space-y-4 p-5">
          {/* Weather */}
          <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
            <p className="mb-2 flex items-center gap-1.5 text-xs font-medium text-slate-500">
              <CloudRain className="h-3.5 w-3.5 text-sky-500" /> Weather at this location
            </p>
            {fetching ? (
              <div className="flex items-center gap-2 text-xs text-slate-400">
                <Loader2 className="h-3.5 w-3.5 animate-spin" /> Fetching…
              </div>
            ) : weather ? (
              <div className="flex flex-wrap items-center gap-3">
                <span className="flex items-center gap-1 text-xs text-slate-600"><Thermometer className="h-3 w-3 text-orange-400" />{weather.temperature}°C</span>
                <span className="flex items-center gap-1 text-xs text-slate-600"><Droplets className="h-3 w-3 text-sky-400" />{weather.humidity}% RH</span>
                <span className="flex items-center gap-1 text-xs text-slate-600"><CloudRain className="h-3 w-3 text-blue-400" />{weather.precipitation}mm</span>
                <span className="flex items-center gap-1 text-xs text-slate-600"><Wind className="h-3 w-3 text-slate-400" />{weather.windspeed}km/h</span>
                <span className={`rounded-full border px-2 py-0.5 text-xs font-medium ${riskColor}`}>
                  {weather.riskLevel} spread risk
                </span>
              </div>
            ) : <p className="text-xs text-slate-400">Weather unavailable</p>}
          </div>

          {/* Disease */}
          <div>
            <label className="mb-1.5 block text-xs font-medium text-slate-600">Disease</label>
            <select value={disease} onChange={e => setDisease(e.target.value)}
              className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800 outline-none focus:border-green-400 focus:ring-2 focus:ring-green-100 transition-all">
              {DISEASES.map(d => <option key={d}>{d}</option>)}
            </select>
          </div>

          {/* Crop */}
          <div>
            <label className="mb-1.5 block text-xs font-medium text-slate-600">Affected Crop</label>
            <select value={crop} onChange={e => setCrop(e.target.value)}
              className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800 outline-none focus:border-green-400 focus:ring-2 focus:ring-green-100 transition-all">
              {CROPS.map(c => <option key={c}>{c}</option>)}
            </select>
          </div>

          {/* Severity */}
          <div>
            <label className="mb-2 block text-xs font-medium text-slate-600">Severity</label>
            <div className="grid grid-cols-4 gap-1.5">
              {SEVERITIES.map(s => (
                <button key={s.v} onClick={() => setSeverity(s.v)}
                  className={`rounded-lg border py-2 text-xs font-medium transition-all ${s.cls} ${severity === s.v ? "ring-2 ring-offset-1 ring-current" : "opacity-60"}`}>
                  {s.label}
                </button>
              ))}
            </div>
          </div>

          {/* Notes */}
          <div>
            <label className="mb-1.5 block text-xs font-medium text-slate-600">
              Notes <span className="text-slate-400 font-normal">(optional)</span>
            </label>
            <textarea value={notes} onChange={e => setNotes(e.target.value)} rows={3}
              placeholder="Symptoms observed, estimated infected area, nearby conditions…"
              className="w-full resize-none rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800 placeholder-slate-400 outline-none focus:border-green-400 focus:ring-2 focus:ring-green-100 transition-all" />
          </div>
        </div>

        {/* Footer */}
        <div className="flex justify-end gap-2 border-t border-slate-100 px-5 py-4">
          <button onClick={onCancel}
            className="rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50 transition-colors">
            Cancel
          </button>
          <button onClick={submit}
            className="flex items-center gap-1.5 rounded-lg bg-green-600 px-4 py-2 text-sm font-medium text-white hover:bg-green-700 transition-colors">
            <CheckCircle2 className="h-4 w-4" /> Save Report
          </button>
        </div>
      </div>
    </div>
  );
}
