"use client";
import { AlertTriangle, BarChart2, ClipboardList, Droplets, MapPin, Thermometer, Trash2, X } from "lucide-react";
import type { UserMapPin } from "@/lib/types";

const SEV: Record<UserMapPin["severity"], string> = {
  Low:      "badge-low",
  Moderate: "badge-moderate",
  High:     "badge-high",
  Critical: "badge-critical",
};

function date(iso: string) {
  try { return new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric" }); }
  catch { return iso; }
}

function chart(pins: UserMapPin[]) {
  const c: Record<string,number> = {};
  for (const p of pins) c[p.disease] = (c[p.disease] ?? 0) + 1;
  return Object.entries(c).sort(([,a],[,b]) => b-a).slice(0,5);
}

export function FieldReportSidebar({ pins, onRemovePin, onClearAll, onFocusPin }:
  { pins: UserMapPin[]; onRemovePin: (id:string)=>void; onClearAll: ()=>void; onFocusPin?: (p:UserMapPin)=>void }) {

  const dist = chart(pins);
  const max  = dist[0]?.[1] ?? 1;
  const critical = pins.filter(p => p.severity === "Critical").length;
  const highRisk = pins.filter(p => p.weather?.riskLevel === "High").length;

  return (
    <aside className="flex h-full flex-col overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
      {/* Header */}
      <div className="flex-shrink-0 border-b border-slate-100 px-4 py-3.5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <ClipboardList className="h-4 w-4 text-green-600" />
            <span className="text-sm font-semibold text-slate-800">Field Reports</span>
            <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-500">{pins.length}</span>
          </div>
          {pins.length > 0 && (
            <button onClick={onClearAll} className="rounded p-1 text-slate-300 hover:bg-red-50 hover:text-red-400 transition-colors">
              <Trash2 className="h-3.5 w-3.5" />
            </button>
          )}
        </div>
        {(critical > 0 || highRisk > 0) && (
          <div className="mt-2 flex gap-2">
            {critical > 0 && <span className="flex items-center gap-1 rounded-full bg-red-50 border border-red-200 px-2 py-0.5 text-xs text-red-600"><AlertTriangle className="h-3 w-3" />{critical} critical</span>}
            {highRisk  > 0 && <span className="flex items-center gap-1 rounded-full bg-amber-50 border border-amber-200 px-2 py-0.5 text-xs text-amber-600"><Droplets className="h-3 w-3" />{highRisk} high risk</span>}
          </div>
        )}
      </div>

      {/* Empty state */}
      {pins.length === 0 && (
        <div className="flex flex-1 flex-col items-center justify-center gap-3 p-8 text-center">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-slate-100">
            <MapPin className="h-5 w-5 text-slate-300" />
          </div>
          <p className="text-sm font-medium text-slate-500">No field reports yet</p>
          <p className="text-xs text-slate-400 leading-relaxed">
            Click &quot;Add Report&quot; then click the map to record a disease observation.
          </p>
        </div>
      )}

      {/* Distribution mini-chart */}
      {dist.length > 0 && (
        <div className="flex-shrink-0 border-b border-slate-100 px-4 py-3">
          <p className="mb-2 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-slate-400">
            <BarChart2 className="h-3 w-3" /> Top Diseases
          </p>
          <div className="space-y-1.5">
            {dist.map(([disease, count]) => (
              <div key={disease} className="flex items-center gap-2">
                <p className="w-24 shrink-0 truncate text-xs text-slate-500" title={disease}>{disease}</p>
                <div className="flex-1 overflow-hidden rounded-full bg-slate-100 h-1.5">
                  <div className="h-full rounded-full bg-green-500 transition-all" style={{ width: `${(count/max)*100}%` }} />
                </div>
                <span className="w-4 text-right text-xs text-slate-400">{count}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Pin list */}
      <div className="flex-1 divide-y divide-slate-50 overflow-y-auto">
        {pins.map(pin => (
          <div key={pin.id} className="group cursor-pointer px-4 py-3 hover:bg-slate-50 transition-colors" onClick={() => onFocusPin?.(pin)}>
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <p className="text-sm font-semibold text-slate-800 truncate">{pin.disease}</p>
                  <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${SEV[pin.severity]}`}>{pin.severity}</span>
                </div>
                <div className="mt-0.5 flex items-center gap-1.5 text-xs text-slate-400">
                  <span>{pin.crop}</span>
                  <span>·</span>
                  <span>{date(pin.createdAt)}</span>
                </div>
                {pin.weather && (
                  <div className="mt-1 flex items-center gap-2.5 text-[10px] text-slate-400">
                    <span className="flex items-center gap-0.5"><Thermometer className="h-2.5 w-2.5 text-orange-400" />{pin.weather.temperature}°C</span>
                    <span className="flex items-center gap-0.5"><Droplets className="h-2.5 w-2.5 text-sky-400" />{pin.weather.humidity}%</span>
                    <span className={pin.weather.riskLevel === "High" ? "text-red-500 font-medium" : pin.weather.riskLevel === "Moderate" ? "text-amber-500 font-medium" : "text-green-600 font-medium"}>
                      {pin.weather.riskLevel} spread risk
                    </span>
                  </div>
                )}
                {pin.notes && <p className="mt-1 text-xs text-slate-400 line-clamp-1">{pin.notes}</p>}
                <p className="mt-0.5 text-[10px] font-mono text-slate-300">Click to center map</p>
              </div>
              <button onClick={e => { e.stopPropagation(); onRemovePin(pin.id); }}
                className="shrink-0 rounded p-1 text-slate-300 opacity-0 group-hover:opacity-100 hover:bg-red-50 hover:text-red-400 transition-all">
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>
        ))}
      </div>
    </aside>
  );
}
