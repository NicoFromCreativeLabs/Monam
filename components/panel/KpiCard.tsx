"use client";

import Link from "next/link";

// Shared KPI card — used on Panel (Band 1 · Pulso) and as the Nivel 1 / Nivel 2
// building block on every Análisis sub-page. One component, one anatomy, so a
// KPI reads the same everywhere: name + definition, big value, trend vs. a
// comparison period, progress toward an objective with a semaphore, and
// (size="lg" only) an 8-week sparkline. Non-functional beyond the optional
// link — this is a UI-fidelity prototype, not a live rollup.
export type Semaphore = "green" | "yellow" | "red";
export type DeltaTone = "positive" | "negative" | "neutral";

export interface KpiCardProps {
  label: string;
  info: string;
  value: string;
  sub?: string;
  deltaLabel?: string;
  deltaTone?: DeltaTone;
  target?: string;
  progressPct?: number;
  semaphore?: Semaphore;
  sparkline?: number[];
  href?: string;
  size?: "lg" | "sm";
}

const SEMAPHORE_DOT: Record<Semaphore, string> = {
  green: "bg-oliva",
  yellow: "bg-crepe",
  red: "bg-[#b3392f]",
};

const DELTA_TONE_CLASS: Record<DeltaTone, string> = {
  positive: "text-oliva",
  negative: "text-[#b3392f]",
  neutral: "text-ciruela/50",
};

function Sparkline({ data }: { data: number[] }) {
  if (data.length < 2) return null;
  const min = Math.min(...data);
  const max = Math.max(...data);
  const range = max - min || 1;
  const w = 100;
  const h = 28;
  const points = data
    .map((v, i) => {
      const x = (i / (data.length - 1)) * w;
      const y = h - ((v - min) / range) * h;
      return `${x.toFixed(1)},${y.toFixed(1)}`;
    })
    .join(" ");

  return (
    <svg viewBox={`0 0 ${w} ${h}`} className="h-7 w-full text-ciruela/70" preserveAspectRatio="none">
      <polyline
        points={points}
        fill="none"
        stroke="currentColor"
        strokeWidth={1.5}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function KpiCard({
  label,
  info,
  value,
  sub,
  deltaLabel,
  deltaTone = "neutral",
  target,
  progressPct,
  semaphore,
  sparkline,
  href,
  size = "lg",
}: KpiCardProps) {
  const isSm = size === "sm";

  const body = (
    <div
      className={`h-full rounded-[18px] border border-ciruela/10 bg-hueso ${
        isSm ? "px-4 py-4" : "px-6 py-5"
      } ${href ? "transition-colors hover:border-ciruela/25 hover:bg-ciruela/[0.03]" : ""}`}
    >
      <div className="flex items-start justify-between gap-2">
        <p
          className={`flex items-center gap-1.5 font-body uppercase tracking-[0.12em] text-ciruela/50 ${
            isSm ? "text-[10px]" : "text-xs"
          }`}
        >
          {label}
          <span
            title={info}
            aria-label={info}
            className="inline-flex h-3.5 w-3.5 shrink-0 cursor-help items-center justify-center rounded-full border border-ciruela/30 text-[9px] normal-case tracking-normal text-ciruela/50"
          >
            i
          </span>
        </p>
        {semaphore && (
          <span
            aria-label={`Semáforo: ${semaphore}`}
            className={`mt-0.5 h-2.5 w-2.5 shrink-0 rounded-full ${SEMAPHORE_DOT[semaphore]}`}
          />
        )}
      </div>

      <p className={`mt-2 font-display text-ciruela ${isSm ? "text-xl" : "text-3xl"}`}>{value}</p>
      {sub && <p className="mt-0.5 font-body text-xs text-ciruela/50">{sub}</p>}

      {deltaLabel && (
        <p className={`mt-1.5 font-body text-xs ${DELTA_TONE_CLASS[deltaTone]}`}>{deltaLabel}</p>
      )}

      {(target || typeof progressPct === "number") && (
        <div className="mt-3">
          {target && <p className="font-body text-[11px] text-ciruela/50">{target}</p>}
          {typeof progressPct === "number" && (
            <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-ciruela/8">
              <div
                className="h-1.5 rounded-full bg-ciruela"
                style={{ width: `${Math.max(0, Math.min(100, progressPct))}%` }}
              />
            </div>
          )}
        </div>
      )}

      {!isSm && sparkline && sparkline.length > 1 && (
        <div className="mt-3 border-t border-ciruela/8 pt-2">
          <Sparkline data={sparkline} />
        </div>
      )}
    </div>
  );

  if (href) {
    return (
      <Link href={href} className="block h-full">
        {body}
      </Link>
    );
  }
  return body;
}
