"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Activity, AlertTriangle, CheckCircle2, Clock3, Cpu, FileText, Link2, Loader2, Map as MapIcon, MapPin, Plane, Radio, ScanSearch, Square, WifiOff } from "lucide-react";
import NextLink from "next/link";
import { BoundingBoxView } from "@/components/bounding-box-view";
import { Nav } from "@/components/nav";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { Detection, DetectionEvent } from "@/lib/types";

const apiBase = process.env.NEXT_PUBLIC_API_URL ?? "http://127.0.0.1:8000";
const POLL_INTERVAL_MS = 400;

type DroneFrame = {
  stream_id: string;
  connected: boolean;
  error: string | null;
  frame_index: number;
  timestamp: number;
  imageData: string | null;
  width: number;
  height: number;
  predictions: Detection[];
  demoMode: boolean;
  localModelCapability?: string;
  localModelClassDomain?: string;
  recentEvents?: DetectionEvent[];
  savedToMap?: number;
  gpsActive?: boolean;
  gpsPointsLoaded?: number;
};

type SessionStats = {
  framesReceived: number;
  totalDetections: number;
  uniqueTargets: Set<string>;
  startedAt: number;
  totalSavedToMap: number;
};

const PRESET_URLS = [
  { label: "DJI / RTSP", value: "rtsp://192.168.42.1:554/live" },
  { label: "IP camera", value: "rtsp://192.168.1.1:554/stream" },
  { label: "Webcam", value: "0" },
];

export default function DronePage() {
  const [rtspUrl, setRtspUrl] = useState("");
  const [srtFile, setSrtFile] = useState<File | null>(null);
  const [crop, setCrop] = useState("Cassava");
  const [streamId, setStreamId] = useState<string | null>(null);
  const [connecting, setConnecting] = useState(false);
  const [frame, setFrame] = useState<DroneFrame | null>(null);
  const [events, setEvents] = useState<DetectionEvent[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [stats, setStats] = useState<SessionStats | null>(null);
  const [elapsed, setElapsed] = useState(0);
  const [gpsPointsLoaded, setGpsPointsLoaded] = useState(0);
  const [mapSaveToast, setMapSaveToast] = useState(false);
  const streamIdRef = useRef<string | null>(null);
  const lastFrameIndex = useRef(-1);
  const toastTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    streamIdRef.current = streamId;
  }, [streamId]);

  useEffect(() => {
    if (!stats) return;
    const timer = window.setInterval(() => setElapsed(Math.floor((Date.now() - stats.startedAt) / 1000)), 1000);
    return () => window.clearInterval(timer);
  }, [stats]);

  function triggerMapToast() {
    setMapSaveToast(true);
    if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
    toastTimerRef.current = setTimeout(() => setMapSaveToast(false), 5000);
  }

  async function handleConnect() {
    const source = rtspUrl.trim();
    if (!source) return;
    setConnecting(true);
    setError(null);
    setFrame(null);
    setEvents([]);
    setGpsPointsLoaded(0);
    setMapSaveToast(false);
    lastFrameIndex.current = -1;
    try {
      let srtText: string | null = null;
      if (srtFile) {
        srtText = await srtFile.text();
      }

      const response = await fetch(`${apiBase}/drone/connect`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ rtsp_url: source, srt_text: srtText, crop }),
      });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.detail ?? "Could not open stream");
      setStreamId(payload.stream_id);
      setGpsPointsLoaded(payload.gpsPointsLoaded ?? 0);
      setStats({ framesReceived: 0, totalDetections: 0, uniqueTargets: new Set(), startedAt: Date.now(), totalSavedToMap: 0 });
      setElapsed(0);
    } catch (connectError) {
      setError(connectError instanceof Error ? connectError.message : "Connection failed");
    } finally {
      setConnecting(false);
    }
  }

  const handleDisconnect = useCallback(async () => {
    const activeId = streamIdRef.current;
    streamIdRef.current = null;
    setStreamId(null);
    if (activeId) {
      try {
        await fetch(`${apiBase}/drone/stream/${activeId}/stop`, { method: "POST" });
      } catch {}
    }
    setFrame(null);
    setStats(null);
    setElapsed(0);
    lastFrameIndex.current = -1;
  }, []);

  useEffect(() => {
    if (!streamId) return;
    let active = true;
    let timer: ReturnType<typeof setTimeout> | undefined;

    async function poll() {
      try {
        const response = await fetch(`${apiBase}/drone/stream/${streamId}/frame`, { cache: "no-store" });
        if (!response.ok) {
          const payload = await response.json().catch(() => null);
          throw new Error(payload?.detail ?? `Stream request failed (${response.status})`);
        }
        const data: DroneFrame = await response.json();
        if (!active) return;
        if (data.frame_index !== lastFrameIndex.current) {
          lastFrameIndex.current = data.frame_index;
          setFrame(data);
          setEvents(data.recentEvents ?? []);
          setError(data.error);
          setStats((previous) => {
            if (!previous) return previous;
            const uniqueTargets = new Set(previous.uniqueTargets);
            data.predictions.forEach((prediction) => uniqueTargets.add(prediction.disease));
            const newlySaved = data.savedToMap ?? 0;
            if (newlySaved > 0) triggerMapToast();
            return {
              ...previous,
              framesReceived: previous.framesReceived + 1,
              totalDetections: previous.totalDetections + data.predictions.length,
              totalSavedToMap: previous.totalSavedToMap + newlySaved,
              uniqueTargets,
            };
          });
        }
      } catch (pollError) {
        if (active) setError(pollError instanceof Error ? pollError.message : "Stream polling failed");
      } finally {
        if (active) timer = setTimeout(poll, POLL_INTERVAL_MS);
      }
    }

    void poll();
    return () => {
      active = false;
      if (timer) clearTimeout(timer);
    };
  }, [streamId]);

  useEffect(() => () => {
    const activeId = streamIdRef.current;
    if (activeId) void fetch(`${apiBase}/drone/stream/${activeId}/stop`, { method: "POST", keepalive: true });
    if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
  }, []);

  const connected = Boolean(streamId);
  const targetLabel = frame?.localModelClassDomain === "disease" ? "Disease" : "Crop target";
  const gpsActive = (frame?.gpsActive ?? false) || gpsPointsLoaded > 0;

  return (
    <main className="min-h-screen bg-slate-50">
      <Nav />
      <section className="mx-auto max-w-7xl px-6 py-8">
        <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-green-600">Field operations</p>
            <h1 className="mt-2 text-3xl font-bold tracking-tight text-slate-900">Live drone evidence monitor</h1>
            <p className="mt-2 max-w-2xl text-sm text-slate-500">Every new frame is analyzed locally. Detections are timestamped and retained as reviewable evidence.</p>
          </div>
          <div className="flex items-center gap-2">
            <div className={`flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-semibold ${gpsActive ? "border-emerald-200 bg-emerald-50 text-emerald-700" : "border-slate-200 bg-white text-slate-400"}`}>
              <MapPin className="h-3 w-3" />
              {gpsActive ? `GPS · ${frame?.gpsPointsLoaded ?? gpsPointsLoaded} pts` : "No GPS"}
            </div>
            <div className={`flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-semibold ${connected ? "border-green-200 bg-green-50 text-green-700" : "border-slate-200 bg-white text-slate-500"}`}>
              <span className={`h-2 w-2 rounded-full ${connected ? "bg-green-500" : "bg-slate-300"}`} />
              {connected ? "Monitoring" : "Disconnected"}
            </div>
          </div>
        </div>

        {mapSaveToast && (
          <div className="mb-4 flex items-center justify-between gap-3 rounded-xl border border-emerald-300 bg-emerald-50 px-4 py-3 text-sm text-emerald-800 shadow-sm animate-pulse">
            <span className="flex items-center gap-2 font-medium">
              <MapPin className="h-4 w-4 shrink-0 text-emerald-600" />
              📍 Disease detection saved to field map!
            </span>
            <NextLink href="/map" className="whitespace-nowrap rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-emerald-700 transition-colors">
              View on Map →
            </NextLink>
          </div>
        )}

        <NextLink
          href="/drone/survey"
          className="mb-5 flex items-center justify-between gap-3 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm transition-colors hover:bg-emerald-100"
        >
          <span className="flex items-center gap-2 font-medium text-emerald-800">
            <MapPin className="h-4 w-4" /> Have a completed flight instead of a live stream? Upload the video + GPS log to map disease locations across the field.
          </span>
          <span className="whitespace-nowrap text-xs font-semibold text-emerald-700">Go to Drone Survey →</span>
        </NextLink>

        {error && (
          <div role="alert" className="mb-5 flex items-start gap-3 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-800">
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-red-500" /> {error}
          </div>
        )}

        <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_360px]">
          <div className="space-y-6">
            <Card className="overflow-hidden">
              <div className="border-b border-slate-100 px-5 py-4">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <p className="text-sm font-semibold text-slate-900">Live inference</p>
                    <p className="text-xs text-slate-500">{frame ? `${targetLabel} model · frame ${frame.frame_index} · ${frame.timestamp.toFixed(1)}s` : "Waiting for a stream"}</p>
                  </div>
                  {frame?.connected && <span className="flex items-center gap-1.5 text-xs font-medium text-green-700"><CheckCircle2 className="h-3.5 w-3.5" /> Stream healthy</span>}
                </div>
              </div>
              <div className="p-3">
                {frame?.imageData ? (
                  <BoundingBoxView src={frame.imageData} width={frame.width || 1} height={frame.height || 1} predictions={frame.predictions} />
                ) : (
                  <div className="flex aspect-video flex-col items-center justify-center rounded-lg bg-slate-950 text-center">
                    {connecting || connected ? <Loader2 className="mb-3 h-8 w-8 animate-spin text-green-400" /> : <Plane className="mb-3 h-10 w-10 text-slate-600" />}
                    <p className="text-sm text-slate-300">{connecting ? "Opening stream…" : connected ? "Waiting for the first frame…" : "Connect an RTSP stream or local webcam"}</p>
                  </div>
                )}
              </div>
            </Card>

            <Card>
              <CardHeader><CardTitle className="flex items-center gap-2 text-slate-900"><Radio className="h-4 w-4 text-green-600" /> Camera source</CardTitle></CardHeader>
              <CardContent className="space-y-4">
                <div className="flex flex-wrap gap-2">
                  {PRESET_URLS.map((preset) => (
                    <button key={preset.value} type="button" onClick={() => setRtspUrl(preset.value)} disabled={connected} className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs text-slate-600 transition hover:border-green-300 hover:bg-green-50 disabled:opacity-40">
                      {preset.label}
                    </button>
                  ))}
                </div>
                <label className="block">
                  <span className="mb-1.5 block text-xs font-medium text-slate-600">RTSP, HTTP stream, or webcam index</span>
                  <div className="flex flex-col gap-2 sm:flex-row">
                    <input value={rtspUrl} onChange={(event) => setRtspUrl(event.target.value)} onKeyDown={(event) => { if (event.key === "Enter" && !connected) void handleConnect(); }} disabled={connected} placeholder="rtsp://192.168.42.1:554/live" className="min-w-0 flex-1 rounded-lg border border-slate-200 px-3 py-2.5 font-mono text-sm text-slate-800 outline-none focus:border-green-500 focus:ring-2 focus:ring-green-100 disabled:bg-slate-50" />
                    {connected ? (
                      <Button type="button" variant="outline" onClick={() => void handleDisconnect()} className="text-red-600"><Square className="h-4 w-4" /> Stop</Button>
                    ) : (
                      <Button type="button" onClick={() => void handleConnect()} disabled={!rtspUrl.trim() || connecting}>{connecting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Link2 className="h-4 w-4" />} Connect</Button>
                    )}
                  </div>
                </label>

                <div className="rounded-xl border border-sky-100 bg-sky-50 p-4 space-y-3">
                  <p className="text-xs font-semibold text-sky-700 flex items-center gap-1.5"><MapPin className="h-3.5 w-3.5" /> GPS tagging (optional)</p>
                  <p className="text-[11px] text-sky-600">Upload the DJI .SRT telemetry file to geotag every detection — disease pins will appear on the field map live.</p>
                  <label className={`flex cursor-pointer items-center gap-2 rounded-lg border-2 border-dashed px-3 py-2.5 text-xs transition-colors ${srtFile ? "border-emerald-300 bg-emerald-50 text-emerald-700" : "border-sky-200 text-slate-500 hover:bg-sky-100"} ${connected ? "opacity-40 cursor-not-allowed" : ""}`}>
                    <FileText className="h-4 w-4 shrink-0" />
                    <span className="flex-1 truncate">{srtFile ? srtFile.name : "GPS telemetry (.SRT) — drag or click"}</span>
                    {srtFile && (
                      <button type="button" onClick={(e) => { e.preventDefault(); setSrtFile(null); }} className="ml-auto text-slate-400 hover:text-red-500">✕</button>
                    )}
                    <input type="file" accept=".srt,text/plain" className="sr-only" disabled={connected} onChange={(e) => setSrtFile(e.target.files?.[0] ?? null)} />
                  </label>
                  <label className="block">
                    <span className="mb-1 block text-xs text-slate-500">Crop</span>
                    <input value={crop} onChange={(e) => setCrop(e.target.value)} disabled={connected} placeholder="Cassava" className="w-full max-w-xs rounded-lg border border-slate-200 px-3 py-2 text-xs text-slate-700 outline-none focus:border-sky-400 focus:ring-2 focus:ring-sky-100 disabled:bg-slate-50" />
                  </label>
                </div>
              </CardContent>
            </Card>

            {frame && frame.localModelClassDomain === "crop" && (
              <div className="flex items-start gap-3 rounded-xl border border-sky-200 bg-sky-50 p-4 text-sm text-sky-900">
                <Cpu className="mt-0.5 h-4 w-4 shrink-0 text-sky-600" />
                <p><strong>Current model detects crop targets, not disease lesions.</strong> Timestamps and boxes are real, but they identify plants. Install a disease-trained YOLO checkpoint to turn the same pipeline into lesion events.</p>
              </div>
            )}
          </div>

          <aside className="space-y-6">
            <Card>
              <CardHeader><CardTitle className="flex items-center gap-2 text-slate-900"><Activity className="h-4 w-4 text-green-600" /> Session</CardTitle></CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 gap-3">
                  {[
                    ["Frames", stats?.framesReceived ?? "—"],
                    ["Detections", stats?.totalDetections ?? "—"],
                    ["Targets", stats?.uniqueTargets.size ?? "—"],
                    ["Uptime", stats ? `${elapsed}s` : "—"],
                  ].map(([label, value]) => (
                    <div key={label} className="rounded-xl border border-slate-200 bg-slate-50 p-3 text-center">
                      <p className="font-mono text-xl font-semibold text-slate-900">{value}</p>
                      <p className="mt-0.5 text-xs text-slate-500">{label}</p>
                    </div>
                  ))}
                </div>
                {stats && stats.totalSavedToMap > 0 && (
                  <div className="mt-3 flex items-center justify-between rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2">
                    <span className="flex items-center gap-1.5 text-xs font-medium text-emerald-700">
                      <MapPin className="h-3.5 w-3.5" /> {stats.totalSavedToMap} detection(s) saved to map
                    </span>
                    <NextLink href="/map" className="text-xs font-semibold text-emerald-700 hover:underline flex items-center gap-1">
                      <MapIcon className="h-3 w-3" /> View →
                    </NextLink>
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-slate-900"><ScanSearch className="h-4 w-4 text-green-600" /> Detection events <span className="ml-auto rounded-full bg-green-50 px-2 py-0.5 text-xs text-green-700">{events.length}</span></CardTitle>
              </CardHeader>
              <CardContent>
                {events.length ? (
                  <div className="max-h-[520px] space-y-2 overflow-y-auto pr-1">
                    {[...events].reverse().map((event) => (
                      <div key={`${event.frameIndex}-${event.timestamp}`} className="rounded-xl border border-slate-200 p-3">
                        <div className="flex items-center justify-between gap-2">
                          <p className="flex items-center gap-1.5 font-mono text-xs font-semibold text-slate-700"><Clock3 className="h-3.5 w-3.5 text-green-600" /> {event.timestamp.toFixed(1)}s</p>
                          <span className="text-xs font-medium text-slate-500">{(event.maxConfidence * 100).toFixed(0)}%</span>
                        </div>
                        <p className="mt-1 text-sm font-medium text-slate-900">{event.labels.join(", ")}</p>
                        <div className="mt-1 flex items-center justify-between gap-2">
                          <p className="text-[11px] text-slate-400">Frame #{event.frameIndex}</p>
                          {"savedToMap" in event && (event as DetectionEvent & { savedToMap?: number }).savedToMap! > 0 ? (
                            <span className="flex items-center gap-1 rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-semibold text-emerald-700">
                              <MapPin className="h-2.5 w-2.5" /> Saved to map
                            </span>
                          ) : "lat" in event && (event as DetectionEvent & { lat?: number }).lat != null ? (
                            <span className="font-mono text-[10px] text-slate-400">
                              {((event as DetectionEvent & { lat?: number }).lat as number).toFixed(5)}, {((event as DetectionEvent & { lng?: number }).lng as number).toFixed(5)}
                            </span>
                          ) : null}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="py-10 text-center">
                    {connected ? <ScanSearch className="mx-auto mb-3 h-8 w-8 text-slate-300" /> : <WifiOff className="mx-auto mb-3 h-8 w-8 text-slate-300" />}
                    <p className="text-sm text-slate-500">{connected ? `No ${targetLabel.toLowerCase()} events yet` : "Connect a source to begin"}</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </aside>
        </div>
      </section>
    </main>
  );
}
