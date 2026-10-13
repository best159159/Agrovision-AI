"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  AlertTriangle,
  ArrowLeft,
  Camera,
  CheckCircle2,
  ChevronRight,
  Cloud,
  Cpu,
  FileVideo,
  ImageUp,
  Leaf,
  LocateFixed,
  Loader2,
  MapPin,
  ScanLine,
  UploadCloud,
  Wifi,
} from "lucide-react";
import { Nav } from "@/components/nav";
import { saveLatestResult } from "@/lib/result-storage";
import type { EnvironmentContext } from "@/lib/types";
import Link from "next/link";

const apiBase = process.env.NEXT_PUBLIC_API_URL ?? "http://127.0.0.1:8000";

type RuntimeConfig = {
  kindwise: boolean;
  cassava: boolean;
  model: boolean;
  demo: boolean;
  localModelCapability: string;
  localModelClassCount: number;
  localModelClassDomain: string;
  modelStatus: string;
  maxImageMb: number;
  maxVideoMb: number;
  storeFeedbackImages: boolean;
};

export default function OnlineScanPage() {
  const router = useRouter();
  const videoRef = useRef<HTMLVideoElement>(null);
  const cameraStreamRef = useRef<MediaStream | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [camOn, setCamOn] = useState(false);
  const [crop, setCrop] = useState("Cassava");
  const [lat, setLat] = useState("");
  const [lng, setLng] = useState("");
  const [checkingWeather, setCheckingWeather] = useState(false);
  const [weather, setWeather] = useState<EnvironmentContext | null>(null);
  const [cfg, setCfg] = useState<RuntimeConfig>({
    kindwise: false,
    cassava: false,
    model: false,
    demo: false,
    localModelCapability: "missing",
    localModelClassCount: 0,
    localModelClassDomain: "missing",
    modelStatus: "pending",
    maxImageMb: 15,
    maxVideoMb: 150,
    storeFeedbackImages: false,
  });

  useEffect(() => {
    const controller = new AbortController();
    fetch(`${apiBase}/settings`, { signal: controller.signal })
      .then((r) => {
        if (!r.ok) throw new Error(`Backend settings failed (${r.status})`);
        return r.json();
      })
      .then((d) =>
        setCfg({
          kindwise: !!d.kindwise_configured,
          cassava: !!d.cassava_model_available,
          model: !!d.local_model_available,
          demo: !!d.demo_mode_active,
          localModelCapability: String(d.local_model_capability ?? "missing"),
          localModelClassCount: Number(d.local_model_class_count ?? 0),
          localModelClassDomain: String(d.local_model_class_domain ?? "missing"),
          modelStatus: String(d.local_model_status ?? "unknown"),
          maxImageMb: Number(d.max_image_upload_mb ?? 15),
          maxVideoMb: Number(d.max_video_upload_mb ?? 150),
          storeFeedbackImages: !!d.feedback_image_storage_enabled,
        })
      )
      .catch((err) => {
        if (err instanceof DOMException && err.name === "AbortError") return;
        setError(`Backend is not reachable at ${apiBase}. Start the FastAPI server before scanning.`);
      });
    return () => controller.abort();
  }, []);

  useEffect(() => () => {
    cameraStreamRef.current?.getTracks().forEach((t) => t.stop());
  }, []);

  const hasLocal = cfg.model || cfg.demo;
  const hasCloud = cfg.kindwise;
  const isCassava = crop.trim().toLowerCase() === "cassava";
  const hasDiseaseSource = hasCloud || (isCassava && cfg.cassava);
  const canAnalyzeImage = hasLocal || hasDiseaseSource;
  const canAnalyzeVideo = hasLocal;
  const modelLoading = cfg.modelStatus === "loading" || cfg.modelStatus === "pending";

  const statusLabel = modelLoading ? "Warming model…" : hasDiseaseSource ? "Diagnosis ready" : hasLocal ? "Crop detection only" : "No source";
  const statusColor = hasDiseaseSource ? "text-sky-700 bg-sky-100" : canAnalyzeImage || modelLoading ? "text-amber-700 bg-amber-100" : "text-red-600 bg-red-50";

  async function responseError(r: Response) {
    try {
      const p = await r.json();
      if (typeof p?.detail === "string") return p.detail;
      return JSON.stringify(p);
    } catch {
      return await r.text();
    }
  }

  async function submit(file: File) {
    setBusy(true);
    setError(null);
    const isVideo = file.type.startsWith("video/");
    try {
      if (isVideo && !hasLocal) throw new Error("Video analysis needs the local YOLO model.");
      if (!isVideo && !canAnalyzeImage) throw new Error("Hybrid analysis needs local YOLO or a cloud API key.");
      if (!isVideo && file.size > cfg.maxImageMb * 1024 * 1024)
        throw new Error(`Image is too large. Limit: ${cfg.maxImageMb} MB.`);
      if (isVideo && file.size > cfg.maxVideoMb * 1024 * 1024)
        throw new Error(`Video is too large. Limit: ${cfg.maxVideoMb} MB.`);
      const fd = new FormData();
      fd.append("file", file);
      fd.append("crop", crop);
      if (lat.trim()) fd.append("lat", lat.trim());
      if (lng.trim()) fd.append("lng", lng.trim());
      const endpoint = isVideo ? "analyze-video" : "analyze-hybrid";
      const r = await fetch(`${apiBase}/${endpoint}`, { method: "POST", body: fd });
      if (!r.ok) throw new Error(await responseError(r));
      await saveLatestResult(await r.json());
      router.push("/dashboard");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Analysis failed.");
    } finally {
      setBusy(false);
    }
  }

  async function openCam() {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "environment" } });
      cameraStreamRef.current?.getTracks().forEach((t) => t.stop());
      cameraStreamRef.current = stream;
      if (videoRef.current) videoRef.current.srcObject = stream;
      setCamOn(true);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Camera denied");
    }
  }

  async function captureFrame() {
    const video = videoRef.current;
    if (!video) return;
    const canvas = document.createElement("canvas");
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    canvas.getContext("2d")?.drawImage(video, 0, 0);
    canvas.toBlob(async (blob) => { if (blob) await submitBlob(blob); }, "image/jpeg");
  }

  async function submitBlob(blob: Blob) {
    setBusy(true);
    setError(null);
    try {
      if (!canAnalyzeImage) throw new Error("Hybrid analysis needs local YOLO or a cloud API key.");
      const fd = new FormData();
      fd.append("file", blob, "frame.jpg");
      fd.append("crop", crop);
      if (lat.trim()) fd.append("lat", lat.trim());
      if (lng.trim()) fd.append("lng", lng.trim());
      const r = await fetch(`${apiBase}/analyze-hybrid`, { method: "POST", body: fd });
      if (!r.ok) throw new Error(await responseError(r));
      await saveLatestResult(await r.json());
      router.push("/dashboard");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Camera analysis failed.");
    } finally {
      setBusy(false);
    }
  }

  function useCurrentLocation() {
    if (!navigator.geolocation) { setError("Geolocation is not available."); return; }
    navigator.geolocation.getCurrentPosition(
      (pos) => { setWeather(null); setLat(pos.coords.latitude.toFixed(5)); setLng(pos.coords.longitude.toFixed(5)); },
      (err) => setError(err.message)
    );
  }

  async function checkWeather() {
    const la = Number(lat), lo = Number(lng);
    if (!Number.isFinite(la) || !Number.isFinite(lo)) { setError("Enter a valid latitude and longitude."); return; }
    setCheckingWeather(true); setError(null); setWeather(null);
    try {
      const r = await fetch(`${apiBase}/environment?lat=${encodeURIComponent(la)}&lng=${encodeURIComponent(lo)}`);
      if (!r.ok) throw new Error(await responseError(r));
      setWeather(await r.json());
    } catch (e) {
      setError(e instanceof Error ? e.message : "Open-Meteo request failed.");
    } finally {
      setCheckingWeather(false);
    }
  }

  return (
    <main className="min-h-screen bg-slate-50">
      <Nav />
      <div className="mx-auto max-w-5xl px-6 py-10">

        {/* Header */}
        <div className="mb-8">
          <Link href="/scan" className="mb-4 inline-flex items-center gap-1.5 text-xs text-slate-400 hover:text-slate-600 transition-colors">
            <ArrowLeft className="h-3.5 w-3.5" /> Back to mode selection
          </Link>
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-sky-600 shadow-sm">
              <Wifi className="h-5 w-5 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-slate-900">Online Scan</h1>
              <p className="text-sm text-slate-500">Hybrid AI for broad image diagnosis; video provides local crop detection</p>
            </div>
            <span className={`ml-auto rounded-full px-3 py-1 text-xs font-semibold ${statusColor}`}>
              {statusLabel}
            </span>
          </div>
        </div>

        <div className="grid gap-6 lg:grid-cols-[1fr_340px]">
          {/* Left column */}
          <div className="space-y-5">

            {/* Sources */}
            <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
              <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-slate-400">AI Sources</p>
              <div className="space-y-2">
                {[
                  {
                    icon: Cpu,
                    name: "Local YOLO (offline)",
                    ready: hasLocal,
                    detail: cfg.model
                      ? `${cfg.localModelCapability} · ${cfg.localModelClassCount} classes`
                      : cfg.demo ? "demo mode — no model file" : "model missing",
                  },
                  {
                    icon: Leaf,
                    name: "Cassava AI (local image diagnosis)",
                    ready: cfg.cassava,
                    detail: cfg.cassava ? "used automatically when Crop is Cassava" : "cassava model unavailable",
                  },
                  {
                    icon: Cloud,
                    name: "Cloud disease diagnosis",
                    ready: hasCloud,
                    detail: cfg.kindwise ? "Kindwise Crop.health configured" : "KINDWISE_API_KEY required",
                  },
                  {
                    icon: Leaf,
                    name: "Open-Meteo Environment",
                    ready: !!weather?.available,
                    detail: weather?.available
                      ? `${weather.current?.temperature.toFixed(1)}°C · ${weather.current?.humidity.toFixed(0)}% humidity`
                      : lat && lng ? "location entered — verify weather" : "add location to enable",
                  },
                ].map(({ icon: Icon, name, ready, detail }) => (
                  <div key={name} className="flex items-center gap-3 rounded-lg border border-slate-100 bg-slate-50 px-4 py-3">
                    <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${ready ? "bg-sky-50" : "bg-slate-100"}`}>
                      <Icon className={`h-4 w-4 ${ready ? "text-sky-600" : "text-slate-400"}`} />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium text-slate-800">{name}</p>
                      <p className="truncate text-xs text-slate-400">{detail}</p>
                    </div>
                    {ready
                      ? <CheckCircle2 className="h-4 w-4 text-sky-500" />
                      : <AlertTriangle className="h-4 w-4 text-amber-400" />}
                  </div>
                ))}
              </div>
              <div className="mt-3 rounded-lg border border-sky-200 bg-sky-50 p-3 text-xs text-sky-800">
                Cassava images use Cassava AI locally. One configured cloud provider adds broader disease diagnosis. YOLO supplies crop boxes; video remains crop detection only.
              </div>
            </div>

            {/* No cloud API notice */}
            {!cfg.kindwise && (
              <div className="rounded-xl border border-amber-200 bg-amber-50 p-4">
                <div className="flex items-start gap-3">
                  <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-500" />
                  <div>
                    <p className="text-sm font-semibold text-amber-800">Cloud AI not configured — local model active</p>
                    <p className="mt-1 text-xs text-amber-700 leading-relaxed">
                      Cassava disease diagnosis is running fully offline using the on-device AI model.
                      Cloud diagnosis (Kindwise Crop.health) is optional and requires an API key in{" "}
                      <code className="rounded bg-amber-100 px-1 font-mono text-[10px]">backend/.env</code>.
                    </p>
                    <p className="mt-2 text-xs text-amber-600">
                      ✅ Offline cassava classification · ✅ YOLO crop detection · ❌ Cloud disease API
                    </p>
                  </div>
                </div>
              </div>
            )}


            <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
              <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-slate-400">Field Context</p>
              <div className="grid gap-3 sm:grid-cols-3">
                <label className="sm:col-span-1">
                  <span className="mb-1 block text-xs font-medium text-slate-500">Crop</span>
                  <input value={crop} onChange={(e) => setCrop(e.target.value)}
                    className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-800 outline-none focus:border-sky-400 focus:ring-2 focus:ring-sky-100"
                    placeholder="Cassava" />
                </label>
                <label>
                  <span className="mb-1 block text-xs font-medium text-slate-500">Latitude</span>
                  <input value={lat} onChange={(e) => { setLat(e.target.value); setWeather(null); }}
                    className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-800 outline-none focus:border-sky-400 focus:ring-2 focus:ring-sky-100"
                    placeholder="13.7563" />
                </label>
                <label>
                  <span className="mb-1 block text-xs font-medium text-slate-500">Longitude</span>
                  <input value={lng} onChange={(e) => { setLng(e.target.value); setWeather(null); }}
                    className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-800 outline-none focus:border-sky-400 focus:ring-2 focus:ring-sky-100"
                    placeholder="100.5018" />
                </label>
              </div>
              <div className="mt-3 flex flex-wrap gap-2">
                <button type="button" onClick={useCurrentLocation}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-medium text-slate-600 transition-colors hover:bg-slate-50">
                  <LocateFixed className="h-3.5 w-3.5 text-sky-600" /> Use current location
                </button>
                <button type="button" onClick={() => void checkWeather()} disabled={!lat || !lng || checkingWeather}
                  className="inline-flex items-center gap-1.5 rounded-lg bg-slate-900 px-3 py-2 text-xs font-medium text-white transition hover:bg-slate-700 disabled:cursor-not-allowed disabled:opacity-40">
                  {checkingWeather ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Cloud className="h-3.5 w-3.5" />}
                  Check Open-Meteo
                </button>
              </div>
              {weather?.available && weather.current && (
                <div className="mt-3 grid grid-cols-2 gap-2 rounded-lg border border-sky-200 bg-sky-50 p-3 text-xs text-sky-900 sm:grid-cols-4">
                  <span><strong>{weather.current.temperature.toFixed(1)}°C</strong><br />Temperature</span>
                  <span><strong>{weather.current.humidity.toFixed(0)}%</strong><br />Humidity</span>
                  <span><strong>{weather.forecast?.rainTotal7d ?? 0} mm</strong><br />Rain · 7 days</span>
                  <span><strong>{weather.soil?.moisture0To1cm?.toFixed(2) ?? "--"}</strong><br />Soil moisture</span>
                </div>
              )}
              <p className="mt-2 flex items-start gap-1.5 text-xs text-slate-400">
                <MapPin className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                Location is optional — unlocks weather forecast, soil moisture, and environment-adjusted disease risk.
              </p>
            </div>

            {/* Upload zone */}
            <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
              <label className={`flex min-h-52 cursor-pointer flex-col items-center justify-center p-8 text-center transition-colors ${busy ? "" : "hover:bg-slate-50"}`}>
                {busy ? (
                  <div className="flex flex-col items-center gap-3">
                    <Loader2 className="h-10 w-10 animate-spin text-sky-500" />
                    <p className="text-sm font-medium text-slate-600">Analyzing…</p>
                    <p className="text-xs text-slate-400">Combining every available source</p>
                  </div>
                ) : (
                  <>
                    <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl border-2 border-dashed border-sky-200 bg-sky-50">
                      <UploadCloud className="h-7 w-7 text-sky-500" />
                    </div>
                    <p className="text-base font-semibold text-slate-800">Drop a field image or video here</p>
                    <p className="mt-1.5 text-sm text-slate-400">or click to browse files</p>
                    <div className="mt-4 flex flex-wrap justify-center gap-2">
                      {["JPG", "PNG", "WEBP", "MP4", "MOV"].map((ext) => (
                        <span key={ext} className="rounded-md bg-slate-100 px-2 py-0.5 font-mono text-xs text-slate-500">{ext}</span>
                      ))}
                    </div>
                    <p className="mt-3 text-xs text-slate-400">
                      Limits: {cfg.maxImageMb} MB images · {cfg.maxVideoMb} MB videos
                    </p>
                  </>
                )}
                <input className="sr-only" type="file" accept="image/*,video/*" disabled={busy || !canAnalyzeImage}
                  onChange={(e) => { const f = e.target.files?.[0]; if (f) void submit(f); }} />
              </label>
              <div className="grid grid-cols-3 divide-x border-t border-slate-100 text-center">
                {[
                  { icon: ImageUp, text: "Image hybrid" },
                  { icon: FileVideo, text: "Video frames" },
                  { icon: ScanLine, text: "Merged result" },
                ].map(({ icon: Icon, text }) => (
                  <div key={text} className="flex items-center justify-center gap-1.5 py-2.5 text-xs text-slate-400">
                    <Icon className="h-3.5 w-3.5" />{text}
                  </div>
                ))}
              </div>
            </div>

            {error && <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</div>}
          </div>

          {/* Right column */}
          <div className="space-y-5">

            {/* Camera */}
            <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
              <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-slate-400">Camera Scan</p>
              <div className="relative aspect-video overflow-hidden rounded-lg bg-slate-100">
                <video ref={videoRef} autoPlay playsInline muted className="h-full w-full object-cover" />
                {!camOn && (
                  <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 text-slate-400">
                    <Camera className="h-8 w-8" />
                    <p className="text-xs">Camera inactive</p>
                  </div>
                )}
              </div>
              <div className="mt-3 grid grid-cols-2 gap-2">
                <button onClick={openCam} disabled={busy}
                  className="flex items-center justify-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-50 disabled:opacity-50">
                  <Camera className="h-4 w-4" /> Open Camera
                </button>
                <button onClick={captureFrame} disabled={busy || !camOn || !canAnalyzeImage}
                  className="flex items-center justify-center gap-1.5 rounded-lg bg-sky-600 px-3 py-2 text-sm font-medium text-white transition-colors hover:bg-sky-700 disabled:opacity-40">
                  {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <ScanLine className="h-4 w-4" />}
                  Scan Frame
                </button>
              </div>
            </div>

            {/* Workflow */}
            <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
              <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-slate-400">Workflow</p>
              <ul className="space-y-2">
                {[
                  "Capture image, video, or drone frame from the field",
                  "Cassava AI diagnoses cassava images locally",
                  "Local YOLO detects crops and bounding boxes",
                  "Kindwise Crop.health adds broader image diagnosis when configured",
                  "Results are merged and enriched with weather & soil data",
                  "Confirm or correct results for a governed research dataset",
                ].map((tip) => (
                  <li key={tip} className="flex items-start gap-2 text-xs text-slate-600">
                    <ChevronRight className="mt-0.5 h-3 w-3 shrink-0 text-sky-500" />{tip}
                  </li>
                ))}
              </ul>
            </div>

            {/* Video note */}
            {!canAnalyzeVideo && (
              <div className="rounded-xl border border-amber-200 bg-amber-50 p-4">
                <p className="mb-1 text-xs font-semibold text-amber-700">Video unavailable</p>
                <p className="text-xs text-amber-800">Video analysis requires the local YOLO model (<code className="rounded bg-amber-100 px-1 font-mono text-[10px]">plant-disease.pt</code>) because cloud providers support image input only.</p>
              </div>
            )}
            {canAnalyzeVideo && (
              <div className="rounded-xl border border-sky-200 bg-sky-50 p-4">
                <p className="mb-1 text-xs font-semibold text-sky-700">Video capability</p>
                <p className="text-xs text-sky-800">Uploaded videos are sampled into frames and analyzed by Local YOLO for crop detection and bounding boxes. Cloud disease diagnosis is image-only.</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </main>
  );
}
