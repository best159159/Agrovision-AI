"use client";

import Link from "next/link";
import {
  AlertTriangle,
  BarChart2,
  Brain,
  CheckCircle2,
  Globe,
  Leaf,
  Map,
  Plane,
  Shield,
  Smartphone,
  Zap,
} from "lucide-react";
import { Nav } from "@/components/nav";

const METRICS = [
  { label: "Model Accuracy", value: "58.4%", note: "African test set · improving with retrain", color: "text-amber-600" },
  { label: "Top-2 Accuracy", value: "80.1%", note: "Correct disease in top 2 predictions", color: "text-green-600" },
  { label: "Selective Accuracy", value: "79.7%", note: "When model is confident (37% of cases)", color: "text-green-600" },
  { label: "Model Size", value: "47 MB", note: "EfficientNetV2B0 · runs fully offline", color: "text-sky-600" },
  { label: "TFLite Size", value: "11.8 MB", note: "FP16 quantized for edge devices", color: "text-sky-600" },
  { label: "Inference", value: "<200 ms", note: "Per image on CPU, no internet needed", color: "text-green-600" },
];

const DISEASES = [
  { abbr: "CBB", name: "Cassava Bacterial Blight", color: "bg-red-100 text-red-700 border-red-200" },
  { abbr: "CBSD", name: "Cassava Brown Streak Disease", color: "bg-orange-100 text-orange-700 border-orange-200" },
  { abbr: "CGM", name: "Cassava Green Mottle", color: "bg-yellow-100 text-yellow-700 border-yellow-200" },
  { abbr: "CMD", name: "Cassava Mosaic Disease", color: "bg-purple-100 text-purple-700 border-purple-200" },
  { abbr: "Healthy", name: "Healthy Leaf", color: "bg-green-100 text-green-700 border-green-200" },
];

const INNOVATIONS = [
  {
    icon: Smartphone,
    title: "Offline-First AI",
    desc: "Full disease classification runs with zero internet. Works in remote farmlands with no connectivity. Local TFLite model (11.8 MB) runs on any Android device.",
  },
  {
    icon: Shield,
    title: "Selective Prediction",
    desc: "The model knows when it doesn't know. When confidence is low, it abstains instead of guessing — protecting farmers from false diagnoses.",
  },
  {
    icon: Brain,
    title: "Field Risk Engine",
    desc: "Combines GPS location, weather data (temperature, humidity, rainfall), soil moisture, and disease probability to compute an outbreak risk score with spread forecast.",
  },
  {
    icon: Map,
    title: "Outbreak Mapping",
    desc: "Pin confirmed disease locations on an interactive map. View spatial clusters and risk hotspots across a region to guide coordinated response.",
  },
  {
    icon: Plane,
    title: "Drone Integration",
    desc: "Connect RTSP video streams from agricultural drones. Analyze frames in real-time for crop identification and retain timestamped evidence.",
  },
  {
    icon: Globe,
    title: "PDF Field Reports",
    desc: "Generate structured field reports for agronomists, researchers, or government records — complete with disease probability, risk score, and treatment recommendations.",
  },
];

const LIMITATIONS = [
  "Training data is from East Africa (Uganda/Tanzania). Accuracy on Southeast Asian varieties has not been independently validated.",
  "Bounding boxes on the scan result are estimated using colour thresholding — not neural network localisation.",
  "Model may confuse CMD and CGM (visually similar diseases) with high stated confidence.",
  "Cloud disease diagnosis requires a Kindwise API key (not included).",
];

export default function AboutPage() {
  return (
    <main className="min-h-screen bg-white">
      <Nav />

      {/* Hero */}
      <section className="mx-auto max-w-4xl px-6 pt-16 pb-12 text-center">
        <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-green-200 bg-green-50 px-3 py-1 text-sm font-medium text-green-700">
          <Leaf className="h-3.5 w-3.5" />
          AgroVision AI — Project Overview
        </div>
        <h1 className="mt-3 text-4xl font-bold tracking-tight text-slate-900 md:text-5xl">
          AI-powered cassava disease detection<br />
          <span className="text-green-600">for smallholder farmers</span>
        </h1>
        <p className="mx-auto mt-5 max-w-2xl text-lg leading-relaxed text-slate-500">
          AgroVision AI is an offline-first plant disease intelligence platform designed for
          agricultural regions with limited internet access. It combines on-device deep learning,
          environmental risk modelling, and field mapping to help farmers and agronomists
          identify and respond to cassava disease outbreaks faster.
        </p>
      </section>

      {/* Problem Statement */}
      <section className="border-t border-slate-100 bg-slate-50">
        <div className="mx-auto max-w-4xl px-6 py-14">
          <p className="mb-2 text-center text-xs font-semibold uppercase tracking-widest text-green-600">The Problem</p>
          <h2 className="mb-8 text-center text-2xl font-bold text-slate-900">Why cassava disease is a global food security threat</h2>
          <div className="grid gap-5 md:grid-cols-3">
            {[
              { stat: "800M+", label: "People depend on cassava globally as a primary calorie source" },
              { stat: "Up to 80%", label: "Crop loss in severe cassava disease outbreaks (CMD, CBSD)" },
              { stat: "40–55%", label: "Accuracy of unaided farmer visual diagnosis — worse than random for minority diseases" },
            ].map((s) => (
              <div key={s.stat} className="rounded-2xl border border-slate-200 bg-white p-6 text-center shadow-sm">
                <p className="text-3xl font-bold text-green-600">{s.stat}</p>
                <p className="mt-2 text-sm leading-relaxed text-slate-500">{s.label}</p>
              </div>
            ))}
          </div>
          <p className="mx-auto mt-6 max-w-2xl text-center text-sm leading-relaxed text-slate-500">
            Existing AI solutions are cloud-only, requiring stable internet — which is unavailable in most
            smallholder farming areas in Africa and Southeast Asia. AgroVision AI solves this by running
            the full diagnosis pipeline locally on any device.
          </p>
        </div>
      </section>

      {/* Innovation */}
      <section className="mx-auto max-w-4xl px-6 py-14">
        <p className="mb-2 text-center text-xs font-semibold uppercase tracking-widest text-green-600">Innovation</p>
        <h2 className="mb-8 text-center text-2xl font-bold text-slate-900">What makes AgroVision different</h2>
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {INNOVATIONS.map((item) => (
            <div key={item.title} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm hover:border-green-200 hover:shadow-md transition-all">
              <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-xl bg-green-50 border border-green-100">
                <item.icon className="h-5 w-5 text-green-600" />
              </div>
              <h3 className="mb-1.5 text-sm font-semibold text-slate-900">{item.title}</h3>
              <p className="text-xs leading-relaxed text-slate-500">{item.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Diseases */}
      <section className="border-t border-slate-100 bg-slate-50">
        <div className="mx-auto max-w-4xl px-6 py-14">
          <p className="mb-2 text-center text-xs font-semibold uppercase tracking-widest text-green-600">AI Model</p>
          <h2 className="mb-2 text-center text-2xl font-bold text-slate-900">5-Class Cassava Disease Classifier</h2>
          <p className="mb-8 text-center text-sm text-slate-400">EfficientNetV2B0 · Trained on 21,397 images · Runs fully offline</p>
          <div className="grid gap-3 sm:grid-cols-5">
            {DISEASES.map((d) => (
              <div key={d.abbr} className={`rounded-xl border px-3 py-4 text-center ${d.color}`}>
                <p className="text-lg font-bold">{d.abbr}</p>
                <p className="mt-1 text-[10px] leading-tight">{d.name}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Metrics */}
      <section className="mx-auto max-w-4xl px-6 py-14">
        <p className="mb-2 text-center text-xs font-semibold uppercase tracking-widest text-green-600">Performance</p>
        <h2 className="mb-2 text-center text-2xl font-bold text-slate-900">Model Metrics</h2>
        <p className="mb-8 text-center text-sm text-slate-400">Evaluated on held-out African test set (n=3,210). Geographic validation on Asian varieties pending.</p>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {METRICS.map((m) => (
            <div key={m.label} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <p className={`text-3xl font-bold ${m.color}`}>{m.value}</p>
              <p className="mt-1 text-sm font-semibold text-slate-800">{m.label}</p>
              <p className="mt-0.5 text-xs text-slate-400">{m.note}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Limitations */}
      <section className="border-t border-slate-100 bg-amber-50">
        <div className="mx-auto max-w-4xl px-6 py-12">
          <div className="flex items-center gap-2 mb-4">
            <AlertTriangle className="h-5 w-5 text-amber-600" />
            <h2 className="text-lg font-bold text-slate-900">Known Limitations (Honest Reporting)</h2>
          </div>
          <ul className="space-y-2">
            {LIMITATIONS.map((l) => (
              <li key={l} className="flex items-start gap-2 text-sm text-slate-700">
                <span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-amber-400" />
                {l}
              </li>
            ))}
          </ul>
          <p className="mt-4 text-xs text-slate-400">
            We report limitations transparently as required by responsible AI principles. Full technical details are in{" "}
            <a href="/MODEL_CARD.md" className="underline">MODEL_CARD.md</a> and{" "}
            <a href="/TECHNICAL_VALIDATION.md" className="underline">TECHNICAL_VALIDATION.md</a>.
          </p>
        </div>
      </section>

      {/* How it compares */}
      <section className="mx-auto max-w-4xl px-6 py-14">
        <p className="mb-2 text-center text-xs font-semibold uppercase tracking-widest text-green-600">Comparison</p>
        <h2 className="mb-8 text-center text-2xl font-bold text-slate-900">AgroVision vs. Existing Solutions</h2>
        <div className="overflow-auto rounded-2xl border border-slate-200 shadow-sm">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50">
                <th className="px-4 py-3 text-left font-semibold text-slate-700">Capability</th>
                <th className="px-4 py-3 text-center font-semibold text-green-700">AgroVision AI</th>
                <th className="px-4 py-3 text-center font-semibold text-slate-500">Kindwise API</th>
                <th className="px-4 py-3 text-center font-semibold text-slate-500">Farmer (unaided)</th>
              </tr>
            </thead>
            <tbody>
              {[
                ["Works fully offline", true, false, true],
                ["Uncertainty score (selective prediction)", true, false, false],
                ["Outbreak map & risk forecast", true, false, false],
                ["Drone stream integration", true, false, false],
                ["PDF field report", true, false, false],
                ["Free to operate", true, false, true],
                ["No internet required", true, false, true],
              ].map(([cap, agro, kindwise, farmer]) => (
                <tr key={String(cap)} className="border-b border-slate-100 last:border-0 hover:bg-slate-50">
                  <td className="px-4 py-3 text-slate-700">{String(cap)}</td>
                  {[agro, kindwise, farmer].map((v, i) => (
                    <td key={i} className="px-4 py-3 text-center">
                      {v
                        ? <CheckCircle2 className="mx-auto h-4 w-4 text-green-500" />
                        : <span className="text-slate-300">—</span>}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* CTA */}
      <section className="border-t border-slate-100 bg-green-600">
        <div className="mx-auto max-w-4xl px-6 py-14 text-center">
          <h2 className="text-2xl font-bold text-white">Ready to scan your crop?</h2>
          <p className="mt-2 text-green-100">Works offline · No sign-up · Free to use</p>
          <Link href="/scan"
            className="mt-6 inline-flex items-center gap-2 rounded-xl bg-white px-8 py-3 text-base font-semibold text-green-700 hover:bg-green-50 transition-colors shadow-sm">
            <Zap className="h-4 w-4" />
            Start Scanning Now
          </Link>
        </div>
      </section>

      <footer className="border-t border-slate-100 py-8 text-center text-sm text-slate-400">
        AgroVision AI · {new Date().getFullYear()} ·{" "}
        <Link href="/scan" className="text-green-600 hover:underline">Start scanning →</Link>
      </footer>
    </main>
  );
}
