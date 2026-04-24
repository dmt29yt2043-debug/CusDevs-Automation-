import { prisma } from "@/lib/db";
import { notFound } from "next/navigation";
import { getAudioUrl } from "@/lib/storage";
import Link from "next/link";
import ClickMap from "@/components/admin/ClickMap";

export const dynamic = "force-dynamic";

const statusColors: Record<string, string> = {
  started: "bg-yellow-100 text-yellow-700",
  in_progress: "bg-blue-100 text-blue-700",
  completed: "bg-green-100 text-green-700",
  abandoned: "bg-red-100 text-red-700",
};

// Human-readable phase labels
const phaseLabels: Record<string, { label: string; color: string }> = {
  setup: { label: "Setup", color: "bg-gray-100 text-gray-600" },
  exploration: { label: "Site Exploration", color: "bg-blue-50 text-blue-700" },
  scenario: { label: "Research Questions", color: "bg-purple-50 text-purple-700" },
  completion: { label: "Completion", color: "bg-green-50 text-green-700" },
};

interface TimelineItem {
  id: string;
  time: Date;
  phase: string;
  icon: string;
  title: string;
  detail?: string;
  type: "event" | "response" | "audio";
  ratingValue?: number;
  ratingMax?: number;
  textValue?: string;
  audioUrl?: string;
  audioDuration?: number;
  coords?: { x: number; y: number };
  rawPayload?: Record<string, unknown>;
}

function buildTimeline(
  events: Array<{
    id: string;
    eventType: string;
    createdAt: Date;
    pageUrl: string | null;
    elementSelector: string | null;
    x: number | null;
    y: number | null;
    payloadJson: unknown;
  }>,
  responses: Array<{
    id: string;
    stepId: string;
    responseType: string;
    valueJson: unknown;
    createdAt: Date;
  }>,
  audioAssets: Array<{
    id: string;
    stepId: string;
    filePath: string;
    durationSec: number | null;
    createdAt: Date;
  }>
): TimelineItem[] {
  const items: TimelineItem[] = [];
  const audioMap = new Map(audioAssets.map((a) => [a.stepId, a]));
  const addedResponseSteps = new Set<string>();

  for (const ev of events) {
    const payload = ev.payloadJson as Record<string, unknown> | null;

    // Skip internal/noisy events
    if (["step_viewed", "audio_record_started", "audio_record_stopped", "audio_uploaded"].includes(ev.eventType)) {
      continue;
    }

    // Skip step_answered — we show responses inline instead
    if (ev.eventType === "step_answered") {
      const stepId = (payload?.stepId as string) || "";
      if (!addedResponseSteps.has(stepId)) {
        addedResponseSteps.add(stepId);
        const resp = responses.find((r) => r.stepId === stepId);
        if (resp) {
          const val = resp.valueJson as Record<string, unknown>;
          const item: TimelineItem = {
            id: resp.id,
            time: resp.createdAt,
            phase: "scenario",
            icon: resp.responseType === "rating" ? "⭐" : resp.responseType === "audio" ? "🎤" : "💬",
            title:
              resp.responseType === "rating"
                ? "Rating submitted"
                : resp.responseType === "audio"
                  ? "Voice response recorded"
                  : "Text response submitted",
            detail: stepId.replace(/-/g, " ").replace(/^\w/, (c) => c.toUpperCase()),
            type: "response",
          };

          if (resp.responseType === "rating") {
            item.ratingValue = val.rating as number;
            item.ratingMax = 10;
          } else if (resp.responseType === "text") {
            item.textValue = val.text as string;
          } else if (resp.responseType === "audio") {
            const audio = audioMap.get(stepId);
            if (audio) {
              item.audioUrl = getAudioUrl(audio.filePath);
              item.audioDuration = audio.durationSec ?? undefined;
            }
          }

          items.push(item);
        }
      }
      continue;
    }

    const item: TimelineItem = {
      id: ev.id,
      time: ev.createdAt,
      phase: "setup",
      icon: "•",
      title: ev.eventType,
      type: "event",
    };

    switch (ev.eventType) {
      case "session_started":
        item.icon = "🟢";
        item.title = "Session started";
        item.phase = "setup";
        break;
      case "consent_accepted":
        item.icon = "✅";
        item.title = "Consent accepted";
        item.phase = "setup";
        break;
      case "screener_submitted":
        item.icon = "📋";
        item.title = "Screener completed";
        item.phase = "setup";
        if (payload) {
          const parts = Object.entries(payload)
            .filter(([, v]) => v)
            .map(([k, v]) => `${k}: ${v}`)
            .join(" · ");
          item.detail = parts;
        }
        break;
      case "page_view":
        item.icon = "🌐";
        item.title = "Opened test page";
        item.phase = "exploration";
        if (ev.pageUrl) {
          try {
            const url = new URL(ev.pageUrl);
            item.detail = url.pathname === "/" ? url.host : url.host + url.pathname;
          } catch {
            item.detail = ev.pageUrl;
          }
        }
        break;
      case "click":
        item.icon = "👆";
        item.phase = "exploration";
        item.title = ev.elementSelector
          ? `Clicked: ${formatSelector(ev.elementSelector)}`
          : "Clicked on page";
        if (ev.x != null && ev.y != null) {
          item.coords = { x: Math.round(ev.x), y: Math.round(ev.y) };
        }
        break;
      case "scroll_depth": {
        item.icon = "📜";
        item.phase = "exploration";
        const depth = (payload?.depth as number) || 0;
        item.title = `Scrolled to ${depth}% of page`;
        break;
      }
      case "session_completed":
        item.icon = "🏁";
        item.title = "Session completed";
        item.phase = "completion";
        break;
      default:
        item.icon = "•";
        item.title = ev.eventType.replace(/_/g, " ");
        item.rawPayload = payload ?? undefined;
    }

    items.push(item);
  }

  // Add audio responses that weren't linked to step_answered events
  for (const resp of responses) {
    if (!addedResponseSteps.has(resp.stepId)) {
      const val = resp.valueJson as Record<string, unknown>;
      const item: TimelineItem = {
        id: resp.id,
        time: resp.createdAt,
        phase: "scenario",
        icon: resp.responseType === "rating" ? "⭐" : resp.responseType === "audio" ? "🎤" : "💬",
        title:
          resp.responseType === "rating"
            ? "Rating submitted"
            : resp.responseType === "audio"
              ? "Voice response recorded"
              : "Text response submitted",
        detail: resp.stepId.replace(/-/g, " ").replace(/^\w/, (c) => c.toUpperCase()),
        type: "response",
      };
      if (resp.responseType === "rating") {
        item.ratingValue = (val.rating as number) ?? undefined;
        item.ratingMax = 10;
      } else if (resp.responseType === "text") {
        item.textValue = val.text as string;
      } else if (resp.responseType === "audio") {
        const audio = audioMap.get(resp.stepId);
        if (audio) {
          item.audioUrl = getAudioUrl(audio.filePath);
          item.audioDuration = audio.durationSec ?? undefined;
        }
      }
      items.push(item);
    }
  }

  items.sort((a, b) => new Date(a.time).getTime() - new Date(b.time).getTime());
  return items;
}

function formatSelector(sel: string): string {
  // Clean up selectors to be human-readable
  // "button.px-4.py-3 "Filters"" → "Filters button"
  const textMatch = sel.match(/"([^"]+)"/);
  if (textMatch) {
    const tag = sel.split(".")[0].split("#")[0];
    const label = textMatch[1].slice(0, 40);
    return tag && tag !== label.toLowerCase() ? `"${label}" (${tag})` : `"${label}"`;
  }
  if (sel.startsWith("#")) return sel;
  // Remove class noise
  return sel.replace(/\.[a-z0-9-]+/g, "").trim() || sel.slice(0, 40);
}

function formatTime(date: Date): string {
  return new Date(date).toLocaleTimeString("en-US", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  });
}

function relativeTime(start: Date, current: Date): string {
  const diff = Math.round((new Date(current).getTime() - new Date(start).getTime()) / 1000);
  if (diff < 60) return `+${diff}s`;
  const m = Math.floor(diff / 60);
  const s = diff % 60;
  return `+${m}m ${s}s`;
}

export default async function SessionDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const session = await prisma.session.findUnique({
    where: { id },
    include: {
      project: true,
      scenario: true,
      participant: true,
      events:      { orderBy: { createdAt: "asc" } },
      responses:   { orderBy: { createdAt: "asc" } },
      audioAssets: { orderBy: { createdAt: "asc" } },
      voiceEvents: { orderBy: { timestampStart: "asc" } },
    },
  });

  if (!session) notFound();

  const screener = session.participant?.screenerAnswersJson as Record<string, string> | null;
  const timeline = buildTimeline(session.events, session.responses, session.audioAssets);

  // Sequence: interaction events with element type, ordered by sequenceIndex
  const sequenceEvents = session.events
    .filter(e => e.eventType === "click" && e.sequenceIndex != null)
    .sort((a, b) => (a.sequenceIndex ?? 0) - (b.sequenceIndex ?? 0));

  // Completion check
  const cardClicks  = sequenceEvents.filter(e => (e.elementType === "card") || (e.payloadJson as Record<string,unknown>|null)?.source === "iframe").length;
  const isCompleted = session.events.some(e => e.eventType === "completion_condition_met") || cardClicks >= 2;

  // Element type stats
  const elementStats: Record<string, number> = {};
  for (const e of sequenceEvents) {
    const t = (e.elementType as string) || "other";
    elementStats[t] = (elementStats[t] || 0) + 1;
  }

  // Load JTBD interview if participant has one
  const jtbd = session.participant
    ? await prisma.jtbdInterview.findFirst({
        where: { participantId: session.participant.id },
        orderBy: { createdAt: "desc" },
      })
    : null;

  // Prepare click data for ClickMap component
  const clickEvents = session.events
    .filter((e) => e.eventType === "click")
    .map((e) => ({
      id: e.id,
      x: e.x,
      y: e.y,
      createdAt: e.createdAt.toISOString(),
      elementSelector: e.elementSelector,
      payloadJson: e.payloadJson as {
        relativeX?: number;
        relativeY?: number;
        viewportWidth?: number;
        viewportHeight?: number;
      } | null,
    }));

  // Group timeline by phase
  let currentPhase = "";

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <Link href="/admin/sessions" className="text-sm text-gray-400 hover:text-gray-600 mb-2 block">
            ← All Sessions
          </Link>
          <h1 className="text-2xl font-bold">Session Details</h1>
          <p className="text-gray-500 mt-1">{session.project.name}</p>
        </div>
        <span
          className={`text-sm px-3 py-1.5 rounded-full font-medium ${
            statusColors[session.status] || "bg-gray-100"
          }`}
        >
          {session.status}
        </span>
      </div>

      {/* Meta cards */}
      <div className="grid grid-cols-4 gap-4">
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <div className="text-sm text-gray-500">Started</div>
          <div className="font-medium mt-1">
            {new Date(session.startedAt).toLocaleString("en-US", {
              month: "short", day: "numeric", year: "numeric",
              hour: "2-digit", minute: "2-digit", hour12: false,
            })}
          </div>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <div className="text-sm text-gray-500">Duration</div>
          <div className="font-medium mt-1">
            {session.durationSec
              ? `${Math.floor(session.durationSec / 60)}m ${session.durationSec % 60}s`
              : "—"}
          </div>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <div className="text-sm text-gray-500">Interactions</div>
          <div className="font-medium mt-1">
            {session.events.filter((e) => e.eventType === "click").length} clicks
          </div>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <div className="text-sm text-gray-500">Responses</div>
          <div className="font-medium mt-1">{session.responses.length}</div>
        </div>
      </div>

      {/* Screener summary bar */}
      {screener && (
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <div className="text-sm font-medium text-gray-700 mb-2">Participant Profile</div>
          <div className="flex flex-wrap gap-3">
            {Object.entries(screener).map(([key, value]) =>
              value ? (
                <span
                  key={key}
                  className="text-xs bg-gray-100 text-gray-600 px-3 py-1.5 rounded-full"
                >
                  <span className="text-gray-400">{key}:</span> {value}
                </span>
              ) : null
            )}
          </div>
        </div>
      )}

      {/* JTBD Interview Block */}
      {jtbd && (
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <div className="flex items-center gap-3 mb-4">
            <span className="text-lg">🎯</span>
            <h2 className="text-lg font-semibold">JTBD Interview</h2>
            {jtbd.jtbdValidated && (
              <span className="text-xs px-2 py-0.5 rounded-full bg-green-100 text-green-700 font-medium">
                ✓ Подтверждён
              </span>
            )}
          </div>

          {/* JTBD statement */}
          {(jtbd.situation || jtbd.action || jtbd.outcome) && (
            <div className="bg-purple-50 rounded-xl p-4 mb-4 space-y-2">
              {jtbd.situation && (
                <div className="flex gap-3 text-sm">
                  <span className="text-purple-500 font-semibold w-20 shrink-0">When</span>
                  <span className="text-gray-700">{jtbd.situation}</span>
                </div>
              )}
              {jtbd.action && (
                <div className="flex gap-3 text-sm">
                  <span className="text-purple-500 font-semibold w-20 shrink-0">I need to</span>
                  <span className="text-gray-700">{jtbd.action}</span>
                </div>
              )}
              {jtbd.outcome && (
                <div className="flex gap-3 text-sm">
                  <span className="text-purple-500 font-semibold w-20 shrink-0">So I can</span>
                  <span className="text-gray-700">{jtbd.outcome}</span>
                </div>
              )}
              {(() => {
                const feeling = (jtbd.forces as Record<string,unknown>|null)?.feeling;
                return feeling ? (
                  <div className="flex gap-3 text-sm">
                    <span className="text-amber-500 font-semibold w-20 shrink-0">And feel</span>
                    <span className="text-gray-700">{String(feeling)}</span>
                  </div>
                ) : null;
              })()}
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Triggers */}
            {Array.isArray(jtbd.triggers) && (jtbd.triggers as {text: string}[]).length > 0 && (
              <div>
                <p className="text-xs font-semibold text-gray-500 mb-2 uppercase tracking-wide">Триггеры</p>
                <ul className="space-y-1.5">
                  {(jtbd.triggers as {text: string}[]).map((t, i) => (
                    <li key={i} className="text-sm text-gray-700 bg-gray-50 rounded-lg px-3 py-1.5">
                      — {t.text}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Current solution */}
            {jtbd.currentSolution && (
              <div>
                <p className="text-xs font-semibold text-gray-500 mb-2 uppercase tracking-wide">Текущее решение</p>
                <p className="text-sm text-gray-700 bg-gray-50 rounded-lg px-3 py-2">{jtbd.currentSolution}</p>
              </div>
            )}

            {/* Forces */}
            {jtbd.forces && (
              <div>
                <p className="text-xs font-semibold text-gray-500 mb-2 uppercase tracking-wide">Силы</p>
                <div className="space-y-2">
                  {(() => {
                    const f = jtbd.forces as { hold?: string[]; pain?: string[]; push?: string[] };
                    return (
                      <>
                        {f.hold?.map((h, i) => (
                          <div key={i} className="text-xs bg-blue-50 text-blue-700 rounded-lg px-3 py-1.5">
                            🔒 {h}
                          </div>
                        ))}
                        {f.pain?.map((p, i) => (
                          <div key={i} className="text-xs bg-red-50 text-red-700 rounded-lg px-3 py-1.5">
                            😤 {p}
                          </div>
                        ))}
                        {f.push?.map((p, i) => (
                          <div key={i} className="text-xs bg-green-50 text-green-700 rounded-lg px-3 py-1.5">
                            🚀 {p}
                          </div>
                        ))}
                      </>
                    );
                  })()}
                </div>
              </div>
            )}
          </div>

          {/* Raw answers (collapsed) */}
          {Array.isArray(jtbd.rawAnswers) && (jtbd.rawAnswers as unknown[]).length > 0 && (
            <details className="mt-4">
              <summary className="text-xs text-gray-400 cursor-pointer hover:text-gray-600">
                Показать все ответы ({(jtbd.rawAnswers as unknown[]).length})
              </summary>
              <div className="mt-3 space-y-2">
                {(jtbd.rawAnswers as { question_id: string; answer: string; timestamp: string }[]).map((r, i) => (
                  <div key={i} className="bg-gray-50 rounded-lg p-3">
                    <div className="text-xs text-gray-400 mb-1">{r.question_id}</div>
                    <div className="text-sm text-gray-700">{r.answer}</div>
                  </div>
                ))}
              </div>
            </details>
          )}
        </div>
      )}

      {/* ── Behavior Path + Decision Metrics ── */}
      {(() => {
        const meta = session.metadataJson as Record<string, unknown> | null;
        if (!meta) return null;
        const path    = meta.behavior_path   as { zone: string; dwell_sec: number }[] | undefined;
        const zones   = meta.zone_activity   as Record<string, number>               | undefined;
        const metrics = meta.decision_metrics as { hesitation_score: number; exploration_score: number; filter_dependency: number } | undefined;
        const style   = meta.decision_style  as string | undefined;
        const outcome = meta.final_outcome   as string | undefined;

        const STYLE_COLOR: Record<string, string> = {
          fast:        "#16a34a",
          structured:  "#2563eb",
          exploratory: "#7c3aed",
          overwhelmed: "#dc2626",
        };
        const ZONE_ICON: Record<string, string> = {
          search: "🔍", filter: "⚙️", calendar: "📅", card: "🃏",
          map: "🗺️", navigation: "🧭", other: "·",
        };

        return (
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 8 }}>

            {/* Behavior path */}
            {path && path.length > 0 && (
              <div style={{ background: "#fff", border: "1px solid #e5e7eb", borderRadius: 14, padding: "18px 20px" }}>
                <div style={{ fontSize: 13, fontWeight: 700, color: "#111", marginBottom: 14 }}>🗺 Behavior Path</div>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 6, alignItems: "center" }}>
                  {path.map((step, i) => (
                    <span key={i} style={{ display: "flex", alignItems: "center", gap: 4 }}>
                      <span style={{
                        fontSize: 12, padding: "3px 10px", borderRadius: 99,
                        background: step.zone === "filter" || step.zone === "calendar"
                          ? "rgba(124,58,237,0.1)" : "#f3f4f6",
                        color: step.zone === "filter" || step.zone === "calendar" ? "#7c3aed" : "#374151",
                        fontWeight: 500,
                      }}>
                        {ZONE_ICON[step.zone] || "·"} {step.zone}
                        <span style={{ color: "#9ca3af", fontWeight: 400 }}> {step.dwell_sec}s</span>
                      </span>
                      {i < path.length - 1 && <span style={{ color: "#d1d5db", fontSize: 11 }}>→</span>}
                    </span>
                  ))}
                </div>
                {zones && (
                  <div style={{ marginTop: 12, fontSize: 12, color: "#6b7280" }}>
                    Zones visited: {Object.entries(zones).map(([z, n]) => `${z} ×${n}`).join(" · ")}
                  </div>
                )}
              </div>
            )}

            {/* Decision metrics */}
            {metrics && (
              <div style={{ background: "#fff", border: "1px solid #e5e7eb", borderRadius: 14, padding: "18px 20px" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
                  <div style={{ fontSize: 13, fontWeight: 700, color: "#111" }}>📊 Decision Metrics</div>
                  <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                    {style && (
                      <span style={{
                        fontSize: 11, padding: "3px 10px", borderRadius: 99,
                        background: STYLE_COLOR[style] + "18",
                        color: STYLE_COLOR[style],
                        fontWeight: 600, textTransform: "capitalize",
                      }}>
                        {style}
                      </span>
                    )}
                    {outcome && (
                      <span style={{
                        fontSize: 11, padding: "3px 10px", borderRadius: 99,
                        background: outcome === "completed" ? "rgba(34,197,94,0.1)" : "rgba(234,179,8,0.1)",
                        color:      outcome === "completed" ? "#16a34a" : "#b45309",
                        fontWeight: 600,
                      }}>
                        {outcome}
                      </span>
                    )}
                  </div>
                </div>
                {[
                  { label: "Hesitation",        value: metrics.hesitation_score,  color: "#ef4444" },
                  { label: "Exploration",        value: metrics.exploration_score, color: "#8b5cf6" },
                  { label: "Filter dependency",  value: metrics.filter_dependency, color: "#3b82f6" },
                ].map(m => (
                  <div key={m.label} style={{ marginBottom: 10 }}>
                    <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4, fontSize: 12 }}>
                      <span style={{ color: "#6b7280" }}>{m.label}</span>
                      <span style={{ fontWeight: 700, color: m.color }}>{m.value}%</span>
                    </div>
                    <div style={{ height: 6, background: "#f3f4f6", borderRadius: 99, overflow: "hidden" }}>
                      <div style={{
                        width: `${m.value}%`, height: "100%",
                        background: m.color, borderRadius: 99,
                        transition: "width 0.5s ease",
                      }} />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        );
      })()}

      {/* ── Completion + Element Stats ── */}
      <div className="grid grid-cols-2 gap-4">
        {/* Completion */}
        <div className={`rounded-xl border p-4 ${isCompleted ? "bg-green-50 border-green-200" : "bg-yellow-50 border-yellow-200"}`}>
          <div className="text-sm font-semibold mb-1" style={{ color: isCompleted ? "#15803d" : "#92400e" }}>
            {isCompleted ? "✓ Task completed" : "⏳ Task in progress"}
          </div>
          <div className="text-xs" style={{ color: isCompleted ? "#166534" : "#78350f" }}>
            Completion rule: opened ≥ 2 event cards
          </div>
          <div className="text-2xl font-bold mt-2" style={{ color: isCompleted ? "#16a34a" : "#d97706" }}>
            {cardClicks} / 2 cards
          </div>
        </div>

        {/* Element type breakdown */}
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <div className="text-sm font-semibold text-gray-700 mb-3">Interaction breakdown</div>
          {Object.entries(elementStats).length === 0
            ? <div className="text-xs text-gray-400">No tracked interactions yet</div>
            : Object.entries(elementStats)
                .sort((a, b) => b[1] - a[1])
                .map(([type, count]) => (
                  <div key={type} className="flex items-center gap-2 mb-1.5">
                    <span className="text-xs font-medium text-gray-500 w-20">{type}</span>
                    <div className="flex-1 h-2 bg-gray-100 rounded-full overflow-hidden">
                      <div className="h-full rounded-full bg-purple-400"
                        style={{ width: `${Math.min((count / sequenceEvents.length) * 100, 100)}%` }} />
                    </div>
                    <span className="text-xs text-gray-500 w-6 text-right">{count}</span>
                  </div>
                ))
          }
        </div>
      </div>

      {/* ── Interaction Sequence Timeline ── */}
      {sequenceEvents.length > 0 && (
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <h2 className="text-base font-semibold mb-4 flex items-center gap-2">
            🔢 Interaction Sequence
            <span className="text-xs text-gray-400 font-normal">({sequenceEvents.length} tracked actions)</span>
          </h2>
          <div className="space-y-1">
            {sequenceEvents.map((e, i) => {
              const payload = e.payloadJson as Record<string, unknown> | null;
              const elemType = (e.elementType as string) || "other";
              const typeColor: Record<string, string> = {
                filter: "bg-blue-100 text-blue-700", calendar: "bg-yellow-100 text-yellow-700",
                map: "bg-green-100 text-green-700", chat: "bg-purple-100 text-purple-700",
                card: "bg-pink-100 text-pink-700", navigation: "bg-gray-100 text-gray-600",
                other: "bg-gray-50 text-gray-400",
              };
              return (
                <div key={e.id} className="flex items-center gap-3 py-1.5 px-3 rounded-lg hover:bg-gray-50">
                  <span className="text-xs font-mono text-gray-400 w-8 shrink-0">
                    #{e.sequenceIndex ?? i + 1}
                  </span>
                  <span className={`text-xs px-2 py-0.5 rounded-full font-medium w-20 text-center shrink-0 ${typeColor[elemType] || typeColor.other}`}>
                    {elemType}
                  </span>
                  <span className="text-xs text-gray-600 flex-1 truncate">
                    {e.elementSelector ? formatSelector(e.elementSelector) : payload?.source === "iframe" ? "iframe click" : "click"}
                    {e.x != null && e.y != null ? ` · (${Math.round(e.x as number)}, ${Math.round(e.y as number)})` : ""}
                  </span>
                  <span className="text-xs text-gray-300 shrink-0">
                    {relativeTime(session.startedAt, e.createdAt)}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ── Voice Events (Hugo prompts + answers) ── */}
      {session.voiceEvents.length > 0 && (
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <h2 className="text-base font-semibold mb-4 flex items-center gap-2">
            🎙 Voice Events
            <span className="text-xs text-gray-400 font-normal">({session.voiceEvents.length})</span>
          </h2>
          <div className="space-y-3">
            {session.voiceEvents.map((ve) => (
              <div key={ve.id} className="bg-purple-50 rounded-xl p-4">
                {ve.question && (
                  <div className="text-xs font-semibold text-purple-600 mb-2">🦉 {ve.question}</div>
                )}
                {ve.transcript && (
                  <div className="text-sm text-gray-700 italic">&ldquo;{ve.transcript}&rdquo;</div>
                )}
                {ve.audioUrl && (
                  <audio controls className="h-8 w-full mt-2" src={ve.audioUrl} />
                )}
                <div className="text-xs text-gray-400 mt-2 flex flex-wrap gap-3">
                  <span>{new Date(ve.timestampStart).toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", second: "2-digit" })}</span>
                  {(() => {
                    const ctx = ve.contextEvent as Record<string, unknown> | null;
                    if (!ctx) return null;
                    return (
                      <>
                        {ctx.triggerId && <span className="px-2 py-0.5 rounded-full bg-purple-100 text-purple-600 font-medium">{ctx.triggerId as string}</span>}
                        {ctx.zone      && <span>zone: {ctx.zone as string}</span>}
                        {ctx.timeOnPage != null && <span>t+{ctx.timeOnPage as number}s</span>}
                        {Array.isArray(ctx.recentPath) && ctx.recentPath.length > 0 &&
                          <span>path: {(ctx.recentPath as string[]).join(" → ")}</span>}
                      </>
                    );
                  })()}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Click Map */}
      {clickEvents.length > 0 && session.project.testSiteUrl && (
        <ClickMap
          clicks={clickEvents}
          testSiteUrl={session.project.testSiteUrl}
          sessionStartedAt={session.startedAt.toISOString()}
        />
      )}

      {/* Timeline */}
      <div>
        <h2 className="text-lg font-semibold mb-4">Session Timeline</h2>
        <div className="space-y-1">
          {timeline.map((item) => {
            const showPhaseHeader = item.phase !== currentPhase;
            if (showPhaseHeader) currentPhase = item.phase;
            const phase = phaseLabels[item.phase];

            return (
              <div key={item.id}>
                {/* Phase divider */}
                {showPhaseHeader && phase && (
                  <div className="flex items-center gap-3 py-3 mt-4 first:mt-0">
                    <span className={`text-xs font-medium px-2.5 py-1 rounded-full ${phase.color}`}>
                      {phase.label}
                    </span>
                    <div className="flex-1 h-px bg-gray-200" />
                  </div>
                )}

                {/* Timeline item */}
                <div className="bg-white rounded-xl border border-gray-100 px-4 py-3 flex items-start gap-3 hover:border-gray-200 transition-colors">
                  <span className="text-lg mt-0.5 w-7 text-center shrink-0">{item.icon}</span>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium text-gray-800">{item.title}</div>

                    {item.detail && (
                      <div className="text-xs text-gray-500 mt-0.5">{item.detail}</div>
                    )}

                    {item.coords && (
                      <span className="text-xs text-gray-400 mt-0.5 inline-block">
                        at ({item.coords.x}, {item.coords.y})
                      </span>
                    )}

                    {/* Inline rating */}
                    {item.ratingValue != null && (
                      <div className="mt-2 flex items-center gap-2">
                        <div className="flex gap-0.5">
                          {Array.from({ length: item.ratingMax || 10 }, (_, i) => (
                            <div
                              key={i}
                              className={`w-5 h-5 rounded text-xs flex items-center justify-center font-medium ${
                                i < item.ratingValue!
                                  ? "bg-amber-400 text-white"
                                  : "bg-gray-100 text-gray-400"
                              }`}
                            >
                              {i + 1}
                            </div>
                          ))}
                        </div>
                        <span className="text-sm font-bold text-amber-600">
                          {item.ratingValue}/{item.ratingMax}
                        </span>
                      </div>
                    )}

                    {/* Inline text response */}
                    {item.textValue && (
                      <div className="mt-2 bg-gray-50 rounded-lg p-3 text-sm text-gray-700 italic">
                        &ldquo;{item.textValue}&rdquo;
                      </div>
                    )}

                    {/* Inline audio player */}
                    {item.audioUrl && (
                      <div className="mt-2 flex items-center gap-3 bg-purple-50 rounded-lg p-3">
                        <audio controls className="h-8 flex-1" src={item.audioUrl} />
                        {item.audioDuration && (
                          <span className="text-xs text-purple-600 whitespace-nowrap">
                            {Math.round(item.audioDuration)}s
                          </span>
                        )}
                      </div>
                    )}

                    {/* Raw payload (collapsed) */}
                    {item.rawPayload && Object.keys(item.rawPayload).length > 0 && (
                      <details className="mt-1">
                        <summary className="text-xs text-gray-400 cursor-pointer hover:text-gray-600">
                          Show raw data
                        </summary>
                        <pre className="text-xs text-gray-500 mt-1 bg-gray-50 rounded p-2 overflow-x-auto">
                          {JSON.stringify(item.rawPayload, null, 2)}
                        </pre>
                      </details>
                    )}
                  </div>

                  {/* Time column */}
                  <div className="text-right shrink-0">
                    <div className="text-xs text-gray-400">{formatTime(item.time)}</div>
                    <div className="text-xs text-gray-300">
                      {relativeTime(session.startedAt, item.time)}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}

          {timeline.length === 0 && (
            <p className="text-gray-400 text-center py-12 text-sm">No events recorded</p>
          )}
        </div>
      </div>
    </div>
  );
}
