"use client";

import Image from "next/image";
import type { Detection } from "@/lib/types";

const BOX_COLOR: Record<string, string> = {
  Low: "#16a34a",
  Moderate: "#d97706",
  High: "#ea580c",
  Critical: "#dc2626",
};

type BoundingBoxViewProps = {
  src?: string;
  width: number;
  height: number;
  predictions: Detection[];
};

export function BoundingBoxView({ src, width, height, predictions }: BoundingBoxViewProps) {
  const localized = predictions.filter(
    (prediction) => prediction.localization !== "whole_image" && prediction.localization !== "estimated"
  );
  const classification = predictions.find(
    (prediction) => prediction.localization === "whole_image" || prediction.localization === "estimated",
  );
  const localizedRegions = localized.flatMap((prediction) =>
    (prediction.regions?.length ? prediction.regions : [prediction.box]).map((box, regionIndex) => ({
      prediction,
      box,
      regionIndex,
    })),
  );

  return (
    <div className="relative aspect-video w-full overflow-hidden rounded-lg border border-slate-200 bg-slate-100">
      {src ? (
        <Image src={src} alt="Analyzed plant sample" fill sizes="100vw" unoptimized className="object-contain" />
      ) : (
        <div className="flex h-full items-center justify-center text-sm text-slate-400">No preview available</div>
      )}
      <div className="pointer-events-none absolute inset-0">
        {classification && (
          <div className="absolute left-3 top-3 z-10 max-w-[calc(100%-1.5rem)] rounded-lg border border-white/20 bg-slate-950/80 px-3 py-2 text-white shadow-lg backdrop-blur-sm">
            <p className="text-[10px] font-semibold uppercase tracking-wider text-emerald-300">
              {classification.localization === "estimated"
                ? "Whole-image classification"
                : "Whole-image classification"}
            </p>
            <p className="truncate text-sm font-semibold">
              {classification.label ?? classification.disease} · {(classification.confidence * 100).toFixed(0)}%
            </p>
            {classification.localization === "estimated" && (
              <p className="mt-1 text-[10px] text-amber-300/80">
                ⚠ Dashed boxes = colour-threshold estimate, not AI detection
              </p>
            )}
          </div>
        )}

        {localizedRegions.map(({ prediction, box, regionIndex }, index) => {
          const left = ((box.x - box.width / 2) / width) * 100;
          const top = ((box.y - box.height / 2) / height) * 100;
          const boxWidth = (box.width / width) * 100;
          const boxHeight = (box.height / height) * 100;
          const color = BOX_COLOR[prediction.severity] ?? "#16a34a";
          const label = prediction.label ?? prediction.disease;
          const estimated = prediction.localization === "estimated";
          return (
            <div
              key={`${label}-${regionIndex}-${index}`}
              className="absolute"
              style={{
                left: `${left}%`,
                top: `${top}%`,
                width: `${boxWidth}%`,
                height: `${boxHeight}%`,
                border: `2px ${estimated ? "dashed" : "solid"} ${color}`,
                boxShadow: `0 0 0 1px ${color}30`,
              }}
            >
              {regionIndex === 0 && (
                <span className="absolute left-0 top-0 -translate-y-full whitespace-nowrap rounded-t px-1.5 py-0.5 text-[10px] font-bold text-white" style={{ background: color }}>
                  {estimated ? "Estimated lesion" : label} · {(prediction.confidence * 100).toFixed(0)}%
                </span>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
