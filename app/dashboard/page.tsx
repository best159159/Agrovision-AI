"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Nav } from "@/components/nav";
import { ResultDashboard } from "@/components/result-dashboard";
import { loadLatestResult } from "@/lib/result-storage";
import type { AnalysisResult } from "@/lib/types";

export default function DashboardPage() {
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    let active = true;
    loadLatestResult()
      .then((stored) => {
        if (active) setResult(stored);
      })
      .finally(() => {
        if (active) setLoaded(true);
      });
    return () => {
      active = false;
    };
  }, []);

  const engineLabel = result?.analysisMode === "hybrid"
    ? "Hybrid AI"
    : result?.analysisMode === "offline" && result.localModelClassDomain === "crop"
      ? "Local crop detector"
      : result?.provider ?? "Offline disease model";

  return (
    <main className="min-h-screen bg-slate-50">
      <Nav />
      <div className="mx-auto max-w-6xl px-6 py-8">
        <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Analysis Results</h1>
            <p className="mt-0.5 text-sm text-slate-500">
              {result ? `${result.mediaType} - ${result.demoMode ? "Demo mode" : engineLabel}` : loaded ? "No scan loaded" : "Loading scan"}
            </p>
          </div>
          <Link
            href="/scan"
            className="inline-flex items-center gap-2 rounded-lg bg-green-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-green-700"
          >
            + New Scan
          </Link>
        </div>

        {result ? (
          <ResultDashboard result={result} />
        ) : !loaded ? (
          <div className="rounded-xl border border-slate-200 bg-white p-12 text-center text-sm text-slate-500 shadow-sm">
            Loading latest scan...
          </div>
        ) : (
          <div className="rounded-xl border border-slate-200 bg-white p-12 text-center shadow-sm">
            <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-100">
              <span className="text-2xl">AI</span>
            </div>
            <h2 className="mb-1 text-base font-semibold text-slate-900">No results yet</h2>
            <p className="mb-5 text-sm text-slate-500">Upload a crop photo or video to get an AI disease diagnosis.</p>
            <Link
              href="/scan"
              className="inline-flex items-center gap-2 rounded-lg bg-green-600 px-5 py-2.5 text-sm font-medium text-white transition-colors hover:bg-green-700"
            >
              Start Scanning
            </Link>
          </div>
        )}
      </div>
    </main>
  );
}
