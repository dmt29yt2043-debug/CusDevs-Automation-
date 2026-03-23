"use client";

import { useState, useMemo, useRef, useEffect } from "react";

interface ClickEvent {
  id: string;
  x: number | null;
  y: number | null;
  createdAt: string;
  elementSelector: string | null;
  payloadJson: {
    relativeX?: number;
    relativeY?: number;
    viewportWidth?: number;
    viewportHeight?: number;
  } | null;
}

interface TimelinePhase {
  label: string;
  startTime: string;
  endTime: string;
}

interface ClickMapProps {
  clicks: ClickEvent[];
  testSiteUrl: string;
  sessionStartedAt: string;
  phases?: TimelinePhase[];
}

type HeatmapMode = "dots" | "heatmap";

// Color palette for time-based coloring
const DOT_COLORS = [
  "rgba(59, 130, 246, 0.7)",   // blue - early
  "rgba(16, 185, 129, 0.7)",   // green
  "rgba(245, 158, 11, 0.7)",   // amber
  "rgba(239, 68, 68, 0.7)",    // red - late
];

function getTimeColor(clickTime: number, startTime: number, endTime: number): string {
  const ratio = Math.min(1, Math.max(0, (clickTime - startTime) / (endTime - startTime || 1)));
  const idx = Math.min(DOT_COLORS.length - 1, Math.floor(ratio * DOT_COLORS.length));
  return DOT_COLORS[idx];
}

function formatTimestamp(date: string): string {
  return new Date(date).toLocaleTimeString("en-US", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  });
}

export default function ClickMap({ clicks, testSiteUrl, sessionStartedAt }: ClickMapProps) {
  const [mode, setMode] = useState<HeatmapMode>("dots");
  const [selectedClick, setSelectedClick] = useState<ClickEvent | null>(null);
  const [iframeLoaded, setIframeLoaded] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Filter clicks that have relative coordinates
  const mappableClicks = useMemo(
    () => clicks.filter((c) => c.payloadJson?.relativeX != null && c.payloadJson?.relativeY != null),
    [clicks]
  );

  // All clicks for the list (including those without coords)
  const allClicks = clicks;

  const timeRange = useMemo(() => {
    if (clicks.length === 0) return { start: 0, end: 1 };
    const times = clicks.map((c) => new Date(c.createdAt).getTime());
    return { start: Math.min(...times), end: Math.max(...times) };
  }, [clicks]);

  // Draw heatmap on canvas
  useEffect(() => {
    if (mode !== "heatmap" || !canvasRef.current || !containerRef.current) return;

    const canvas = canvasRef.current;
    const container = containerRef.current;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    canvas.width = container.clientWidth;
    canvas.height = container.clientHeight;
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    for (const click of mappableClicks) {
      const rx = click.payloadJson!.relativeX! / 100;
      const ry = click.payloadJson!.relativeY! / 100;
      const x = rx * canvas.width;
      const y = ry * canvas.height;

      const gradient = ctx.createRadialGradient(x, y, 0, x, y, 40);
      gradient.addColorStop(0, "rgba(239, 68, 68, 0.4)");
      gradient.addColorStop(0.5, "rgba(245, 158, 11, 0.2)");
      gradient.addColorStop(1, "rgba(245, 158, 11, 0)");
      ctx.fillStyle = gradient;
      ctx.beginPath();
      ctx.arc(x, y, 40, 0, Math.PI * 2);
      ctx.fill();

      // Center dot
      ctx.fillStyle = "rgba(239, 68, 68, 0.8)";
      ctx.beginPath();
      ctx.arc(x, y, 4, 0, Math.PI * 2);
      ctx.fill();
    }
  }, [mode, mappableClicks, iframeLoaded]);

  if (clicks.length === 0) {
    return (
      <div className="bg-white rounded-xl border border-gray-200 p-8 text-center">
        <div className="text-gray-400 text-sm">No click events recorded for this session</div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header with controls */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold">Click Map</h2>
          <p className="text-sm text-gray-500 mt-0.5">
            {mappableClicks.length} mapped clicks · {allClicks.length} total clicks
          </p>
        </div>
        <div className="flex gap-1 bg-gray-100 rounded-lg p-1">
          <button
            onClick={() => setMode("dots")}
            className={`text-xs px-3 py-1.5 rounded-md font-medium transition-colors ${
              mode === "dots" ? "bg-white text-gray-800 shadow-sm" : "text-gray-500 hover:text-gray-700"
            }`}
          >
            Dots
          </button>
          <button
            onClick={() => setMode("heatmap")}
            className={`text-xs px-3 py-1.5 rounded-md font-medium transition-colors ${
              mode === "heatmap" ? "bg-white text-gray-800 shadow-sm" : "text-gray-500 hover:text-gray-700"
            }`}
          >
            Heatmap
          </button>
        </div>
      </div>

      {/* Time legend */}
      <div className="flex items-center gap-3 text-xs text-gray-500">
        <span>Early</span>
        <div className="flex gap-0.5">
          {DOT_COLORS.map((color, i) => (
            <div key={i} className="w-6 h-3 rounded-sm" style={{ backgroundColor: color }} />
          ))}
        </div>
        <span>Late</span>
      </div>

      <div className="grid grid-cols-3 gap-4">
        {/* Map area */}
        <div className="col-span-2">
          <div
            ref={containerRef}
            className="relative bg-gray-50 rounded-xl border border-gray-200 overflow-hidden"
            style={{ height: 600 }}
          >
            <iframe
              src={testSiteUrl}
              title="Site preview"
              className="w-full h-full border-0"
              sandbox="allow-same-origin allow-scripts"
              onLoad={() => setIframeLoaded(true)}
              style={{ pointerEvents: "none" }}
            />

            {/* Dot overlay */}
            {mode === "dots" && (
              <div className="absolute inset-0" style={{ pointerEvents: "none" }}>
                {mappableClicks.map((click, idx) => {
                  const rx = click.payloadJson!.relativeX!;
                  const ry = click.payloadJson!.relativeY!;
                  const color = getTimeColor(
                    new Date(click.createdAt).getTime(),
                    timeRange.start,
                    timeRange.end
                  );
                  const isSelected = selectedClick?.id === click.id;

                  return (
                    <div
                      key={click.id}
                      className="absolute transform -translate-x-1/2 -translate-y-1/2 cursor-pointer"
                      style={{
                        left: `${rx}%`,
                        top: `${ry}%`,
                        pointerEvents: "auto",
                        zIndex: isSelected ? 20 : 10,
                      }}
                      onClick={() => setSelectedClick(isSelected ? null : click)}
                    >
                      {/* Ripple ring */}
                      <div
                        className="absolute inset-0 rounded-full animate-ping"
                        style={{
                          width: isSelected ? 28 : 20,
                          height: isSelected ? 28 : 20,
                          marginLeft: isSelected ? -14 : -10,
                          marginTop: isSelected ? -14 : -10,
                          backgroundColor: color,
                          opacity: 0.3,
                          animationDuration: "2s",
                        }}
                      />
                      {/* Dot */}
                      <div
                        className="rounded-full border-2 border-white shadow-md flex items-center justify-center"
                        style={{
                          width: isSelected ? 24 : 16,
                          height: isSelected ? 24 : 16,
                          marginLeft: isSelected ? -12 : -8,
                          marginTop: isSelected ? -12 : -8,
                          backgroundColor: color,
                        }}
                      >
                        <span className="text-white font-bold" style={{ fontSize: isSelected ? 10 : 7 }}>
                          {idx + 1}
                        </span>
                      </div>

                      {/* Tooltip */}
                      {isSelected && (
                        <div
                          className="absolute bg-gray-900 text-white text-xs rounded-lg px-3 py-2 whitespace-nowrap shadow-lg"
                          style={{ bottom: 20, left: "50%", transform: "translateX(-50%)", zIndex: 30 }}
                        >
                          <div className="font-medium">Click #{idx + 1}</div>
                          <div className="text-gray-300 mt-0.5">{formatTimestamp(click.createdAt)}</div>
                          {click.elementSelector && (
                            <div className="text-gray-400 mt-0.5 max-w-48 truncate">
                              {click.elementSelector}
                            </div>
                          )}
                          <div className="text-gray-400">
                            Position: {Math.round(rx)}%, {Math.round(ry)}%
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}

            {/* Heatmap canvas overlay */}
            {mode === "heatmap" && (
              <canvas
                ref={canvasRef}
                className="absolute inset-0 w-full h-full"
                style={{ pointerEvents: "none" }}
              />
            )}

            {/* No mapped clicks warning */}
            {mappableClicks.length === 0 && (
              <div className="absolute inset-0 flex items-center justify-center bg-black/10">
                <div className="bg-white rounded-lg px-4 py-3 shadow text-sm text-gray-600">
                  Click position data not available for this session
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Click list sidebar */}
        <div className="col-span-1">
          <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
            <div className="px-4 py-3 border-b border-gray-100">
              <div className="text-sm font-medium text-gray-700">Click Sequence</div>
            </div>
            <div className="max-h-[552px] overflow-y-auto divide-y divide-gray-50">
              {allClicks.map((click, idx) => {
                const hasMapped = click.payloadJson?.relativeX != null;
                const isSelected = selectedClick?.id === click.id;
                const color = getTimeColor(
                  new Date(click.createdAt).getTime(),
                  timeRange.start,
                  timeRange.end
                );

                return (
                  <button
                    key={click.id}
                    onClick={() => setSelectedClick(isSelected ? null : click)}
                    className={`w-full text-left px-4 py-2.5 text-sm hover:bg-gray-50 transition-colors ${
                      isSelected ? "bg-blue-50" : ""
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <div
                        className="w-5 h-5 rounded-full flex items-center justify-center text-white text-[9px] font-bold shrink-0"
                        style={{ backgroundColor: hasMapped ? color : "#d1d5db" }}
                      >
                        {idx + 1}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="text-gray-700 truncate text-xs">
                          {click.elementSelector
                            ? click.elementSelector.replace(/"/g, "").slice(0, 50)
                            : "Page click"}
                        </div>
                        <div className="text-gray-400 text-[10px] mt-0.5">
                          {formatTimestamp(click.createdAt)}
                          {hasMapped && (
                            <span className="ml-1.5">
                              ({Math.round(click.payloadJson!.relativeX!)}%,{" "}
                              {Math.round(click.payloadJson!.relativeY!)}%)
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
