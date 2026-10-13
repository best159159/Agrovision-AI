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
  FileImage,
  Leaf,
  LocateFixed,
  Loader2,
  MapPin,
  ScanLine,
  UploadCloud,
  Wifi,
  WifiOff,
} from "lucide-react";
import { Nav } from "@/components/nav";
import { saveLatestResult } from "@/lib/result-storage";
import type { EnvironmentContext } from "@/lib/types";
import Link from "next/link";

const apiBase = process.env.NEXT_PUBLIC_API_URL ?? "http://127.0.0.1:8000";

type RuntimeConfig = {
  cassava: boolean;
  cassavaError: string | null;
  cassavaClassCount: number;
  cassavaStatus: string;
  maxImageMb: number;
  maxVideoMb: number;
  maxVideoFrames: number;
  storeFeedbackImages: boolean;
};

export default function OfflineScanPage() {
  const router = useRouter();
  const videoRef = useRef<HTMLVideoElement>(null);
  const cameraStreamRef = useRef<MediaStream | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [camOn, setCamOn] = useState(false);
  const [lat, setLat] = useState("");
  const [lng, setLng] = useState("");
  const [checkingWeather, setCheckingWeather] = useState(false);
  const [weather, setWeather] = useState<EnvironmentContext | null>(null);
  const [localizeBoxes, setLocalizeBoxes] = useState(false);
  const [cfg, setCfg] = useState<RuntimeConfig>({
    cassava: false,
    cassavaError: null,
    cassavaClassCount: 0,
    cassavaStatus: "pending",
    maxImageMb: 15,
    maxVideoMb: 150,
    maxVideoFrames: 120,
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
          cassava: !!d.cassava_model_available,
          cassavaError: d.cassava_model_error ? String(d.cassava_model_error) : null,
          cassavaClassCount: Number(d.cassava_model_class_count ?? 0),
          cassavaStatus: String(d.cassava_model_status ?? "unknown"),
          maxImageMb: Number(d.max_image_upload_mb ?? 15),
          maxVideoMb: Number(d.max_video_upload_mb ?? 150),
          maxVideoFrames: Number(d.max_video_frames ?? 120),
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

  const modelLoading = cfg.cassavaStatus === "loading" || cfg.cassavaStatus === "pending";
  const canAnalyze = cfg.cassava;

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
      if (!canAnalyze) throw new Error(cfg.cassavaError ?? "Cassava AI model is not available.");
      if (isVideo && file.size > cfg.maxVideoMb * 1024 * 1024)
        throw new Error(`Video is too large. The backend limit is ${cfg.maxVideoMb} MB.`);
      if (!isVideo && file.size > cfg.maxImageMb * 1024 * 1024)
        throw new Error(`Image is too large. The backend limit is ${cfg.maxImageMb} MB.`);
      const fd = new FormData();
      fd.append("file", file);
      fd.append("crop", "Cassava");
      if (lat.trim()) fd.append("lat", lat.trim());
      if (lng.trim()) fd.append("lng", lng.trim());
      const endpoint = isVideo
        ? localizeBoxes
          ? "analyze-cassava-video-localized"
          : "analyze-cassava-video"
        : localizeBoxes
          ? "analyze-cassava-localized"
          : "analyze-cassava";
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
      if (!canAnalyze) throw new Error(cfg.cassavaError ?? "Cassava AI model is not available.");
      const fd = new FormData();
      fd.append("file", blob, "frame.jpg");
      fd.append("crop", "Cassava");
      if (lat.trim()) fd.append("lat", lat.trim());
      if (lng.trim()) fd.append("lng", lng.trim());
      const endpoint = localizeBoxes ? "analyze-cassava-localized" : "analyze-cassava";
      const r = await fetch(`${apiBase}/${endpoint}`, { method: "POST", body: fd });
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

  const statusColor = canAnalyze ? "text-green-700 bg-green-100" : modelLoading ? "text-amber-700 bg-amber-100" : "text-red-600 bg-red-50";
  const statusLabel = modelLoading ? "Warming model…" : canAnalyze ? "Ready" : "No model";

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
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-600 shadow-sm">
              <WifiOff className="h-5 w-5 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-slate-900">Offline Scan</h1>
              <p className="text-sm text-slate-500">Cassava AI — runs entirely on this device, no internet required</p>
            </div>
            <span className={`ml-auto rounded-full px-3 py-1 text-xs font-semibold ${statusColor}`}>
              {statusLabel}
            </span>
          </div>
        </div>

        <div className="grid gap-6 lg:grid-cols-[1fr_340px]">
          {/* Left column */}
          <div className="space-y-5">

            {/* Model status card */}
            <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
              <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-slate-400">AI Sources</p>
              <div className="space-y-2">
                {[
                  {
                    icon: Cpu,
                    name: "Cassava AI (offline)",
                    ready: canAnalyze,
                    detail: modelLoading
                      ? "warming model in background…"
                      : canAnalyze
                        ? `${cfg.cassavaClassCount} cassava disease classes · runs locally`
                        : cfg.cassavaError ?? "model file missing",
                  },
                  {
                    icon: Cloud,
                    name: "Open-Meteo Environment",
                    ready: !!weather?.available,
                    detail: weather?.available
                      ? `${weather.current?.temperature.toFixed(1)}°C · ${weather.current?.humidity.toFixed(0)}% humidity`
                      : lat && lng ? "location entered — verify weather" : "add location to enable",
                  },
                ].map(({ icon: Icon, name, ready, detail }) => (
                  <div key={name} className="flex items-center gap-3 rounded-lg border border-slate-100 bg-slate-50 px-4 py-3">
                    <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${ready ? "bg-emerald-50" : "bg-slate-100"}`}>
                      <Icon className={`h-4 w-4 ${ready ? "text-emerald-600" : "text-slate-400"}`} />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium text-slate-800">{name}</p>
                      <p className="truncate text-xs text-slate-400">{detail}</p>
                    </div>
                    {ready
                      ? <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                      : <AlertTriangle className="h-4 w-4 text-amber-400" />}
                  </div>
                ))}
              </div>
              <div className="mt-3 rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-xs text-emerald-800">
                Cassava AI screens leaf images without an internet connection. CBB · CBSD · CGM · CMD · Healthy. Weather is separate environmental context and does not change the diagnosis.
              </div>
              <label className="mt-3 flex items-start gap-2.5 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2.5 text-xs text-slate-600">
                <input
                  type="checkbox"
                  checked={localizeBoxes}
                  onChange={(e) => setLocalizeBoxes(e.target.checked)}
                  disabled={busy}
                  className="mt-0.5 h-3.5 w-3.5 rounded border-slate-300 text-emerald-600 focus:ring-emerald-400"
                />
                <span>
                  <span className="font-medium text-slate-800">Draw a box around the plant</span>
                  <br />
                  YOLO detects the plant (per frame, for video too); Cassava AI still classifies the whole image/frame — same diagnosis, just with a real detection box shown.
                </span>
              </label>
            </div>

            {/* Location */}
            <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
              <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-slate-400">Field Location (optional)</p>
              <div className="grid gap-3 sm:grid-cols-2">
                <label>
                  <span className="mb-1 block text-xs font-medium text-slate-500">Latitude</span>
                  <input value={lat} onChange={(e) => { setLat(e.target.value); setWeather(null); }}
                    className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-800 outline-none focus:border-emerald-400 focus:ring-2 focus:ring-emerald-100"
                    placeholder="13.7563" />
                </label>
                <label>
                  <span className="mb-1 block text-xs font-medium text-slate-500">Longitude</span>
                  <input value={lng} onChange={(e) => { setLng(e.target.value); setWeather(null); }}
                    className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-800 outline-none focus:border-emerald-400 focus:ring-2 focus:ring-emerald-100"
                    placeholder="100.5018" />
                </label>
              </div>
              <div className="mt-3 flex flex-wrap gap-2">
                <button type="button" onClick={useCurrentLocation}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-medium text-slate-600 transition-colors hover:bg-slate-50">
                  <LocateFixed className="h-3.5 w-3.5 text-emerald-600" /> Use current location
                </button>
                <button type="button" onClick={() => void checkWeather()} disabled={!lat || !lng || checkingWeather}
                  className="inline-flex items-center gap-1.5 rounded-lg bg-slate-900 px-3 py-2 text-xs font-medium text-white transition hover:bg-slate-700 disabled:cursor-not-allowed disabled:opacity-40">
                  {checkingWeather ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Cloud className="h-3.5 w-3.5" />}
                  Check Open-Meteo
                </button>
              </div>
              {weather?.available && weather.current && (
                <div className="mt-3 grid grid-cols-2 gap-2 rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-xs text-emerald-900 sm:grid-cols-4">
                  <span><strong>{weather.current.temperature.toFixed(1)}°C</strong><br />Temperature</span>
                  <span><strong>{weather.current.humidity.toFixed(0)}%</strong><br />Humidity</span>
                  <span><strong>{weather.forecast?.rainTotal7d ?? 0} mm</strong><br />Rain · 7 days</span>
                  <span><strong>{weather.soil?.moisture0To1cm?.toFixed(2) ?? "--"}</strong><br />Soil moisture</span>
                </div>
              )}
              <p className="mt-2 flex items-start gap-1.5 text-xs text-slate-400">
                <MapPin className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                Optional — enables weather forecast, soil moisture, and environment-adjusted disease risk.
              </p>
            </div>

            {/* Upload zone */}
            <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
              <label className={`flex min-h-52 cursor-pointer flex-col items-center justify-center p-8 text-center transition-colors ${busy ? "" : "hover:bg-slate-50"}`}>
                {busy ? (
                  <div className="flex flex-col items-center gap-3">
                    <Loader2 className="h-10 w-10 animate-spin text-emerald-500" />
                    <p className="text-sm font-medium text-slate-600">Analyzing…</p>
                    <p className="text-xs text-slate-400">Running Cassava AI on-device</p>
                  </div>
                ) : (
                  <>
                    <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl border-2 border-dashed border-emerald-200 bg-emerald-50">
                      <UploadCloud className="h-7 w-7 text-emerald-500" />
                    </div>
                    <p className="text-base font-semibold text-slate-800">Drop a cassava leaf image or video here</p>
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
                <input className="sr-only" type="file" accept="image/*,video/*" disabled={busy || !canAnalyze}
                  onChange={(e) => { const f = e.target.files?.[0]; if (f) void submit(f); }} />
              </label>
              <div className="grid grid-cols-3 divide-x border-t border-slate-100 text-center">
                {[
                  { icon: FileImage, text: "Cassava image/video" },
                  { icon: Camera, text: "Camera frame" },
                  { icon: ScanLine, text: "Classifier result" },
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
                <button onClick={captureFrame} disabled={busy || !camOn || !canAnalyze}
                  className="flex items-center justify-center gap-1.5 rounded-lg bg-emerald-600 px-3 py-2 text-sm font-medium text-white transition-colors hover:bg-emerald-700 disabled:opacity-40">
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
                  "Capture a clear cassava leaf image (single leaf, good light)",
                  "Cassava AI classifies into CBB, CBSD, CGM, CMD or Healthy",
                  "Optionally add GPS location for weather context and field-map logging",
                  "Any non-Healthy result with a location is auto-saved to the field database",
                  "Confirm or correct results to build a governed research dataset",
                ].map((tip) => (
                  <li key={tip} className="flex items-start gap-2 text-xs text-slate-600">
                    <ChevronRight className="mt-0.5 h-3 w-3 shrink-0 text-emerald-500" />{tip}
                  </li>
                ))}
              </ul>
            </div>

            {/* Video capability */}
            <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4">
              <p className="mb-1 text-xs font-semibold text-emerald-700">Video capability</p>
              <p className="text-xs text-emerald-800">Uploaded videos are sampled into frames (~1/sec, up to {cfg.maxVideoFrames} frames) and each frame is classified locally by Cassava AI — no internet or cloud provider used. If a location is entered, every diseased frame is saved to the field database at that location (the whole clip shares one location here — for per-frame GPS from an actual flight, use Drone Survey instead).</p>
            </div>

            {/* Limitations */}
            <div className="rounded-xl border border-amber-200 bg-amber-50 p-4">
              <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-amber-700">Model Limitations</p>
              <ul className="space-y-1.5">
                {[
                  "Closed-set: always picks 1 of 5 classes, cannot say \"unknown\"",
                  "Video is analyzed as independent sampled frames, not temporal/tracked",
                  "Softmax confidence is uncalibrated; treat as relative ranking",
                ].map((note) => (
                  <li key={note} className="flex items-start gap-1.5 text-xs text-amber-800">
                    <AlertTriangle className="mt-0.5 h-3 w-3 shrink-0" />{note}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
