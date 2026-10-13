import Link from "next/link";
import { ArrowRight, BarChart2, Map, Plane, Radar, Leaf, Shield, Zap, Globe } from "lucide-react";
import { Nav } from "@/components/nav";

export default function Home() {
  return (
    <main className="min-h-screen bg-white">
      <Nav />

      {/* Hero */}
      <section className="mx-auto max-w-5xl px-6 pt-20 pb-16 text-center">
        <div className="mb-4 inline-flex items-center gap-2 rounded-full bg-green-50 border border-green-200 px-3 py-1 text-sm font-medium text-green-700">
          <Leaf className="h-3.5 w-3.5" />
          AI-powered cassava disease intelligence · Offline-first
        </div>
        <h1 className="mt-4 text-5xl font-bold tracking-tight text-slate-900 md:text-6xl">
          Cassava disease screening<br />
          <span className="text-green-600">with explicit uncertainty</span>
        </h1>
        <p className="mx-auto mt-5 max-w-xl text-lg text-slate-500 leading-relaxed">
          An offline-first research platform that separates diagnostic confidence, visible symptom extent, and environmental risk — sending uncertain cases to expert review automatically.
        </p>
        <div className="mt-8 flex flex-wrap justify-center gap-3">
          <Link href="/scan"
            className="inline-flex items-center gap-2 rounded-xl bg-green-600 px-6 py-3 text-base font-semibold text-white hover:bg-green-700 transition-colors shadow-sm">
            <Radar className="h-4 w-4" />
            Start Scanning
            <ArrowRight className="h-4 w-4" />
          </Link>
          <Link href="/about"
            className="inline-flex items-center gap-2 rounded-xl border border-green-200 bg-green-50 px-6 py-3 text-base font-medium text-green-700 hover:bg-green-100 transition-colors">
            Learn how it works
          </Link>
          <Link href="/map"
            className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-6 py-3 text-base font-medium text-slate-700 hover:bg-slate-50 transition-colors">
            <Map className="h-4 w-4" />
            View Disease Map
          </Link>
        </div>
      </section>

      {/* How it works */}
      <section className="border-t border-slate-100 bg-slate-50">
        <div className="mx-auto max-w-5xl px-6 py-16">
          <p className="mb-2 text-center text-xs font-semibold uppercase tracking-widest text-green-600">How it works</p>
          <h2 className="mb-10 text-center text-2xl font-bold text-slate-900">Three steps to an auditable screening result</h2>
          <div className="grid gap-6 md:grid-cols-3">
            {[
              { step: "01", title: "Upload", desc: "Drop a crop photo, video, or use your camera. JPG, PNG, MP4 supported.", icon: Zap },
              { step: "02", title: "Screen", desc: "Report class confidence, image quality, uncertainty, and visible symptom extent as separate evidence.", icon: Shield },
              { step: "03", title: "Review", desc: "Withhold ambiguous cases for expert review and retain governed corrections for future validation.", icon: BarChart2 },
            ].map((s) => (
              <div key={s.step} className="rounded-2xl bg-white p-6 border border-slate-200 shadow-sm">
                <div className="mb-4 flex items-center gap-3">
                  <span className="flex h-8 w-8 items-center justify-center rounded-full bg-green-600 text-sm font-bold text-white">{s.step}</span>
                  <s.icon className="h-5 w-5 text-slate-400" />
                </div>
                <h3 className="mb-1.5 text-lg font-semibold text-slate-900">{s.title}</h3>
                <p className="text-sm leading-relaxed text-slate-500">{s.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Supported crops */}
      <section className="mx-auto max-w-5xl px-6 py-16">
        <p className="mb-2 text-center text-xs font-semibold uppercase tracking-widest text-green-600">Coverage</p>
        <h2 className="mb-2 text-center text-2xl font-bold text-slate-900">Validated disease coverage</h2>
        <p className="mb-8 text-center text-sm text-slate-400">Full disease diagnosis available for Cassava (5 classes). Other crops: crop detection only via YOLO.</p>
        <div className="grid grid-cols-4 gap-3 sm:grid-cols-8">
          {[
            ["🍠","Cassava",true],["🌾","Rice",false],["🎋","Sugarcane",false],["🥭","Mango",false],
            ["🍌","Banana",false],["🌽","Corn",false],["🍅","Tomato",false],["🌾","Wheat",false],
          ].map(([emoji, name, validated]) => (
            <div key={String(name)} className={`flex flex-col items-center rounded-xl border p-3 text-center transition-colors ${
              validated ? "border-green-300 bg-green-50" : "border-slate-200 bg-white hover:border-slate-300"
            }`}>
              <span className="mb-1.5 text-2xl">{String(emoji)}</span>
              <span className="text-xs font-medium text-slate-700">{String(name)}</span>
              {validated && <span className="mt-1 text-[9px] font-semibold text-green-600 uppercase tracking-wide">AI Diagnosis</span>}
            </div>
          ))}
        </div>
      </section>

      {/* Features */}
      <section className="border-t border-slate-100 bg-slate-50">
        <div className="mx-auto max-w-5xl px-6 py-16">
          <p className="mb-2 text-center text-xs font-semibold uppercase tracking-widest text-green-600">Capabilities</p>
          <h2 className="mb-8 text-center text-2xl font-bold text-slate-900">Traceable evidence, not automatic authority</h2>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {[
              { icon: Zap,     title: "Local Vision",     desc: "Cassava screening runs offline; YOLO identifies crops but does not diagnose disease." },
              { icon: Globe,   title: "Cloud AI",          desc: "Optional Kindwise crop-health diagnosis when an API key is configured." },
              { icon: Map,     title: "Field Map",         desc: "Click to pin outbreak locations with weather risk data." },
              { icon: Plane,   title: "Drone Evidence",    desc: "Connect an RTSP source and retain timestamped crop-identification events for review." },
            ].map((f) => (
              <div key={f.title} className="rounded-xl border border-slate-200 bg-white p-5 hover:border-green-200 hover:shadow-sm transition-all">
                <div className="mb-3 flex h-9 w-9 items-center justify-center rounded-lg bg-green-50 border border-green-100">
                  <f.icon className="h-4.5 w-4.5 text-green-600" />
                </div>
                <h3 className="mb-1 text-sm font-semibold text-slate-900">{f.title}</h3>
                <p className="text-xs leading-relaxed text-slate-500">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-slate-100 py-8 text-center text-sm text-slate-400">
        AgroVision AI · Evidence-led crop scouting ·{" "}
        <Link href="/scan" className="text-green-600 hover:underline">Start scanning →</Link>
      </footer>
    </main>
  );
}
