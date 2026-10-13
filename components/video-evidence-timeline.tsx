"use client";

import Image from "next/image";
import { Clock3, ScanSearch } from "lucide-react";
import type { DetectionEvent } from "@/lib/types";

type VideoEvidenceTimelineProps = {
  events: DetectionEvent[];
  activeTimestamp: number;
  onSelect: (event: DetectionEvent) => void;
  targetLabel: string;
};

export function VideoEvidenceTimeline({ events, activeTimestamp, onSelect, targetLabel }: VideoEvidenceTimelineProps) {
  if (!events.length) {
    return (
      <div className="rounded-xl border border-slate-200 bg-white p-5 text-sm text-slate-500 shadow-sm">
        No {targetLabel.toLowerCase()} events were found in the sampled video frames.
      </div>
    );
  }

  return (
    <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm" aria-labelledby="evidence-timeline-title">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
        <div>
          <p id="evidence-timeline-title" className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-slate-500">
            <ScanSearch className="h-4 w-4 text-green-600" /> Evidence timeline
          </p>
          <p className="mt-1 text-sm text-slate-500">Select an event to inspect the exact sampled frame.</p>
        </div>
        <span className="rounded-full bg-green-50 px-2.5 py-1 text-xs font-semibold text-green-700">
          {events.length} events
        </span>
      </div>
      <div className="flex gap-3 overflow-x-auto pb-2">
        {events.map((event) => {
          const active = event.timestamp === activeTimestamp;
          return (
            <button
              key={`${event.frameIndex}-${event.timestamp}`}
              type="button"
              onClick={() => onSelect(event)}
              className={`min-w-48 overflow-hidden rounded-xl border text-left transition focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 ${
                active ? "border-green-500 bg-green-50 shadow-sm" : "border-slate-200 bg-white hover:border-green-300"
              }`}
            >
              <div className="relative aspect-video bg-slate-100">
                {event.imageData ? (
                  <Image src={event.imageData} alt={`Detection at ${event.timestamp} seconds`} fill unoptimized className="object-cover" />
                ) : (
                  <div className="flex h-full items-center justify-center text-xs text-slate-400">Frame #{event.frameIndex}</div>
                )}
              </div>
              <div className="p-3">
                <p className="flex items-center gap-1.5 font-mono text-xs font-semibold text-slate-700">
                  <Clock3 className="h-3.5 w-3.5 text-green-600" /> {event.timestamp.toFixed(1)}s
                </p>
                <p className="mt-1 truncate text-xs text-slate-500">{event.labels.join(", ")}</p>
                <p className="mt-1 text-[11px] text-slate-400">Top confidence {(event.maxConfidence * 100).toFixed(0)}%</p>
              </div>
            </button>
          );
        })}
      </div>
    </section>
  );
}
