"use client";

import { useState } from "react";
import Link from "next/link";
import {
  AlertTriangle,
  ArrowLeft,
  CheckCircle2,
  FileText,
  Leaf,
  Loader2,
  Map as MapIcon,
  MapPin,
  Plane,
  UploadCloud,
  Video,
} from "lucide-react";
import { Nav } from "@/components/nav";
import { BoundingBoxView } from "@/components/bounding-box-view";
import type { Detection } from "@/lib/types";

const apiBase = process.env.NEXT_PUBLIC_API_URL ?? "http://127.0.0.1:8000";

type GeotaggedDetection = {
  timestamp: number;
  lat: number;
  lng: number;
  alt: number | null;
  disease: string;
  confidence: number;
  severity: string | null;
  decisionAccepted: boolean | null;
};

type SurveyFrame = {
  timestamp: number;
  imageData: string;
  width: number;
  height: number;
  predictions: Detection[];
  lat: number | null;
  lng: number | null;
};

type SurveyResult = {
  id: string;
  crop: string;
  frames: SurveyFrame[];
  geotaggedDetections: GeotaggedDetection[];
  fieldDetectionsSaved: number;
  providerStatuses: { name: string; status: string; detail?: string }[];
};

export default function DroneSurveyPage() {
  const [videoFile, setVideoFile] = useState<File | null>(null);
  const [srtFile, setSrtFile] = useState<File | null>(null);
  const [crop, setCrop] = useState("Cassava");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<SurveyResult | null>(null);
  const [selectedFrame, setSelectedFrame] = useState(0);

  async function responseError(r: Response) {
    try {
      const p = await r.json();
      if (typeof p?.detail === "string") return p.detail;
      return JSON.stringify(p);
    } catch {
      return await r.text();
    }
  }

  async function submit() {
    if (!videoFile || !srtFile) {
      setError("Both the flight video and its .SRT telemetry file are required.");
      return;
    }
    setBusy(true);
    setError(null);
    setResult(null);
    try {
      const fd = new FormData();
      fd.append("file", videoFile);
      fd.append("srt", srtFile);
      fd.append("crop", crop);
      const r = await fetch(`${apiBase}/analyze-drone-survey`, { method: "POST", body: fd });
      if (!r.ok) throw new Error(await responseError(r));
      setResult(await r.json());
      setSelectedFrame(0);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Survey analysis failed.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="min-h-screen bg-slate-50">
      <Nav />
      <div className="mx-auto max-w-4xl px-6 py-10">
        <Link href="/drone" className="mb-4 inline-flex items-center gap-1.5 text-xs text-slate-400 hover:text-slate-600 transition-colors">
          <ArrowLeft className="h-3.5 w-3.5" /> Back to live drone monitor
        </Link>

        <div className="mb-8 flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-600 shadow-sm">
            <Plane className="h-5 w-5 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Drone Field Survey</h1>
            <p className="text-sm text-slate-500">Upload a completed flight video + GPS telemetry — Cassava AI classifies every sampled frame and every disease detection is automatically saved to the field database with its coordinates</p>
          </div>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <p className="mb-4 text-xs font-semibold uppercase tracking-wider text-slate-400">Flight Files</p>

          <div className="grid gap-4 sm:grid-cols-2">
            <label className="flex cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed border-emerald-200 bg-emerald-50 p-6 text-center transition-colors hover:bg-emerald-100">
              <Video className="h-6 w-6 text-emerald-500" />
              <span className="text-sm font-medium text-slate-800">{videoFile ? videoFile.name : "Flight video (MP4/MOV)"}</span>
              <span className="text-xs text-slate-400">Exported directly from the drone/app</span>
              <input
                type="file"
                accept="video/*"
                className="sr-only"
                onChange={(e) => setVideoFile(e.target.files?.[0] ?? null)}
              />
            </label>

            <label className="flex cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed border-sky-200 bg-sky-50 p-6 text-center transition-colors hover:bg-sky-100">
              <FileText className="h-6 w-6 text-sky-500" />
              <span className="text-sm font-medium text-slate-800">{srtFile ? srtFile.name : "GPS telemetry (.SRT)"}</span>
              <span className="text-xs text-slate-400">DJI exports this alongside the video file</span>
              <input
                type="file"
                accept=".srt,text/plain"
                className="sr-only"
                onChange={(e) => setSrtFile(e.target.files?.[0] ?? null)}
              />
            </label>
          </div>

          <label className="mt-4 block">
            <span className="mb-1 block text-xs font-medium text-slate-500">Crop</span>
            <input
              value={crop}
              onChange={(e) => setCrop(e.target.value)}
              className="w-full max-w-xs rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-800 outline-none focus:border-emerald-400 focus:ring-2 focus:ring-emerald-100"
              placeholder="Cassava"
            />
          </label>

          <button
            onClick={() => void submit()}
            disabled={busy || !videoFile || !srtFile}
            className="mt-5 flex w-full items-center justify-center gap-2 rounded-lg bg-emerald-600 px-4 py-3 text-sm font-semibold text-white transition-colors hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-40"
          >
            {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <UploadCloud className="h-4 w-4" />}
            {busy ? "Analyzing flight…" : "Analyze Survey"}
          </button>

          <p className="mt-3 flex items-start gap-1.5 text-xs text-slate-400">
            <MapPin className="mt-0.5 h-3.5 w-3.5 shrink-0" />
            Frames are sampled ~1/sec and classified locally by Cassava AI. Each detection's location comes from the
            nearest GPS timestamp in the .SRT file — this is offline, no cloud provider is used.
          </p>

          {error && (
            <div className="mt-4 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</div>
          )}
        </div>

        {result && (
          <div className="mt-6 space-y-5">
            <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
              <div className="mb-3 flex items-center justify-between">
                <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">Survey Results</p>
                <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-semibold text-slate-600">
                  {result.frames.length} frame(s) sampled
                </span>
              </div>

              {result.providerStatuses?.map((s) => (
                <div key={s.name} className="mb-1.5 flex items-center gap-2 text-xs text-slate-500">
                  <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />
                  <span className="font-medium text-slate-700">{s.name}:</span> {s.detail}
                </div>
              ))}

              {result.frames.length > 0 && (
                <div className="mt-4">
                  <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-slate-400">
                    Frame Preview — plant detection box
                  </p>
                  <BoundingBoxView
                    src={result.frames[selectedFrame]?.imageData}
                    width={result.frames[selectedFrame]?.width || 1}
                    height={result.frames[selectedFrame]?.height || 1}
                    predictions={result.frames[selectedFrame]?.predictions ?? []}
                  />
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    {result.frames.map((frame, i) => {
                      const disease = frame.predictions[0]?.disease;
                      const isHealthy = !disease || disease.toLowerCase() === "healthy";
                      return (
                        <button
                          key={frame.timestamp}
                          onClick={() => setSelectedFrame(i)}
                          className={`rounded-md px-2 py-1 text-[11px] font-medium transition-colors ${
                            i === selectedFrame
                              ? "bg-emerald-600 text-white"
                              : isHealthy
                                ? "bg-slate-100 text-slate-500 hover:bg-slate-200"
                                : "bg-amber-100 text-amber-800 hover:bg-amber-200"
                          }`}
                        >
                          t={frame.timestamp}s
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {result.geotaggedDetections.length === 0 ? (
                <div className="mt-4 flex items-center gap-2 rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-800">
                  <Leaf className="h-4 w-4" /> No diseased frames detected across this flight — all sampled frames classified Healthy.
                </div>
              ) : (
                <>
                  <div className="mt-4 max-h-80 overflow-y-auto rounded-lg border border-slate-100">
                    <table className="w-full text-left text-xs">
                      <thead className="sticky top-0 bg-slate-50 text-slate-500">
                        <tr>
                          <th className="px-3 py-2">t (s)</th>
                          <th className="px-3 py-2">Disease</th>
                          <th className="px-3 py-2">Confidence</th>
                          <th className="px-3 py-2">Severity</th>
                          <th className="px-3 py-2">Lat, Lng</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {result.geotaggedDetections.map((d, i) => (
                          <tr key={i} className="text-slate-700">
                            <td className="px-3 py-2">{d.timestamp}</td>
                            <td className="px-3 py-2 font-medium">{d.disease}</td>
                            <td className="px-3 py-2">{(d.confidence * 100).toFixed(1)}%</td>
                            <td className="px-3 py-2">{d.severity ?? "—"}</td>
                            <td className="px-3 py-2 font-mono">{d.lat.toFixed(5)}, {d.lng.toFixed(5)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  <div className="mt-4 flex items-center gap-2 rounded-lg border border-sky-200 bg-sky-50 px-4 py-3 text-sm font-semibold text-sky-800">
                    <CheckCircle2 className="h-4 w-4 shrink-0" />
                    {result.fieldDetectionsSaved} detection(s) automatically saved to the field database
                  </div>
                  <Link href="/map" className="mt-2 flex items-center justify-center gap-1.5 rounded-lg border border-slate-200 bg-white px-4 py-2.5 text-xs font-medium text-sky-700 transition-colors hover:bg-sky-50">
                    <MapIcon className="h-3.5 w-3.5" /> View on Disease Outbreak Map →
                  </Link>
                </>
              )}
            </div>

            <div className="flex items-start gap-2 rounded-xl border border-amber-200 bg-amber-50 p-4 text-xs text-amber-800">
              <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
              Each point's location is a nearest-timestamp match against the .SRT GPS track, not a per-pixel geolocation
              of the diseased leaf within the frame. Treat placement as field-area-accurate, not plant-accurate.
            </div>
          </div>
        )}
      </div>
    </main>
  );
}
