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
      events: { orderBy: { createdAt: "asc" } },
      responses: { orderBy: { createdAt: "asc" } },
      audioAssets: { orderBy: { createdAt: "asc" } },
    },
  });

  if (!session) notFound();

  const screener = session.participant?.screenerAnswersJson as Record<string, string> | null;
  const timeline = buildTimeline(session.events, session.responses, session.audioAssets);

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
