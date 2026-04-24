import { prisma } from "@/lib/db";
import type { SegmentResult } from "@/lib/segmentation";

export const dynamic = "force-dynamic";

// ── Colors ─────────────────────────────────────────────────────────────────────

const FALLBACK_COLOR = { bg: "#f9fafb", border: "#e5e7eb", text: "#6b7280", dot: "#9ca3af", light: "#f3f4f6" };

const SEGMENT_COLORS: Record<string, { bg: string; border: string; text: string; dot: string; light: string }> = {
  "Fast & Easy":         { bg: "#fff7ed", border: "#fed7aa", text: "#c2410c", dot: "#f97316", light: "#ffedd5" },
  "Fast/Easy":           { bg: "#fff7ed", border: "#fed7aa", text: "#c2410c", dot: "#f97316", light: "#ffedd5" },
  "Explorer":            { bg: "#eff6ff", border: "#bfdbfe", text: "#1d4ed8", dot: "#3b82f6", light: "#dbeafe" },
  "Connector":           { bg: "#fdf4ff", border: "#e9d5ff", text: "#7e22ce", dot: "#a855f7", light: "#f5f3ff" },
  "Emotional/Community": { bg: "#fdf4ff", border: "#e9d5ff", text: "#7e22ce", dot: "#a855f7", light: "#f5f3ff" },
  "Value Seeker":        { bg: "#f0fdf4", border: "#bbf7d0", text: "#15803d", dot: "#22c55e", light: "#dcfce7" },
};

const SEGMENT_ICONS: Record<string, string> = {
  "Fast & Easy": "⚡", "Fast/Easy": "⚡",
  "Explorer": "🔭",
  "Connector": "💜", "Emotional/Community": "💜",
  "Value Seeker": "💰",
};

function getColor(name: string) { return SEGMENT_COLORS[name] ?? FALLBACK_COLOR; }
function getIcon(name: string)  { return SEGMENT_ICONS[name]  ?? "❓"; }

// ── Zone config ────────────────────────────────────────────────────────────────

const ZONE_COLORS: Record<string, { bg: string; text: string; border: string }> = {
  event_page: { bg: "#f0fdf4", text: "#15803d", border: "#bbf7d0" },
  filters:    { bg: "#fdf4ff", text: "#7e22ce", border: "#e9d5ff" },
  calendar:   { bg: "#fff7ed", text: "#c2410c", border: "#fed7aa" },
  chat:       { bg: "#eff6ff", text: "#1d4ed8", border: "#bfdbfe" },
  map:        { bg: "#f0fdfa", text: "#0f766e", border: "#99f6e4" },
};

const ZONE_LABELS: Record<string, string> = {
  event_feed: "Feed", event_page: "Event",
  filters: "Filters", calendar: "Calendar",
  chat: "AI Chat", map: "Map",
};

// ── Data types ─────────────────────────────────────────────────────────────────

interface BehaviorData {
  voice_data?: {
    first_impression?: { transcript?: string | null };
    friction?:         { transcript?: string | null };
  };
  behavior_path?: Array<{ zone: string; dwell_ms: number }>;
  events_viewed?: number;
  events_saved?:  number;
  buy_clicked?:   boolean;
  buy_ts_sec?:    number | null;
  purchase_proxy_score?: number;
  event_behavior?: Array<{ dwell_ms: number }>;
}

// ── Helpers ────────────────────────────────────────────────────────────────────

function fmtDwell(ms: number): string {
  if (ms < 1000) return "<1s";
  const sec = Math.round(ms / 1000);
  if (sec < 60) return `${sec}s`;
  const m = Math.floor(sec / 60), s = sec % 60;
  return s > 0 ? `${m}m ${s}s` : `${m}m`;
}

const CIRC = 2 * Math.PI * 30;

// ── Page ───────────────────────────────────────────────────────────────────────

export default async function ParticipantsPage() {
  const participants = await prisma.participant.findMany({
    include: {
      project:       { select: { name: true } },
      sessions: {
        select: { id: true, status: true, startedAt: true, endedAt: true, metadataJson: true, durationSec: true },
        orderBy: { startedAt: "desc" },
      },
      jtbdInterviews: { orderBy: { createdAt: "desc" }, take: 1 },
    },
    orderBy: { createdAt: "desc" },
    take: 200,
  });

  const withSegment    = participants.filter(p => p.segmentJson);
  const withoutSegment = participants.filter(p => !p.segmentJson);

  return (
    <div>
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ fontSize: 22, fontWeight: 700, color: "#111" }}>Participants</h1>
        <p style={{ fontSize: 13, color: "#6b7280", marginTop: 4 }}>
          {participants.length} total · {withSegment.length} segmented · {withoutSegment.length} pending
        </p>
      </div>

      {withSegment.length === 0 && (
        <div style={{ background: "#f9fafb", border: "1px solid #e5e7eb", borderRadius: 12, padding: "48px 24px", textAlign: "center", color: "#9ca3af" }}>
          No segmented participants yet. Complete the screener flow to generate segments.
        </div>
      )}

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(400px, 1fr))", gap: 20 }}>
        {withSegment.map((p, idx) => {
          const seg    = p.segmentJson as unknown as SegmentResult;
          const c      = getColor(seg.primary_segment);
          const jtbd   = p.jtbdInterviews[0] ?? null;
          const latestSession = p.sessions.find(s => s.metadataJson) ?? p.sessions[0] ?? null;
          const meta   = (latestSession?.metadataJson ?? null) as BehaviorData | null;

          const eventsViewed = meta?.events_viewed ?? 0;
          const eventsSaved  = meta?.events_saved  ?? 0;
          const score        = meta?.purchase_proxy_score ?? 0;
          const buyClicked   = meta?.buy_clicked ?? false;
          const buyTsSec     = meta?.buy_ts_sec ?? null;
          const zonePath     = (meta?.behavior_path ?? []).slice(0, 7);
          const firstImpression = meta?.voice_data?.first_impression?.transcript ?? null;
          const frictionText    = meta?.voice_data?.friction?.transcript ?? null;
          const evtBehavior  = meta?.event_behavior ?? [];
          const avgDwell = eventsViewed > 0 && evtBehavior.length > 0
            ? Math.round(evtBehavior.reduce((s, e) => s + (e.dwell_ms ?? 0), 0) / evtBehavior.length / 1000)
            : null;
          const hasBehavior = !!meta && score > 0;
          const offset = CIRC * (1 - score / 100);
          const jtbdFeeling = (jtbd?.forces as { feeling?: string } | null)?.feeling ?? null;
          const sessionDurSec = latestSession?.durationSec
            ?? (latestSession?.endedAt
              ? Math.round((new Date(latestSession.endedAt).getTime() - new Date(latestSession.startedAt).getTime()) / 1000)
              : null);

          return (
            <div key={p.id} style={{ background: "#fff", border: "1px solid #e5e7eb", borderRadius: 20, overflow: "hidden", boxShadow: "0 2px 12px rgba(0,0,0,0.06)" }}>

              {/* Header */}
              <div style={{ padding: "16px 20px 12px", borderBottom: "1px solid #f3f4f6" }}>
                <div style={{ fontSize: 16, fontWeight: 700, color: "#111" }}>
                  {p.externalId || `P-${String(idx + 1).padStart(3, "0")}`}
                </div>
                <div style={{ fontSize: 11, color: "#9ca3af", marginTop: 2 }}>
                  {p.project.name} · {new Date(p.createdAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                </div>
              </div>

              {/* Segment */}
              <div style={{ padding: "12px 20px", borderBottom: "1px solid #f3f4f6" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <span style={{ fontSize: 20 }}>{getIcon(seg.primary_segment)}</span>
                  <span style={{ fontSize: 17, fontWeight: 700, color: c.text }}>{seg.primary_segment}</span>
                </div>
                {seg.secondary_segment && (
                  <div style={{ marginTop: 4, paddingLeft: 28, fontSize: 11, color: "#9ca3af" }}>
                    <span style={{ background: "#f3f4f6", borderRadius: 99, padding: "2px 8px" }}>
                      + {seg.secondary_segment} mix
                    </span>
                  </div>
                )}
              </div>

              {/* Profile */}
              <div style={{ padding: "12px 20px", borderBottom: "1px solid #f3f4f6", display: "flex", flexDirection: "column", gap: 6 }}>
                <PRow icon="👶" label="Kids"       value={seg.profile_summary.kids} />
                <PRow icon="📍" label="City"       value={seg.profile_summary.city} />
                <PRow icon="🗓" label="Goes out"   value={seg.profile_summary.frequency} />
                <PRow icon="💳" label="Spends"     value={seg.profile_summary.spend} />
                {seg.profile_summary.motivations.length > 0 && (
                  <PRow icon="❤️" label="Motivated by" value={seg.profile_summary.motivations.join(" · ")} />
                )}
                {seg.profile_summary.channels.length > 0 && (
                  <PRow icon="🔍" label="Finds via"   value={seg.profile_summary.channels.join(" · ")} />
                )}
              </div>

              {/* JTBD */}
              {jtbd && (jtbd.situation || jtbd.action || jtbd.outcome) && (
                <div style={{ padding: "12px 20px", borderBottom: "1px solid #f3f4f6", background: "#fafafa" }}>
                  <div style={{ fontSize: 10, fontWeight: 700, color: "#9ca3af", letterSpacing: 0.8, textTransform: "uppercase", marginBottom: 9 }}>JTBD</div>
                  {jtbd.situation && <JRow label="When"      color={c.dot}   value={jtbd.situation} />}
                  {jtbd.action    && <JRow label="I need to" color="#f472b6" value={jtbd.action} />}
                  {jtbd.outcome   && <JRow label="So I can"  color="#34d399" value={jtbd.outcome} />}
                  {jtbdFeeling    && <JRow label="And feel"  color="#fbbf24" value={jtbdFeeling} />}
                </div>
              )}

              {/* Behavioral block */}
              {hasBehavior ? (
                <div style={{ padding: "16px 20px 18px", display: "flex", flexDirection: "column", gap: 14 }}>

                  {/* Donut + stats */}
                  <div style={{ display: "flex", alignItems: "center", gap: 16, padding: "14px 16px", background: c.light, borderRadius: 14 }}>
                    {/* Donut */}
                    <div style={{ position: "relative", width: 72, height: 72, flexShrink: 0 }}>
                      <svg width="72" height="72" viewBox="0 0 72 72" style={{ transform: "rotate(-90deg)" }}>
                        <circle cx="36" cy="36" r="30" fill="none" stroke={c.border} strokeWidth="7" />
                        <circle cx="36" cy="36" r="30" fill="none" stroke={c.dot} strokeWidth="7"
                          strokeDasharray={`${CIRC}`} strokeDashoffset={`${offset}`} strokeLinecap="round" />
                      </svg>
                      <div style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center" }}>
                        <span style={{ fontSize: 18, fontWeight: 900, lineHeight: 1, color: c.text }}>{score}</span>
                        <span style={{ fontSize: 8, fontWeight: 700, color: "#9ca3af", textTransform: "uppercase", letterSpacing: 0.4 }}>score</span>
                      </div>
                    </div>
                    {/* Stats */}
                    <div style={{ flex: 1, display: "flex" }}>
                      <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 2 }}>
                        <span style={{ fontSize: 28, fontWeight: 800, lineHeight: 1, color: "#111" }}>{eventsViewed}</span>
                        <span style={{ fontSize: 11, fontWeight: 600, color: "#374151" }}>Events viewed</span>
                        {avgDwell !== null && <span style={{ fontSize: 10, color: "#9ca3af" }}>avg {avgDwell}s each</span>}
                      </div>
                      <div style={{ width: 1, background: "#e5e7eb", alignSelf: "stretch", margin: "4px 0" }} />
                      <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 2 }}>
                        <span style={{ fontSize: 28, fontWeight: 800, lineHeight: 1, color: c.dot }}>{eventsSaved}</span>
                        <span style={{ fontSize: 11, fontWeight: 600, color: "#374151" }}>★ Saved</span>
                        <span style={{ fontSize: 10, color: "#9ca3af" }}>viewed &gt;10s each</span>
                      </div>
                    </div>
                  </div>

                  {/* First impression */}
                  {firstImpression && (
                    <div>
                      <div style={{ fontSize: 10, fontWeight: 700, color: "#9ca3af", textTransform: "uppercase", letterSpacing: 0.7, marginBottom: 7 }}>First impression</div>
                      <div style={{ borderLeft: `3px solid ${c.dot}`, borderRadius: "0 8px 8px 0", padding: "8px 12px", background: c.light }}>
                        <div style={{ fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: 0.6, color: c.dot, marginBottom: 4 }}>🎙 Voice answer</div>
                        <div style={{ fontSize: 12, color: "#374151", fontStyle: "italic", lineHeight: 1.5 }}>
                          &ldquo;{firstImpression}&rdquo;
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Zone sequence */}
                  {zonePath.length > 0 && (
                    <div>
                      <div style={{ fontSize: 10, fontWeight: 700, color: "#9ca3af", textTransform: "uppercase", letterSpacing: 0.7, marginBottom: 7 }}>Zone sequence</div>
                      <div style={{ display: "flex", alignItems: "center", gap: 4, flexWrap: "wrap" }}>
                        {zonePath.map((v, i) => {
                          const zc = ZONE_COLORS[v.zone];
                          return (
                            <div key={i} style={{ display: "flex", alignItems: "center", gap: 4 }}>
                              <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 2 }}>
                                <div style={{
                                  fontSize: 11, fontWeight: 600, padding: "4px 10px", borderRadius: 99, whiteSpace: "nowrap",
                                  background: zc?.bg ?? "#f3f4f6", color: zc?.text ?? "#374151",
                                  border: `1.5px solid ${zc?.border ?? "transparent"}`,
                                }}>
                                  {ZONE_LABELS[v.zone] ?? v.zone}
                                </div>
                                <span style={{ fontSize: 9, color: "#9ca3af", fontWeight: 500 }}>{fmtDwell(v.dwell_ms)}</span>
                              </div>
                              {i < zonePath.length - 1 && (
                                <span style={{ color: "#d1d5db", fontSize: 11, paddingBottom: 12, flexShrink: 0 }}>›</span>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {/* Buy + blocker */}
                  <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      {buyClicked ? (
                        <>
                          <span style={{ fontSize: 11, fontWeight: 700, padding: "4px 10px", borderRadius: 99, background: "#f0fdf4", color: "#15803d", whiteSpace: "nowrap" }}>✓ Buy clicked</span>
                          {buyTsSec !== null && <span style={{ fontSize: 11, color: "#9ca3af" }}>at {fmtDwell(buyTsSec * 1000)}</span>}
                        </>
                      ) : (
                        <>
                          <span style={{ fontSize: 11, fontWeight: 700, padding: "4px 10px", borderRadius: 99, background: "#fff7ed", color: "#c2410c", whiteSpace: "nowrap" }}>✗ Buy not clicked</span>
                          <span style={{ fontSize: 11, color: "#9ca3af" }}>session ended without purchase</span>
                        </>
                      )}
                    </div>
                    {frictionText && (
                      <div style={{ background: "#fff7ed", borderLeft: "3px solid #fb923c", borderRadius: "0 8px 8px 0", padding: "7px 11px" }}>
                        <div style={{ fontSize: 10, fontWeight: 700, color: "#fb923c", textTransform: "uppercase", letterSpacing: 0.6, marginBottom: 3 }}>
                          🎙 {buyClicked ? "Decision trigger" : "What&apos;s blocking"}
                        </div>
                        <div style={{ fontSize: 12, color: "#374151", fontStyle: "italic", lineHeight: 1.45 }}>
                          &ldquo;{frictionText}&rdquo;
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Session link */}
                  {latestSession && (
                    <a href={`/admin/sessions/${latestSession.id}`} style={{
                      display: "flex", alignItems: "center", justifyContent: "space-between",
                      fontSize: 11, fontWeight: 600, textDecoration: "none",
                      padding: "8px 12px", borderRadius: 10,
                      background: c.light, color: c.text,
                    }}>
                      <span>Full session →</span>
                      <span style={{ fontWeight: 400, opacity: 0.6 }}>
                        {sessionDurSec
                          ? fmtDwell(sessionDurSec * 1000)
                          : new Date(latestSession.startedAt).toLocaleString("en-US", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}
                      </span>
                    </a>
                  )}
                </div>
              ) : (
                <div style={{ padding: "12px 20px 16px" }}>
                  <div style={{ fontSize: 11, color: "#9ca3af", fontStyle: "italic" }}>
                    {p.sessions.length === 0 ? "No sessions yet" : "Behavioral data not collected"}
                  </div>
                  <div style={{ fontSize: 11, color: "#9ca3af", marginTop: 4 }}>
                    {p.sessions.length} session(s) · created {new Date(p.createdAt).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {withoutSegment.length > 0 && (
        <div style={{ marginTop: 32 }}>
          <h2 style={{ fontSize: 14, fontWeight: 600, color: "#9ca3af", marginBottom: 12 }}>
            Incomplete screener ({withoutSegment.length})
          </h2>
          <div style={{ background: "#f9fafb", border: "1px solid #e5e7eb", borderRadius: 10, overflow: "hidden" }}>
            {withoutSegment.map((p, i) => (
              <div key={p.id} style={{
                padding: "10px 16px", fontSize: 12, color: "#6b7280",
                borderBottom: i < withoutSegment.length - 1 ? "1px solid #e5e7eb" : "none",
                display: "flex", justifyContent: "space-between",
              }}>
                <span>{p.project.name}</span>
                <span>{new Date(p.createdAt).toLocaleString("en-US", { month: "short", day: "numeric" })}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ── Sub-components ─────────────────────────────────────────────────────────────

function PRow({ icon, label, value }: { icon: string; label: string; value: string }) {
  if (!value) return null;
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 9, fontSize: 12, color: "#374151" }}>
      <span style={{ fontSize: 14, width: 18, textAlign: "center", flexShrink: 0 }}>{icon}</span>
      <span style={{ color: "#9ca3af" }}>{label}</span>
      <span style={{ fontWeight: 500 }}>{value}</span>
    </div>
  );
}

function JRow({ label, color, value }: { label: string; color: string; value: string }) {
  return (
    <div style={{ display: "flex", gap: 8, marginBottom: 6, fontSize: 12, lineHeight: 1.45 }}>
      <span style={{ fontWeight: 700, flexShrink: 0, width: 64, color }}>{label}</span>
      <span style={{ color: "#374151", fontStyle: "italic" }}>{value}</span>
    </div>
  );
}
