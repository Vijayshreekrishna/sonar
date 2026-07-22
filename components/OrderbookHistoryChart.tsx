"use client";

import { useEffect, useMemo, useState } from "react";
import { getOrderbookHistory } from "@/lib/api";
import type { OrderbookHistoryPoint } from "@/lib/types";
import { timeAgo } from "@/lib/format";

const WIDTH = 560;
const HEIGHT = 140;
const PAD_X = 8;
const PAD_Y = 10;

export function OrderbookHistoryChart({ apiKey, marketId }: { apiKey: string; marketId: string }) {
  const [result, setResult] = useState<{
    marketId: string;
    points: OrderbookHistoryPoint[];
    error: string | null;
  } | null>(null);
  const [hoverIdx, setHoverIdx] = useState<number | null>(null);
  const [showTable, setShowTable] = useState(false);

  useEffect(() => {
    let cancelled = false;
    getOrderbookHistory(apiKey, marketId, 100)
      .then((points) => {
        if (!cancelled) setResult({ marketId, points, error: null });
      })
      .catch((err) => {
        if (!cancelled) setResult({ marketId, points: [], error: (err as Error).message });
      });
    return () => {
      cancelled = true;
    };
  }, [apiKey, marketId]);

  const current = result?.marketId === marketId ? result : null;
  const points = useMemo(() => current?.points ?? [], [current]);

  const scale = useMemo(() => {
    if (points.length < 2) return null;
    const times = points.map((p) => p.timestamp);
    const prices = points.flatMap((p) => [p.best_bid, p.best_ask]).filter((v) => v > 0);
    if (prices.length === 0) return null;
    const tMin = Math.min(...times);
    const tMax = Math.max(...times);
    const pMin = Math.min(...prices);
    const pMax = Math.max(...prices);
    const pPad = Math.max((pMax - pMin) * 0.15, 0.01);
    const yLo = Math.max(0, pMin - pPad);
    const yHi = Math.min(1, pMax + pPad);
    const x = (t: number) => PAD_X + ((t - tMin) / Math.max(tMax - tMin, 1)) * (WIDTH - PAD_X * 2);
    const y = (v: number) => HEIGHT - PAD_Y - ((v - yLo) / Math.max(yHi - yLo, 0.001)) * (HEIGHT - PAD_Y * 2);
    return { x, y, tMin, tMax };
  }, [points]);

  const linePath = (key: "best_bid" | "best_ask") => {
    if (!scale) return "";
    return points
      .filter((p) => p[key] > 0)
      .map((p, i) => `${i === 0 ? "M" : "L"} ${scale.x(p.timestamp).toFixed(1)} ${scale.y(p[key]).toFixed(1)}`)
      .join(" ");
  };

  function handleMove(e: React.MouseEvent<SVGRectElement>) {
    if (!scale || points.length === 0) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const ratio = (e.clientX - rect.left) / rect.width;
    const t = scale.tMin + ratio * (scale.tMax - scale.tMin);
    let nearest = 0;
    let best = Infinity;
    points.forEach((p, i) => {
      const d = Math.abs(p.timestamp - t);
      if (d < best) {
        best = d;
        nearest = i;
      }
    });
    setHoverIdx(nearest);
  }

  const hovered = hoverIdx != null ? points[hoverIdx] : null;
  const last = points[points.length - 1];

  return (
    <div>
      <div className="flex items-center justify-between">
        <span className="text-xs uppercase tracking-wider text-signal-dim">Order book history</span>
        {points.length > 0 && (
          <button
            onClick={() => setShowTable((v) => !v)}
            className="text-[10px] uppercase tracking-wide text-signal-dim hover:text-signal transition-colors"
          >
            {showTable ? "chart" : "table"}
          </button>
        )}
      </div>

      {!current && <p className="mt-2 text-xs text-signal-dim">Scanning…</p>}
      {current?.error && <p className="mt-2 text-xs text-danger">{current.error}</p>}
      {current && !current.error && points.length < 2 && (
        <p className="mt-2 text-xs text-signal-dim">
          Not enough history yet — orderbook_history keeps a rolling 2-day window.
        </p>
      )}

      {scale && points.length >= 2 && !showTable && (
        <div className="mt-2 relative">
          <div className="flex items-center gap-3 text-[10px] mb-1">
            <span className="flex items-center gap-1 text-cool">
              <span className="h-1.5 w-1.5 rounded-full bg-cool" /> bid
            </span>
            <span className="flex items-center gap-1 text-danger">
              <span className="h-1.5 w-1.5 rounded-full bg-danger" /> ask
            </span>
          </div>
          <svg viewBox={`0 0 ${WIDTH} ${HEIGHT}`} className="w-full h-auto" preserveAspectRatio="none">
            <line x1={PAD_X} y1={HEIGHT / 2} x2={WIDTH - PAD_X} y2={HEIGHT / 2} stroke="var(--line)" strokeWidth={1} />
            <path d={linePath("best_bid")} fill="none" stroke="var(--cool)" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
            <path d={linePath("best_ask")} fill="none" stroke="var(--danger)" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
            {hovered && (
              <line
                x1={scale.x(hovered.timestamp)}
                y1={PAD_Y}
                x2={scale.x(hovered.timestamp)}
                y2={HEIGHT - PAD_Y}
                stroke="var(--signal-dim)"
                strokeWidth={1}
                strokeDasharray="3 3"
              />
            )}
            <rect
              x={0}
              y={0}
              width={WIDTH}
              height={HEIGHT}
              fill="transparent"
              onMouseMove={handleMove}
              onMouseLeave={() => setHoverIdx(null)}
            />
          </svg>
          <div className="flex items-center justify-between text-[10px] text-signal-dim font-mono mt-1">
            <span>{timeAgo(new Date(scale.tMin).toISOString())}</span>
            <span>{timeAgo(new Date(scale.tMax).toISOString())}</span>
          </div>
          {(hovered || last) && (
            <div className="mt-1.5 flex items-center gap-3 text-[11px] font-mono">
              <span className="text-signal-dim">{timeAgo(new Date((hovered ?? last).timestamp).toISOString())}</span>
              <span className="text-cool">bid {(hovered ?? last).best_bid.toFixed(3)}</span>
              <span className="text-danger">ask {(hovered ?? last).best_ask.toFixed(3)}</span>
              <span className="text-signal-dim">spread {(hovered ?? last).spread.toFixed(3)}</span>
            </div>
          )}
        </div>
      )}

      {points.length >= 2 && showTable && (
        <div className="mt-2 divide-y divide-line max-h-56 overflow-y-auto text-[11px] font-mono">
          {[...points].reverse().map((p, i) => (
            <div key={i} className="py-1.5 flex items-center justify-between">
              <span className="text-signal-dim">{timeAgo(new Date(p.timestamp).toISOString())}</span>
              <span className="text-cool">{p.best_bid.toFixed(3)}</span>
              <span className="text-danger">{p.best_ask.toFixed(3)}</span>
              <span className="text-signal-dim">{p.spread.toFixed(3)}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
