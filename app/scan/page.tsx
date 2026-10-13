import Link from "next/link";
import {
  ArrowRight,
  CheckCircle2,
  Cloud,
  Cpu,
  FileVideo,
  Leaf,
  WifiOff,
  Wifi,
  Zap,
} from "lucide-react";
import { Nav } from "@/components/nav";

export default function ScanModePage() {
  return (
    <main className="min-h-screen bg-slate-50">
      <Nav />

      <div className="mx-auto max-w-3xl px-6 py-16">
        {/* Header */}
        <div className="mb-12 text-center">
          <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-green-200 bg-green-50 px-3 py-1 text-sm font-medium text-green-700">
            <Leaf className="h-3.5 w-3.5" />
            AgroVision AI
          </div>
          <h1 className="text-3xl font-bold text-slate-900">Choose scan mode</h1>
          <p className="mx-auto mt-3 max-w-md text-base text-slate-500">
            Select how you want to analyze your crop. Both modes route results to the same dashboard.
          </p>
        </div>

        {/* Mode cards */}
        <div className="grid gap-5 sm:grid-cols-2">

          {/* Offline */}
          <Link
            href="/scan/offline"
            className="group relative flex flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm transition-all hover:-translate-y-0.5 hover:border-emerald-300 hover:shadow-md"
          >
            <div className="h-1.5 w-full bg-emerald-500" />

            <div className="flex flex-1 flex-col p-6">
              <div className="mb-5 flex items-center justify-between">
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-emerald-600 shadow-sm">
                  <WifiOff className="h-6 w-6 text-white" />
                </div>
                <span className="rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-0.5 text-xs font-semibold text-emerald-700">
                  No internet needed
                </span>
              </div>

              <h2 className="mb-2 text-xl font-bold text-slate-900">Offline Mode</h2>
              <p className="mb-5 text-sm leading-relaxed text-slate-500">
                Screens cassava leaf images with the local five-class model. Core diagnosis needs no internet or cloud API key.
              </p>

              <ul className="mb-6 space-y-2">
                {[
                  { icon: Cpu,   text: "Cassava AI — CBB, CBSD, CGM, CMD, Healthy" },
                  { icon: Zap,   text: "Image upload & camera scan" },
                  { icon: Cloud, text: "Optional weather context (Open-Meteo)" },
                ].map(({ icon: Icon, text }) => (
                  <li key={text} className="flex items-center gap-2 text-xs text-slate-600">
                    <Icon className="h-3.5 w-3.5 shrink-0 text-emerald-500" />
                    {text}
                  </li>
                ))}
              </ul>

              <div className="mt-auto flex items-center gap-2 text-sm font-semibold text-emerald-700 transition-all group-hover:gap-3">
                Start offline scan <ArrowRight className="h-4 w-4" />
              </div>
            </div>
          </Link>

          {/* Online */}
          <Link
            href="/scan/online"
            className="group relative flex flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm transition-all hover:-translate-y-0.5 hover:border-sky-300 hover:shadow-md"
          >
            <div className="h-1.5 w-full bg-sky-500" />

            <div className="flex flex-1 flex-col p-6">
              <div className="mb-5 flex items-center justify-between">
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-sky-600 shadow-sm">
                  <Wifi className="h-6 w-6 text-white" />
                </div>
                <span className="rounded-full border border-sky-200 bg-sky-50 px-2.5 py-0.5 text-xs font-semibold text-sky-700">
                  Cloud + Local
                </span>
              </div>

              <h2 className="mb-2 text-xl font-bold text-slate-900">Online Mode</h2>
              <p className="mb-5 text-sm leading-relaxed text-slate-500">
                Combines local models with one configured cloud provider for broader image diagnosis. Video uses local crop detection only.
              </p>

              <ul className="mb-6 space-y-2">
                {[
                  { icon: Cpu,       text: "Local YOLO — crop detection and bounding boxes" },
                  { icon: Cloud,     text: "Kindwise Crop.health — broad image diagnosis" },
                  { icon: FileVideo, text: "Images diagnose disease; videos detect crops" },
                ].map(({ icon: Icon, text }) => (
                  <li key={text} className="flex items-center gap-2 text-xs text-slate-600">
                    <Icon className="h-3.5 w-3.5 shrink-0 text-sky-500" />
                    {text}
                  </li>
                ))}
              </ul>

              <div className="mt-auto flex items-center gap-2 text-sm font-semibold text-sky-700 transition-all group-hover:gap-3">
                Start online scan <ArrowRight className="h-4 w-4" />
              </div>
            </div>
          </Link>
        </div>

        {/* Bottom note */}
        <div className="mt-8 flex flex-wrap items-center justify-center gap-6 text-xs text-slate-400">
          {[
            { icon: CheckCircle2, text: "Both modes send results to the dashboard" },
            { icon: Leaf,         text: "Expert correction loop for both modes" },
            { icon: Cloud,        text: "Weather context available in both modes" },
          ].map(({ icon: Icon, text }) => (
            <span key={text} className="flex items-center gap-1.5">
              <Icon className="h-3.5 w-3.5 text-green-500" /> {text}
            </span>
          ))}
        </div>
      </div>
    </main>
  );
}
