"use client";
import { useEffect, useState } from "react";
import { Activity, AlertTriangle, BarChart2, BookOpen, CheckCircle2, ChevronDown, ChevronUp, Cloud, Cpu, FlaskConical, Gauge, Leaf, Save, ShieldAlert, Sprout, Stethoscope } from "lucide-react";
import { Bar, BarChart, CartesianGrid, Cell, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { BoundingBoxView } from "@/components/bounding-box-view";
import { VideoEvidenceTimeline } from "@/components/video-evidence-timeline";
import type { AnalysisResult, Detection } from "@/lib/types";

const CHART_COLORS = ["#16a34a","#0ea5e9","#f59e0b","#8b5cf6","#ef4444","#f97316"];
const apiBase = process.env.NEXT_PUBLIC_API_URL ?? "http://127.0.0.1:8000";

const SEVERITY_BADGE: Record<string,string> = {
  Low:      "badge-low",
  Moderate: "badge-moderate",
  High:     "badge-high",
  Critical: "badge-critical",
  "Not assessed": "border border-slate-200 bg-slate-100 text-slate-600",
};
const SEVERITY_BAR: Record<string,string> = {
  Low:"bg-green-500", Moderate:"bg-yellow-400", High:"bg-orange-400", Critical:"bg-red-500", "Not assessed":"bg-slate-400",
};
const PATHOGEN_PILL: Record<string,string> = {
  fungal:"pill-fungal", bacterial:"pill-bacterial", viral:"pill-viral",
  oomycete:"pill-oomycete", nematode:"pill-nematode", unknown:"pill-unknown",
};

export function ResultDashboard({ result }: { result: AnalysisResult }) {
  const firstFrame = result.frames[0];
  const [selectedTimestamp, setSelectedTimestamp] = useState(firstFrame?.timestamp ?? 0);
  const activeFrame = result.frames.find((frame) => frame.timestamp === selectedTimestamp) ?? firstFrame;
  const preview = activeFrame?.imageData ?? result.previewImage;
  const predictions = activeFrame?.predictions?.length ? activeFrame.predictions : result.predictions;
  const isCropDetector = result.localModelClassDomain === "crop" && !predictions.some((item) => item.diagnosisType === "disease");
  const detectedFrames = result.summary.detectedFrames ?? result.summary.infectedFrames;
  const targetsFound = result.summary.targetsFound ?? result.summary.diseasesFound;
  const evidenceEvents = (result.detectionEvents ?? []).map((event) => ({
    ...event,
    imageData: event.imageData ?? result.frames.find((frame) => frame.timestamp === event.timestamp)?.imageData,
  }));

  const stats = [
    { label: isCropDetector ? "Targets Found" : "Diseases Found", value: (isCropDetector ? targetsFound : result.summary.diseasesFound).length, sub: "unique", icon: Sprout, color: "text-green-600", bg: "bg-green-50 border-green-100" },
    { label: "Top Detection", value: result.summary.highestConfidenceDisease ?? "None", sub: "highest conf.", icon: Gauge, color: "text-sky-600", bg: "bg-sky-50 border-sky-100" },
    { label: isCropDetector ? "Detected Frames" : "Infected Frames", value: isCropDetector ? detectedFrames : result.summary.infectedFrames, sub: isCropDetector ? "with target" : "with disease", icon: Activity, color: "text-amber-600", bg: "bg-amber-50 border-amber-100" },
    { label: isCropDetector ? "Box Coverage" : "Visible Area", value: result.summary.affectedAreaEstimate == null ? "Not assessed" : `${result.summary.affectedAreaEstimate.toFixed(1)}%`, sub: "provisional estimate", icon: AlertTriangle, color: "text-red-500", bg: "bg-red-50 border-red-100" },
  ];

  return (
    <div className="space-y-5">
      {/* Banners */}
      {result.demoMode && (
        <div className="flex items-center gap-3 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          <ShieldAlert className="h-4 w-4 shrink-0 text-amber-500" />
          <span><strong>Demo mode</strong> — no model file found. Place <code className="rounded bg-amber-100 px-1 font-mono text-xs">plant-disease.pt</code> in <code className="rounded bg-amber-100 px-1 font-mono text-xs">backend/models/</code></span>
        </div>
      )}
      {result.analysisMode === "online" && (
        <div className="flex items-center gap-3 rounded-xl border border-sky-200 bg-sky-50 px-4 py-3 text-sm text-sky-800">
          <Cloud className="h-4 w-4 shrink-0 text-sky-500" />
          <span>Analyzed by <strong>{result.provider ?? "Cloud AI"}</strong> — {result.providerUseCase}</span>
        </div>
      )}
      {result.analysisMode === "hybrid" && (
        <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-900">
          <div className="flex items-center gap-3">
            <Cloud className="h-4 w-4 shrink-0 text-emerald-600" />
            <span><strong>Hybrid AI</strong> combines every configured source into one merged diagnosis.</span>
          </div>
          {result.providerStatuses?.length ? (
            <div className="mt-2 flex flex-wrap gap-1.5">
              {result.providerStatuses.map((provider) => (
                <span
                  key={`${provider.name}-${provider.status}`}
                  className={`rounded-full border px-2 py-0.5 text-xs font-medium ${
                    provider.status === "used"
                      ? "border-green-200 bg-white text-green-700"
                      : provider.status === "error"
                        ? "border-red-200 bg-red-50 text-red-700"
                        : "border-slate-200 bg-white text-slate-500"
                  }`}
                  title={provider.detail}
                >
                  {provider.name}: {provider.status}
                </span>
              ))}
            </div>
          ) : null}
        </div>
      )}
      {result.analysisMode === "cassava" && (
        <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-900">
          <div className="flex items-center gap-3">
            <Leaf className="h-4 w-4 shrink-0 text-emerald-600" />
            <span><strong>Cassava research screening.</strong> Closed-set five-class result; use only on cassava leaves and confirm with a qualified expert.</span>
          </div>
          {result.providerStatuses?.length ? (
            <div className="mt-2 flex flex-wrap gap-1.5">
              {result.providerStatuses.map((provider) => (
                <span
                  key={`${provider.name}-${provider.status}`}
                  className={`rounded-full border px-2 py-0.5 text-xs font-medium ${
                    provider.status === "used"
                      ? "border-green-200 bg-white text-green-700"
                      : provider.status === "error"
                        ? "border-red-200 bg-red-50 text-red-700"
                        : "border-slate-200 bg-white text-slate-500"
                  }`}
                  title={provider.detail}
                >
                  {provider.name}: {provider.status}
                </span>
              ))}
            </div>
          ) : null}
        </div>
      )}
      {predictions.some((item) => item.decisionStatus === "review_required") && (
        <div className="rounded-xl border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-900">
          <div className="flex items-start gap-3">
            <ShieldAlert className="mt-0.5 h-4 w-4 shrink-0" />
            <div>
              <strong>Expert review required.</strong> The system abstained from an automatic decision because the image or class probabilities did not meet provisional acceptance criteria.
              <ul className="mt-1 list-disc pl-5 text-xs">
                {predictions.flatMap((item) => item.decisionReasons ?? []).slice(0, 4).map((reason) => <li key={reason}>{reason}</li>)}
              </ul>
            </div>
          </div>
        </div>
      )}
      {isCropDetector && (
        <div className="flex items-center gap-3 rounded-xl border border-sky-200 bg-sky-50 px-4 py-3 text-sm text-sky-800">
          <Cpu className="h-4 w-4 shrink-0 text-sky-500" />
          <span><strong>Local crop detector</strong> - this offline YOLO model identifies crop classes, not plant diseases. Use Kindwise Crop.health for broad disease screening, and use this mode for offline video or drone scouting.</span>
        </div>
      )}
      {result.environment && !result.environment.available && (
        <div className="flex items-start gap-3 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
          <Cloud className="mt-0.5 h-4 w-4 shrink-0 text-red-500" />
          <span><strong>Open-Meteo unavailable:</strong> {result.environment.error ?? "weather request failed"}</span>
        </div>
      )}
      {result.environmentRisk && (
        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">Environmental Risk</p>
              <p className="mt-1 text-2xl font-bold text-slate-900">{result.environmentRisk.score}/100</p>
              <p className="text-sm text-slate-500">{result.environmentRisk.level} spread pressure</p>
            </div>
            {result.environment?.current && (
              <div className="grid grid-cols-2 gap-2 text-xs text-slate-500 sm:grid-cols-4">
                <MetricPill label="Temp" value={`${result.environment.current.temperature.toFixed(1)}C`} />
                <MetricPill label="Humidity" value={`${result.environment.current.humidity.toFixed(0)}%`} />
                <MetricPill label="Rain 7d" value={`${result.environment.forecast?.rainTotal7d ?? 0}mm`} />
                <MetricPill label="Soil" value={formatMaybe(result.environment.soil?.moisture0To1cm)} />
              </div>
            )}
          </div>
          <div className="mt-3 flex flex-wrap gap-1.5">
            {result.environmentRisk.drivers.map((driver) => (
              <span key={driver} className="rounded-full bg-slate-100 px-2 py-0.5 text-xs text-slate-600">{driver}</span>
            ))}
          </div>
        </div>
      )}

      {/* Stats */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {stats.map((s) => (
          <div key={s.label} className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <p className="text-xs text-slate-500">{s.sub}</p>
                <p className="text-xs font-medium text-slate-600">{s.label}</p>
              </div>
              <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border ${s.bg}`}>
                <s.icon className={`h-4 w-4 ${s.color}`} />
              </div>
            </div>
            <p className="mt-2 truncate text-2xl font-bold text-slate-900">{s.value}</p>
          </div>
        ))}
      </div>

      {result.mediaType === "video" && (
        <VideoEvidenceTimeline
          events={evidenceEvents}
          activeTimestamp={activeFrame?.timestamp ?? 0}
          targetLabel={isCropDetector ? "Target" : "Disease"}
          onSelect={(event) => setSelectedTimestamp(event.timestamp)}
        />
      )}

      {/* Preview + diagnoses */}
      <div className="grid gap-5 lg:grid-cols-[3fr_2fr]">
        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <p className="mb-3 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-slate-400">
            <Leaf className="h-3.5 w-3.5 text-green-500" /> {isCropDetector ? "Crop Detection Preview" : "Detection Preview"}
          </p>
          <BoundingBoxView
            src={preview}
            width={result.width || firstFrame?.width || 1}
            height={result.height || firstFrame?.height || 1}
              predictions={predictions}
          />
        </div>

        <div className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden">
          <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
            <p className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-slate-400">
              <Stethoscope className="h-3.5 w-3.5 text-green-500" /> {isCropDetector ? "Local Detections" : "Diagnoses"}
            </p>
            {predictions.length > 0 && (
              <span className="rounded-full bg-green-100 px-2 py-0.5 text-xs font-semibold text-green-700">
                {predictions.length} detected
              </span>
            )}
          </div>
          <div className="max-h-[420px] divide-y divide-slate-50 overflow-y-auto">
            {predictions.length > 0 ? (
              predictions.map((d, i) => (
                <DiseaseCard
                  key={`${d.disease}-${i}`}
                  detection={d}
                  index={i}
                  analysisId={result.id}
                  crop={result.crop}
                    imageData={result.feedbackImageStorageEnabled ? preview : undefined}
                />
              ))
            ) : (
              <div className="flex flex-col items-center py-14 text-center">
                <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-green-50">
                  <Leaf className="h-6 w-6 text-green-400" />
                </div>
                <p className="text-sm font-medium text-slate-600">{isCropDetector ? "No crops detected" : "No diseases detected"}</p>
                <p className="mt-1 text-xs text-slate-400">{isCropDetector ? "Try a clearer crop frame" : "Plant appears healthy"}</p>
              </div>
            )}
          </div>
        </div>
      </div>


      {/* Charts */}
      <div className="grid gap-5 lg:grid-cols-2">
        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <p className="mb-4 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-slate-400">
            <Activity className="h-3.5 w-3.5 text-green-500" /> Detection Timeline
          </p>
          <div className="h-56 min-w-0">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={result.summary.timeline}>
                <CartesianGrid stroke="#f1f5f9" strokeDasharray="3 3" />
                <XAxis dataKey="timestamp" tick={{ fontSize: 11, fill: "#94a3b8" }} tickFormatter={v => `${v}s`} />
                <YAxis tick={{ fontSize: 11, fill: "#94a3b8" }} allowDecimals={false} />
                <Tooltip contentStyle={{ background:"#fff", border:"1px solid #e2e8f0", borderRadius:"8px", fontSize:"12px" }} />
                <Line type="monotone" dataKey="count" stroke="#16a34a" strokeWidth={2} dot={{ fill:"#16a34a", r:3 }} activeDot={{ r:5 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <p className="mb-4 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-slate-400">
            <Gauge className="h-3.5 w-3.5 text-green-500" /> {isCropDetector ? "Confidence by Crop" : "Confidence by Disease"}
          </p>
          <div className="h-56 min-w-0">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={result.summary.distribution}>
                <CartesianGrid stroke="#f1f5f9" strokeDasharray="3 3" />
                <XAxis dataKey="disease" tick={{ fontSize: 9, fill: "#94a3b8" }} />
                <YAxis tick={{ fontSize: 11, fill: "#94a3b8" }} tickFormatter={v => `${Math.round(Number(v)*100)}%`} />
                <Tooltip contentStyle={{ background:"#fff", border:"1px solid #e2e8f0", borderRadius:"8px", fontSize:"12px" }}
                  formatter={v => [`${(Number(v)*100).toFixed(1)}%`,"Avg. Confidence"]} />
                <Bar dataKey="averageConfidence" radius={[4,4,0,0]}>
                  {result.summary.distribution.map((_, i) => <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  );
}


function formatMaybe(value?: number | null) {
  return typeof value === "number" ? value.toFixed(2) : "--";
}

function MetricPill({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2">
      <p className="font-medium text-slate-700">{value}</p>
      <p className="text-[10px] uppercase tracking-wide text-slate-400">{label}</p>
    </div>
  );
}

function DiseaseCard({
  detection: d,
  index,
  analysisId,
  crop,
  imageData,
}: {
  detection: Detection;
  index: number;
  analysisId: string;
  crop?: string | null;
  imageData?: string;
}) {
  const [open, setOpen] = useState(false);
  const [correction, setCorrection] = useState(d.disease);
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState<string | null>(null);
  const hasDetails = d.symptoms || d.treatment || d.prevention;
  const pathKey = (d.pathogenType ?? "unknown").toLowerCase();
  const isCropDetection = d.diagnosisType === "crop";

  return (
    <div className="overflow-hidden">
      <div className="px-5 py-4">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold text-slate-900">{d.label ?? d.disease}</p>
            {d.scientificName && <p className="mt-0.5 text-xs italic text-slate-400">{d.scientificName}</p>}
          </div>
          <span className={`shrink-0 rounded-full px-2.5 py-0.5 text-xs font-semibold ${SEVERITY_BADGE[d.severity] ?? "badge-low"}`}>
            {isCropDetection ? "Crop" : d.severity}
          </span>
        </div>

        <div className="mt-2 flex flex-wrap gap-1.5">
          {d.pathogenType && d.pathogenType !== "unknown" && (
            <span className={`rounded-full px-2 py-0.5 text-xs font-medium capitalize ${PATHOGEN_PILL[pathKey] ?? PATHOGEN_PILL.unknown}`}>
              {d.pathogenType}
            </span>
          )}
          {isCropDetection && (
            <span className="rounded-full bg-sky-100 px-2 py-0.5 text-xs font-medium text-sky-700">local vision</span>
          )}
          {d.sourceModel && (
            <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-medium text-emerald-700">{d.sourceModel}</span>
          )}
          {d.localization === "whole_image" && (
            <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-600">whole-image classification</span>
          )}
          {d.confidenceCalibration === "uncalibrated_softmax" && (
            <span className="rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-800">uncalibrated confidence</span>
          )}
          {d.evidenceCount && d.evidenceCount > 1 && (
            <span className="rounded-full bg-violet-100 px-2 py-0.5 text-xs font-medium text-violet-700">{d.evidenceCount} sources</span>
          )}
          {d.environmentAdjusted && (
            <span className="rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-700">environment adjusted</span>
          )}
          {d.hostCrops?.slice(0,3).map(c => (
            <span key={c} className="rounded-full bg-slate-100 px-2 py-0.5 text-xs text-slate-500">{c}</span>
          ))}
        </div>

        <div className="mt-3">
          <div className="mb-1 flex justify-between text-xs text-slate-400">
            <span>{d.confidenceCalibration === "uncalibrated_softmax" ? "Model confidence (uncalibrated)" : "Confidence"}</span>
            <span className="font-medium text-slate-600">{(d.confidence * 100).toFixed(1)}%</span>
          </div>
          <div className="h-1.5 w-full overflow-hidden rounded-full bg-slate-100">
            <div className={`h-full rounded-full transition-all ${SEVERITY_BAR[d.severity] ?? "bg-green-500"}`}
              style={{ width: `${d.confidence * 100}%` }} />
          </div>
          <p className="mt-1 text-xs text-slate-400">
            {isCropDetection ? "Box coverage" : d.affectedAreaSource === "bounding_box" ? "Affected area" : "Visible symptom area"}: {d.affectedArea == null ? "Not assessed" : `${d.affectedArea.toFixed(1)}%`}
          </p>
          {!isCropDetection && <p className="mt-1 text-[11px] text-slate-400">Severity is based on visible extent only; confidence is diagnostic certainty and is not severity.</p>}
        </div>
        {d.alternatives?.length ? (
          <div className="mt-3 rounded-lg bg-slate-50 px-3 py-2">
            <p className="mb-1 text-[10px] font-semibold uppercase tracking-wide text-slate-400">Other possibilities</p>
            <div className="space-y-1">
              {d.alternatives.slice(0, 3).map((item) => (
                <div key={item.label} className="flex justify-between gap-3 text-xs text-slate-500">
                  <span className="truncate">{item.label}</span>
                  <span className="shrink-0 font-medium text-slate-600">{(item.confidence * 100).toFixed(1)}%</span>
                </div>
              ))}
            </div>
          </div>
        ) : null}
      </div>

      {!isCropDetection && (
        <div className="border-t border-slate-100 bg-white px-5 py-3">
          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={() => saveFeedback(true)}
              disabled={saving}
              className="inline-flex items-center gap-1.5 rounded-lg bg-green-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-green-700 disabled:opacity-50"
            >
              <CheckCircle2 className="h-3.5 w-3.5" />
              Confirm
            </button>
            <input
              value={correction}
              onChange={(event) => setCorrection(event.target.value)}
              className="min-w-0 flex-1 rounded-lg border border-slate-200 px-3 py-1.5 text-xs text-slate-700 outline-none focus:border-green-400"
              placeholder="Correct disease label"
            />
            <button
              onClick={() => saveFeedback(false)}
              disabled={saving || !correction.trim()}
              className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-50 disabled:opacity-50"
            >
              <Save className="h-3.5 w-3.5" />
              Save correction
            </button>
          </div>
          <input
            value={notes}
            onChange={(event) => setNotes(event.target.value)}
            className="mt-2 w-full rounded-lg border border-slate-200 px-3 py-1.5 text-xs text-slate-700 outline-none focus:border-green-400"
            placeholder="Expert notes for future training"
          />
          {saved && <p className="mt-1 text-xs text-green-600">{saved}</p>}
        </div>
      )}

      {hasDetails && (
        <button onClick={() => setOpen(!open)}
          className="flex w-full items-center justify-between border-t border-slate-100 px-5 py-2.5 text-xs text-slate-500 hover:bg-slate-50 transition-colors">
          <span className="flex items-center gap-1.5">
            <FlaskConical className="h-3.5 w-3.5 text-green-500" />
            {open ? "Hide treatment details" : "View treatment & details"}
          </span>
          {open ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
        </button>
      )}

      {open && (
        <div className="border-t border-slate-100 bg-slate-50 p-5 space-y-3 text-xs">
          {d.symptoms && (
            <div>
              <p className="mb-1 flex items-center gap-1 font-semibold text-slate-700"><Stethoscope className="h-3 w-3 text-green-500" /> Symptoms</p>
              <p className="leading-relaxed text-slate-600">{d.symptoms}</p>
            </div>
          )}
          {(d.treatment || d.treatment_chem) && (
            <div className="rounded-r-lg border-l-2 border-sky-400 bg-sky-50 px-3 py-2.5">
              <p className="mb-1 font-semibold text-sky-700">Management options — expert confirmation required</p>
              <p className="leading-relaxed text-slate-600">{d.treatment ?? d.treatment_chem}</p>
              {d.treatment_bio && <p className="mt-1.5 text-slate-500"><span className="font-medium text-green-600">🌱 Biological:</span> {d.treatment_bio}</p>}
            </div>
          )}
          {d.prevention && (
            <div className="rounded-r-lg border-l-2 border-green-400 bg-green-50 px-3 py-2.5">
              <p className="mb-1 font-semibold text-green-700">🛡️ Prevention</p>
              <p className="leading-relaxed text-slate-600">{d.prevention}</p>
            </div>
          )}
          {d.severityProfile && <p className="text-slate-400 italic">⚠ {d.severityProfile}</p>}
          {d.source && <p className="flex items-center gap-1 text-slate-400"><BookOpen className="h-3 w-3" />{d.source}</p>}
        </div>
      )}
    </div>
  );

  async function saveFeedback(confirmed: boolean) {
    setSaving(true);
    setSaved(null);
    try {
      const response = await fetch(`${apiBase}/intelligence/scan-feedback`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          analysis_id: analysisId,
          prediction_index: index,
          original_disease: d.disease,
          confirmed,
          corrected_disease: confirmed ? null : correction.trim(),
          crop,
          confidence: d.confidence,
          severity: d.severity,
          source_model: d.sourceModel,
          image_data: imageData,
          notes: notes.trim() || null,
        }),
      });
      if (!response.ok) throw new Error("Could not save feedback");
      setSaved(confirmed ? "Confirmed for training feedback." : "Correction saved for training feedback.");
    } catch (error) {
      setSaved(error instanceof Error ? error.message : "Could not save feedback");
    } finally {
      setSaving(false);
    }
  }
}
