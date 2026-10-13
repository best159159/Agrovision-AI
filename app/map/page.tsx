"use client";
import dynamic from "next/dynamic";
import { useCallback, useEffect, useState } from "react";
import { Filter, Globe, Loader2, MapPin, MapPinOff, RefreshCw, Search, X } from "lucide-react";
import { Nav } from "@/components/nav";
import { FieldReportSidebar } from "@/components/FieldReportSidebar";
import { UserPinForm } from "@/components/UserPinForm";
import type { MapPin as IMapPin, UserMapPin } from "@/lib/types";

const apiBase = process.env.NEXT_PUBLIC_API_URL ?? "http://127.0.0.1:8000";
const STORAGE_KEY = "agrovision:fieldReports";

const DiseaseMapInner = dynamic(() => import("@/components/DiseaseMapInner"), {
  ssr: false,
  loading: () => (
    <div className="flex h-full items-center justify-center bg-slate-100 rounded-xl">
      <div className="flex flex-col items-center gap-2">
        <Loader2 className="h-6 w-6 animate-spin text-green-500" />
        <p className="text-sm text-slate-400">Loading map…</p>
      </div>
    </div>
  ),
});

const FILTERS = [
  { label: "All Fungi",      value: "" },
  { label: "Powdery Mildew", value: "powdery mildew" },
  { label: "Rust",           value: "rust" },
  { label: "Downy Mildew",   value: "downy mildew" },
  { label: "Late Blight",    value: "Phytophthora" },
  { label: "Anthracnose",    value: "Colletotrichum" },
  { label: "Fusarium Wilt",  value: "Fusarium" },
  { label: "Rice Blast",     value: "Magnaporthe" },
];

function load(): UserMapPin[] { try { return JSON.parse(localStorage.getItem(STORAGE_KEY)??"[]"); } catch { return []; } }
function save(p: UserMapPin[]) { localStorage.setItem(STORAGE_KEY, JSON.stringify(p)); }

const ALLOWED_SEVERITY = new Set(["Low", "Moderate", "High", "Critical"]);

type FieldDetectionRow = {
  id: string;
  created_at: string;
  lat: number;
  lng: number;
  disease: string;
  confidence: number;
  severity: string | null;
  crop: string | null;
  source: string | null;
};

const SEVERITY_RADIUS_KM: Record<string, number> = {
  Low: 0.5,
  Moderate: 1.2,
  High: 2.5,
  Critical: 4.0,
};

function rowToPin(row: FieldDetectionRow): UserMapPin {
  const severity = ALLOWED_SEVERITY.has(row.severity ?? "") ? (row.severity as UserMapPin["severity"]) : "Moderate";
  const sourceLabel = row.source === "drone_survey" ? "Drone survey" : row.source === "live_drone" ? "Live drone" : row.source === "offline_video" ? "Offline video" : "Offline scan";
  return {
    id: `db-${row.id}`,
    lat: row.lat,
    lng: row.lng,
    disease: row.disease,
    crop: row.crop ?? "Unknown",
    severity,
    spreadRadiusKm: SEVERITY_RADIUS_KM[severity] ?? 1.0,
    notes: `${sourceLabel} · ${(row.confidence * 100).toFixed(0)}% confidence · auto-saved`,
    createdAt: row.created_at,
    weather: null,
  };
}

export default function MapPage() {
  const [pins,    setPins]    = useState<IMapPin[]>([]);
  const [uPins,   setUPins]   = useState<UserMapPin[]>([]);
  const [dbPins,  setDbPins]  = useState<UserMapPin[]>([]);
  const [loading, setLoading] = useState(false);
  const [error,   setError]   = useState<string | null>(null);
  const [total,   setTotal]   = useState(0);
  const [search,  setSearch]  = useState("");
  const [filter,  setFilter]  = useState("");
  const [addMode, setAddMode] = useState(false);
  const [pending, setPending] = useState<{ lat: number; lng: number } | null>(null);
  const [focus,   setFocus]   = useState<{ lat: number; lng: number } | null>(null);

  useEffect(() => { setUPins(load()); }, []);

  const fetchFieldDetections = useCallback(async () => {
    try {
      const r = await fetch(`${apiBase}/field-detections`);
      if (!r.ok) return;
      const d = await r.json();
      setDbPins((d.detections ?? []).map(rowToPin));
    } catch {
      // Non-fatal — the map still works with local + iNaturalist pins if the backend is unreachable.
    }
  }, []);

  useEffect(() => { fetchFieldDetections(); }, [fetchFieldDetections]);

  const fetchPins = useCallback(async (q: string) => {
    setLoading(true); setError(null);
    try {
      const p = new URLSearchParams({ per_page: "150", page: "1" });
      if (q) p.set("taxon_name", q);
      const r = await fetch(`${apiBase}/map/observations?${p}`);
      if (!r.ok) throw new Error((await r.json()).detail ?? "Failed");
      const d = await r.json();
      setPins(d.pins ?? []); setTotal(d.total_results ?? 0);
    } catch (e) { setError(e instanceof Error ? e.message : "Error"); setPins([]); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { fetchPins(""); }, [fetchPins]);

  const allUserPins = [...dbPins, ...uPins];

  function handleMapClick(lat: number, lng: number) {
    if (!addMode) return;
    setPending({ lat, lng }); setAddMode(false);
  }
  function addPin(p: UserMapPin) {
    const u = [p, ...uPins]; setUPins(u); save(u); setPending(null);
    setFocus({ lat: p.lat, lng: p.lng });
  }
  async function removePin(id: string) {
    if (id.startsWith("db-")) {
      const detectionId = id.slice(3);
      try {
        await fetch(`${apiBase}/field-detections/${detectionId}`, { method: "DELETE" });
      } catch {
        setError("Could not remove this detection from the database.");
        return;
      }
      setDbPins(dbPins.filter(p => p.id !== id));
      return;
    }
    const u = uPins.filter(p => p.id !== id); setUPins(u); save(u);
  }
  function clearAll() { if (!confirm("Remove all manually-added field reports? (Auto-saved scan detections are not affected.)")) return; setUPins([]); save([]); }

  return (
    <main className="min-h-screen bg-slate-50">
      <Nav fieldReportCount={allUserPins.length} />
      <div className="mx-auto max-w-[1400px] px-6 py-6">

        {/* Header */}
        <div className="mb-5 flex flex-wrap items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Disease Outbreak Map</h1>
            <p className="mt-0.5 text-sm text-slate-500">
              iNaturalist research-grade observations · Auto-saved from your scans · Click to add field reports
            </p>
          </div>
          <div className="flex items-center gap-2">
            {loading ? (
              <span className="flex items-center gap-1.5 text-sm text-slate-400">
                <Loader2 className="h-4 w-4 animate-spin" /> Loading…
              </span>
            ) : (
              <span className="flex items-center gap-1.5 rounded-full border border-slate-200 bg-white px-3 py-1 text-xs text-slate-500">
                <Globe className="h-3.5 w-3.5 text-green-500" />
                {pins.length.toLocaleString()} observations
              </span>
            )}
            <button onClick={() => { fetchPins(filter); fetchFieldDetections(); }} disabled={loading}
              className="flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-500 hover:bg-slate-50 transition-colors disabled:opacity-50">
              <RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} />
            </button>
          </div>
        </div>

        {/* Search row */}
        <div className="mb-4 flex flex-wrap items-center gap-3 rounded-xl border border-slate-200 bg-white p-3 shadow-sm">
          <div className="flex flex-1 min-w-48 items-center gap-2 rounded-lg border border-slate-200 px-3 py-2">
            <Search className="h-4 w-4 shrink-0 text-slate-400" />
            <input value={search} onChange={e => setSearch(e.target.value)}
              onKeyDown={e => e.key === "Enter" && fetchPins(search)}
              placeholder="Search pathogen or disease…"
              className="flex-1 text-sm text-slate-700 outline-none placeholder-slate-400 bg-transparent" />
            {search && <button onClick={() => { setSearch(""); setFilter(""); fetchPins(""); }}><X className="h-3.5 w-3.5 text-slate-400 hover:text-slate-600" /></button>}
          </div>
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="flex items-center gap-1 text-xs text-slate-400"><Filter className="h-3 w-3" /> Filter:</span>
            {FILTERS.map(f => (
              <button key={f.value} onClick={() => { setFilter(f.value); setSearch(f.value); fetchPins(f.value); }}
                className={`rounded-full border px-3 py-1 text-xs font-medium transition-colors ${filter === f.value ? "border-green-300 bg-green-50 text-green-700" : "border-slate-200 bg-white text-slate-500 hover:bg-slate-50"}`}>
                {f.label}
              </button>
            ))}
          </div>
        </div>

        {error && (
          <div className="mb-4 flex items-center justify-between rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            <span>{error}</span>
            <button onClick={() => setError(null)}><X className="h-4 w-4" /></button>
          </div>
        )}

        {/* Map + sidebar */}
        <div className="flex gap-4" style={{ height: 600 }}>
          {/* Map */}
          <div className="relative flex-1 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
            {/* Add-mode button */}
            <div className="absolute top-3 left-3 z-[1000]">
              <button onClick={() => { setAddMode(v => !v); setPending(null); }}
                className={`flex items-center gap-2 rounded-lg border px-3 py-2 text-xs font-medium shadow-md backdrop-blur-sm transition-all ${
                  addMode
                    ? "border-green-300 bg-green-50 text-green-700 ring-1 ring-green-300"
                    : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
                }`}>
                {addMode ? <><MapPinOff className="h-3.5 w-3.5" />Cancel — click map</> : <><MapPin className="h-3.5 w-3.5" />Add Report</>}
              </button>
            </div>
            {addMode && (
              <div className="pointer-events-none absolute inset-0 z-[500] rounded-xl ring-2 ring-green-400 ring-dashed" />
            )}
            <DiseaseMapInner pins={pins} userPins={allUserPins}
              addMode={addMode} onMapClick={handleMapClick} onRemoveUserPin={removePin}
              focusPin={focus} />
          </div>

          {/* Sidebar */}
          <div className="w-72 shrink-0">
            <FieldReportSidebar pins={allUserPins} onRemovePin={removePin} onClearAll={clearAll}
              onFocusPin={p => setFocus({ lat: p.lat, lng: p.lng })} />
          </div>
        </div>

        {/* Legend */}
        <div className="mt-3 flex flex-wrap items-center gap-5 text-xs text-slate-400">
          <div className="flex items-center gap-1.5">
            <span className="h-2.5 w-2.5 rounded-full bg-orange-400 inline-block" /> iNaturalist observation
          </div>
          <div className="flex items-center gap-1.5">
            <span className="h-2.5 w-2.5 rounded-full bg-green-500 inline-block" /> Your field report
          </div>
          <div className="flex items-center gap-1.5">
            <span className="inline-block h-3 w-3 rounded-full border border-dashed border-green-500 bg-green-500/10" /> Estimated spread radius
          </div>
          <div className="ml-auto flex items-center gap-3">
            <a href="https://www.inaturalist.org" target="_blank" rel="noreferrer" className="text-green-600 hover:underline">iNaturalist</a>
            <span>·</span>
            <a href="https://open-meteo.com" target="_blank" rel="noreferrer" className="text-green-600 hover:underline">Open-Meteo weather</a>
          </div>
        </div>
      </div>

      {pending && <UserPinForm lat={pending.lat} lng={pending.lng} onSubmit={addPin} onCancel={() => setPending(null)} />}
    </main>
  );
}
