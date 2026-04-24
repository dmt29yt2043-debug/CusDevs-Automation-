"use client";

import { useParams, useRouter } from "next/navigation";
import { useEffect, useState, useRef, useCallback } from "react";

// ── Types ─────────────────────────────────────────────────────────────────────

type Phase =
  | "loading"
  | "impression"       // Q1 — first impression
  | "task"             // 30s task + countdown
  | "analyzing"        // 1-2s: computing behavior question
  | "zone_reasoning"   // Q2 — which zones and why
  | "event_reasoning"  // Q3 — why this event (only if events opened)
  | "friction"         // Q4 — what's blocking final decision
  | "done";

interface SessionInfo { sessionId: string; scenarioId: string; }

// ── Research tracker event (from pulseup.me via postMessage) ──────────────────

interface TrackerEvent {
  __research: true;
  type: string;
  session_id: string;
  ts: number;
  abs_ts: number;
  zone?: string;
  prev_zone?: string;
  dwell_ms?: number;
  event_id?: string;
  scroll_depth?: number;
  favorite?: boolean;
  favorite_type?: "intentional" | "accidental";
}

// ── Behavioral data structures ────────────────────────────────────────────────

interface ZoneVisit {
  zone:      string;
  dwell_ms:  number;
  enter_ts:  number;
}

interface EventBehavior {
  event_id:       string;
  dwell_ms:       number;
  scroll_depth:   number;
  favorite:       boolean;
  favorite_type:  "intentional" | "accidental" | null;
  opened_count:   number;
}

interface DecisionMetrics {
  purchase_proxy_score: number;
  decision_type:        "fast" | "exploratory" | "overwhelmed" | "passive";
  buy_clicked:          boolean;
  buy_ts_sec:           number | null;
}

// ── SpeechRecognition shim ─────────────────────────────────────────────────────

interface SR_Type extends EventTarget {
  continuous: boolean; interimResults: boolean; lang: string;
  start(): void; stop(): void;
  onresult: ((e: SR_TypeEvent) => void) | null;
  onerror:  ((e: Event) => void) | null;
  onend:    (() => void) | null;
}
interface SR_TypeEvent      extends Event { results: SR_TypeResultList; }
interface SR_TypeResultList { readonly length: number; [i: number]: SR_TypeResult; }
interface SR_TypeResult     { readonly isFinal: boolean; [i: number]: { transcript: string }; }
type WinSR = Window & {
  SpeechRecognition?:       new () => SR_Type;
  webkitSpeechRecognition?: new () => SR_Type;
};
function getSR() {
  const w = window as WinSR;
  return w.SpeechRecognition ?? w.webkitSpeechRecognition;
}

// ── Purchase Proxy Score engine ───────────────────────────────────────────────

function computeScore(
  path: ZoneVisit[],
  events: Record<string, EventBehavior>,
  buyClicked: boolean,
): { score: number; decision_type: DecisionMetrics["decision_type"] } {
  let score = 0;

  const eventList   = Object.values(events);
  const opened      = eventList.filter(e => e.opened_count > 0);
  const deepRead    = eventList.filter(e => e.scroll_depth >= 70);
  const intentional = eventList.filter(e => e.favorite && e.favorite_type === "intentional");
  const zones       = new Set(path.map(v => v.zone));

  // +30 opened event page
  if (opened.length > 0)        score += 30;
  // +25 high scroll depth
  if (deepRead.length > 0)      score += 25;
  // +25 intentional favorite
  if (intentional.length > 0)   score += 25;
  // +10 used filters or calendar
  if (zones.has("filters") || zones.has("calendar")) score += 10;
  // +10 structured path (no chaotic looping — unique zones / total > 0.5)
  const totalVisits  = path.length;
  const uniqueZones  = zones.size;
  if (totalVisits > 0 && uniqueZones / totalVisits > 0.5) score += 10;
  // bought → near-certainty
  if (buyClicked)               score += 20;

  // penalties
  if (opened.length === 0)      score -= 30;  // only feed
  if (totalVisits > 0 && uniqueZones / totalVisits < 0.3) score -= 20; // chaotic
  if (totalVisits === 0)        score -= 15;  // no interaction

  score = Math.max(0, Math.min(100, score));

  // decision type
  let decision_type: DecisionMetrics["decision_type"] = "passive";
  if (buyClicked || (opened.length >= 1 && totalVisits <= 4)) {
    decision_type = "fast";
  } else if (uniqueZones >= 3 && totalVisits >= 4) {
    decision_type = "exploratory";
  } else if (zones.has("filters") && totalVisits > 6) {
    decision_type = "overwhelmed";
  } else if (opened.length >= 1) {
    decision_type = "exploratory";
  }

  return { score, decision_type };
}

// ── Behavior question builder (deterministic fallback) ─────────────────────────

function buildZoneQuestion(path: ZoneVisit[], events: Record<string, EventBehavior>): string {
  const zones   = new Set(path.map(v => v.zone));
  const pathStr = path.map(v => v.zone).join(" → ");
  const opened  = Object.values(events).filter(e => e.opened_count > 0).length;

  if (zones.has("filters") && zones.has("calendar")) {
    return `We noticed you went through: ${pathStr}. You used both filters and the calendar — what were you trying to narrow down? Age, timing, or something else?`;
  }
  if (zones.has("filters")) {
    const fd = path.find(v => v.zone === "filters");
    const sec = fd ? Math.round(fd.dwell_ms / 1000) : 0;
    return sec > 5
      ? `You spent ${sec} seconds in the filters (path: ${pathStr}). What were you trying to find that wasn't obvious from the main feed?`
      : `You went straight to filters — path: ${pathStr}. What were you looking to narrow down?`;
  }
  if (zones.has("calendar")) {
    return `You checked the calendar (path: ${pathStr}). Is timing the most important factor for you when choosing an event?`;
  }
  if (zones.has("chat")) {
    return `You used the AI assistant (path: ${pathStr}). What did you ask — were you looking for something specific you couldn't find in the feed?`;
  }
  if (zones.has("map")) {
    return `You checked the map (path: ${pathStr}). Is location a key factor in your decision?`;
  }
  if (opened >= 1) {
    return `You browsed through the cards (path: ${pathStr}). What made you open the ones you did — what were you looking for in them?`;
  }
  return `Your path was: ${pathStr}. Walk us through your thinking — what was guiding your decisions?`;
}

function buildEventQuestion(events: Record<string, EventBehavior>): string {
  const favEvents = Object.values(events).filter(e => e.favorite);
  const topEvent  = Object.values(events).sort((a, b) => b.dwell_ms - a.dwell_ms)[0];

  if (favEvents.length > 0) {
    return `You saved ${favEvents.length} event${favEvents.length > 1 ? "s" : ""} to favorites. What attracted you to those — what made them stand out from the rest?`;
  }
  if (topEvent && topEvent.dwell_ms > 10_000) {
    return `You spent a good amount of time on one event. What caught your attention — what were you looking for in it?`;
  }
  return `You opened some event pages. What were you looking for when you went inside — price, timing, activity type?`;
}

// ── Constants ──────────────────────────────────────────────────────────────────

const TASK_SECONDS = 30;
const RESEARCH_API = process.env.NEXT_PUBLIC_RESEARCH_URL || "";

// ── Main Component ─────────────────────────────────────────────────────────────

export default function TestPage() {
  const params    = useParams();
  const router    = useRouter();
  const projectId = params.projectId as string;

  // ── UI state ───────────────────────────────────────────────────────────────
  const [phase, setPhase]           = useState<Phase>("loading");
  const [testSiteUrl, setTestSiteUrl] = useState<string | null>(null);
  const [isRecording, setIsRecording] = useState(false);
  const [micError, setMicError]       = useState("");
  const [countdown, setCountdown]     = useState(TASK_SECONDS);
  const [liveTranscript, setLiveTranscript] = useState("");
  const [liveInterim, setLiveInterim]       = useState("");
  const [zoneQuestion, setZoneQuestion]     = useState("");
  const [eventQuestion, setEventQuestion]   = useState("");
  const [trackerReady, setTrackerReady]     = useState(false);

  // ── Session refs ───────────────────────────────────────────────────────────
  const sessionRef  = useRef<SessionInfo | null>(null);
  const phaseRef    = useRef<Phase>("loading");

  // ── Recording refs ─────────────────────────────────────────────────────────
  const streamRef      = useRef<MediaStream | null>(null);
  const recorderRef    = useRef<MediaRecorder | null>(null);
  const chunksRef      = useRef<Blob[]>([]);
  const recognitionRef = useRef<SR_Type | null>(null);
  const liveTextRef    = useRef("");

  // ── Per-question audio chunks ──────────────────────────────────────────────
  const q1ChunksRef  = useRef<Blob[]>([]);
  const q2ChunksRef  = useRef<Blob[]>([]);
  const q3ChunksRef  = useRef<Blob[]>([]);
  const q4ChunksRef  = useRef<Blob[]>([]);
  const activeQRef   = useRef<1|2|3|4>(1);

  // ── Behavioral data refs ───────────────────────────────────────────────────
  const behaviorPath   = useRef<ZoneVisit[]>([]);
  const eventBehavior  = useRef<Record<string, EventBehavior>>({});
  const buyClicked     = useRef(false);
  const buyTs          = useRef<number | null>(null);
  const currentZone    = useRef<string | null>(null);
  const taskStartTs    = useRef(0);

  // ── Voice transcripts per question ────────────────────────────────────────
  const impressionText     = useRef("");
  const zoneReasoningText  = useRef("");
  const eventReasoningText = useRef("");
  const frictionText       = useRef("");

  const countdownRef = useRef(TASK_SECONDS);
  const cdTimer      = useRef<ReturnType<typeof setInterval> | null>(null);
  const iframeRef    = useRef<HTMLIFrameElement>(null);

  // ── Init ───────────────────────────────────────────────────────────────────
  useEffect(() => {
    const stored = sessionStorage.getItem(`session-${projectId}`);
    if (!stored) { router.push(`/participant/${projectId}/welcome`); return; }
    const info = JSON.parse(stored) as SessionInfo;
    sessionRef.current = info;

    fetch(`/api/sessions/${info.sessionId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: "in_progress" }),
    });

    fetch(`/api/projects/${projectId}`)
      .then(r => r.json())
      .then((proj) => {
        let url = (proj.testSiteUrl as string) || "";
        if (url) {
          try {
            const u = new URL(url.replace(/\/$/, "") + "/");
            u.searchParams.set("research_session", info.sessionId);
            // Pass screener params
            const screenerRaw = sessionStorage.getItem(`screener-params-${projectId}`);
            if (screenerRaw) {
              const p = JSON.parse(screenerRaw) as Record<string, string>;
              if (p.child_age) u.searchParams.set("child_age", p.child_age);
              if (p.city)      u.searchParams.set("city",      p.city);
            }
            url = u.toString();
          } catch { /* ok */ }
        }
        setTestSiteUrl(url);
      });

    return () => { cleanup(); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Auto-start impression once URL ready ──────────────────────────────────
  useEffect(() => {
    if (testSiteUrl && phase === "loading") {
      void beginImpression();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [testSiteUrl]);

  // ── postMessage listener (events from research-tracker.ts) ────────────────
  useEffect(() => {
    const onMessage = (e: MessageEvent) => {
      const data = e.data as TrackerEvent;
      if (!data?.__research) return;

      const info = sessionRef.current;
      if (!info) return;
      if (data.session_id !== info.sessionId) return;

      switch (data.type) {

        case "tracker_ready":
          setTrackerReady(true);
          break;

        case "zone_enter":
          currentZone.current = data.zone ?? null;
          break;

        case "zone_exit":
          if (data.zone && data.dwell_ms !== undefined) {
            behaviorPath.current.push({
              zone:      data.zone,
              dwell_ms:  data.dwell_ms,
              enter_ts:  data.abs_ts - data.dwell_ms,
            });
          }
          break;

        case "event_opened": {
          const eid = data.event_id!;
          if (!eventBehavior.current[eid]) {
            eventBehavior.current[eid] = {
              event_id:      eid,
              dwell_ms:      0,
              scroll_depth:  0,
              favorite:      false,
              favorite_type: null,
              opened_count:  0,
            };
          }
          eventBehavior.current[eid].opened_count += 1;
          break;
        }

        case "event_closed": {
          const eid = data.event_id!;
          if (eventBehavior.current[eid]) {
            eventBehavior.current[eid].dwell_ms   += data.dwell_ms ?? 0;
            eventBehavior.current[eid].scroll_depth = Math.max(
              eventBehavior.current[eid].scroll_depth,
              data.scroll_depth ?? 0,
            );
          }
          break;
        }

        case "scroll_depth": {
          const eid = data.event_id!;
          if (eventBehavior.current[eid]) {
            eventBehavior.current[eid].scroll_depth = Math.max(
              eventBehavior.current[eid].scroll_depth,
              data.scroll_depth ?? 0,
            );
          }
          break;
        }

        case "favorite_toggled": {
          const eid = data.event_id!;
          if (eventBehavior.current[eid]) {
            eventBehavior.current[eid].favorite      = data.favorite ?? false;
            eventBehavior.current[eid].favorite_type = data.favorite_type ?? null;
          }
          break;
        }

        case "buy_clicked": {
          buyClicked.current = true;
          buyTs.current = data.ts;
          break;
        }
      }
    };

    window.addEventListener("message", onMessage);
    return () => window.removeEventListener("message", onMessage);
  }, []);

  // ── STEP 1: First impression ───────────────────────────────────────────────
  async function beginImpression() {
    setPhaseSync("impression");
    activeQRef.current = 1;
    liveTextRef.current = "";
    setLiveTranscript(""); setLiveInterim("");

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      startRecorder(stream, q1ChunksRef);
      startSR((final, interim) => {
        liveTextRef.current = final;
        setLiveTranscript(final);
        setLiveInterim(interim);
      });
      setIsRecording(true);
    } catch {
      setMicError("Microphone unavailable. Please allow access in browser settings.");
    }
  }

  // ── STEP 1 → Task ─────────────────────────────────────────────────────────
  const handleImpressionNext = useCallback(async () => {
    impressionText.current = liveTextRef.current;
    stopSR();

    const info = sessionRef.current;
    if (info) {
      const audioUrl = await uploadAudio(q1ChunksRef.current, info.sessionId, "q1_impression");
      void saveVoiceEvent(info.sessionId, "What's your first impression of the options you see?",
        impressionText.current || null, audioUrl, "first_impression");
    }

    setPhaseSync("task");
    liveTextRef.current = "";
    setLiveTranscript(""); setLiveInterim("");
    countdownRef.current = TASK_SECONDS;
    setCountdown(TASK_SECONDS);
    taskStartTs.current = Date.now();

    cdTimer.current = setInterval(() => {
      countdownRef.current -= 1;
      setCountdown(countdownRef.current);
      if (countdownRef.current <= 0) {
        if (cdTimer.current) clearInterval(cdTimer.current);
        void beginAnalysis();
      }
    }, 1000);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── End of task → analyze ─────────────────────────────────────────────────
  async function beginAnalysis() {
    setPhaseSync("analyzing");
    stopSR();

    const path   = behaviorPath.current;
    const events = eventBehavior.current;

    // Build zone question
    const zq = buildZoneQuestion(path, events);
    setZoneQuestion(zq);

    // Build event question (if events were opened)
    const eventsOpened = Object.values(events).filter(e => e.opened_count > 0);
    if (eventsOpened.length > 0) {
      setEventQuestion(buildEventQuestion(events));
    }

    // Start Q2 recording
    activeQRef.current = 2;
    liveTextRef.current = "";
    setLiveTranscript(""); setLiveInterim("");
    if (streamRef.current) {
      startRecorder(streamRef.current, q2ChunksRef);
      startSR((final, interim) => {
        liveTextRef.current = final;
        setLiveTranscript(final);
        setLiveInterim(interim);
      });
    }

    setPhaseSync("zone_reasoning");
  }

  // ── Q2 Next → Q3 or Q4 ────────────────────────────────────────────────────
  const handleZoneReasoningNext = useCallback(async () => {
    zoneReasoningText.current = liveTextRef.current;
    stopSR();

    const info = sessionRef.current;
    if (info) {
      const audioUrl = await uploadAudio(q2ChunksRef.current, info.sessionId, "q2_zone_reasoning");
      void saveVoiceEvent(info.sessionId, zoneQuestion, zoneReasoningText.current || null,
        audioUrl, "zone_reasoning");
    }

    const eventsOpened = Object.values(eventBehavior.current).filter(e => e.opened_count > 0);

    if (eventsOpened.length > 0) {
      // Go to Q3
      activeQRef.current = 3;
      liveTextRef.current = "";
      setLiveTranscript(""); setLiveInterim("");
      if (streamRef.current) {
        startRecorder(streamRef.current, q3ChunksRef);
        startSR((final, interim) => {
          liveTextRef.current = final;
          setLiveTranscript(final);
          setLiveInterim(interim);
        });
      }
      setPhaseSync("event_reasoning");
    } else {
      // Skip to Q4
      void beginFriction();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [zoneQuestion]);

  // ── Q3 Next → Q4 ──────────────────────────────────────────────────────────
  const handleEventReasoningNext = useCallback(async () => {
    eventReasoningText.current = liveTextRef.current;
    stopSR();

    const info = sessionRef.current;
    if (info) {
      const audioUrl = await uploadAudio(q3ChunksRef.current, info.sessionId, "q3_event_reasoning");
      void saveVoiceEvent(info.sessionId, eventQuestion, eventReasoningText.current || null,
        audioUrl, "event_reasoning");
    }

    void beginFriction();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [eventQuestion]);

  // ── Q4: Friction ──────────────────────────────────────────────────────────
  async function beginFriction() {
    activeQRef.current = 4;
    liveTextRef.current = "";
    setLiveTranscript(""); setLiveInterim("");
    if (streamRef.current) {
      startRecorder(streamRef.current, q4ChunksRef);
      startSR((final, interim) => {
        liveTextRef.current = final;
        setLiveTranscript(final);
        setLiveInterim(interim);
      });
    }
    setPhaseSync("friction");
  }

  // ── Q4 Next → Done ────────────────────────────────────────────────────────
  const handleFrictionNext = useCallback(async () => {
    frictionText.current = liveTextRef.current;
    stopSR();

    const info = sessionRef.current;
    if (!info) { router.push(`/participant/${projectId}/thank-you`); return; }

    const frictionQ = buyClicked.current
      ? "You clicked Buy Ticket — what made you decide? What was the final trigger?"
      : "What's missing for you to make a final decision?";

    const audioUrl = await uploadAudio(q4ChunksRef.current, info.sessionId, "q4_friction");
    void saveVoiceEvent(info.sessionId, frictionQ, frictionText.current || null,
      audioUrl, "friction");

    // Compute scores
    const path   = behaviorPath.current;
    const events = eventBehavior.current;
    const { score, decision_type } = computeScore(path, events, buyClicked.current);

    const eventsViewedCount = Object.values(events).filter(e => e.opened_count > 0).length;
    const eventsSavedCount  = Object.values(events).filter(e => e.favorite).length;

    void fetch(`/api/sessions/${info.sessionId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        status: "completed",
        durationSec: Math.round((Date.now() - taskStartTs.current) / 1000),
        metadataJson: {
          voice_data: {
            first_impression:  { transcript: impressionText.current  || null },
            zone_reasoning:    { transcript: zoneReasoningText.current  || null },
            event_reasoning:   { transcript: eventReasoningText.current || null },
            friction:          { transcript: frictionText.current    || null },
          },
          behavior_path:   path,
          zone_metrics:    buildZoneMetrics(path),
          event_behavior:  Object.values(events),
          events_viewed:   eventsViewedCount,
          events_saved:    eventsSavedCount,
          buy_clicked:     buyClicked.current,
          buy_ts_sec:      buyTs.current !== null ? Math.round(buyTs.current / 1000) : null,
          decision_type,
          purchase_proxy_score: score,
        },
      }),
    });

    cleanup();
    router.push(`/participant/${projectId}/thank-you`);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [projectId, router]);

  // ── Helpers ────────────────────────────────────────────────────────────────

  function buildZoneMetrics(path: ZoneVisit[]): Record<string, { visited: boolean; dwell_ms: number }> {
    const zones = ["event_feed", "filters", "chat", "map", "calendar", "event_page"] as const;
    const result: Record<string, { visited: boolean; dwell_ms: number }> = {};
    for (const z of zones) {
      const visits = path.filter(v => v.zone === z);
      result[z] = {
        visited:  visits.length > 0,
        dwell_ms: visits.reduce((sum, v) => sum + v.dwell_ms, 0),
      };
    }
    return result;
  }

  // ── Recording helpers ──────────────────────────────────────────────────────

  function startRecorder(stream: MediaStream, chunksRef: React.MutableRefObject<Blob[]>) {
    if (recorderRef.current && recorderRef.current.state !== "inactive") {
      recorderRef.current.stop();
    }
    const mime = MediaRecorder.isTypeSupported("audio/webm;codecs=opus")
      ? "audio/webm;codecs=opus" : "audio/webm";
    const mr = new MediaRecorder(stream, { mimeType: mime });
    chunksRef.current = [];
    mr.ondataavailable = e => {
      if (e.data.size > 0) {
        chunksRef.current.push(e.data);
      }
    };
    mr.start(500);
    recorderRef.current = mr;
  }

  function startSR(onResult: (final: string, interim: string) => void) {
    stopSR();
    const SR = getSR();
    if (!SR) return;
    const rec = new SR();
    rec.continuous = true; rec.interimResults = true; rec.lang = "en-US";
    let acc = "";
    rec.onresult = (e: SR_TypeEvent) => {
      let chunk = ""; let interim = "";
      for (let i = 0; i < e.results.length; i++) {
        if (e.results[i].isFinal) chunk += e.results[i][0].transcript + " ";
        else interim += e.results[i][0].transcript;
      }
      if (chunk) acc += chunk;
      onResult(acc, interim);
    };
    rec.onend = () => {
      if (recognitionRef.current !== rec) return; // ghost SR guard
      const p = phaseRef.current;
      if (["impression", "zone_reasoning", "event_reasoning", "friction"].includes(p)) {
        try { rec.start(); } catch { /* stopped cleanly */ }
      }
    };
    rec.onerror = () => {};
    try { rec.start(); } catch { /* no mic */ }
    recognitionRef.current = rec;
  }

  function stopSR() {
    try { recognitionRef.current?.stop(); } catch {}
    recognitionRef.current = null;
  }

  async function uploadAudio(chunks: Blob[], sessionId: string, stepId: string): Promise<string | null> {
    if (chunks.length === 0) return null;
    try {
      const blob = new Blob(chunks, { type: "audio/webm" });
      if (blob.size < 500) return null;
      const fd = new FormData();
      fd.append("file", blob, `${stepId}.webm`);
      fd.append("sessionId", sessionId);
      fd.append("stepId", stepId);
      const res = await fetch("/api/audio", { method: "POST", body: fd });
      if (!res.ok) return null;
      const data = await res.json() as { url?: string };
      return data.url ?? null;
    } catch {
      return null;
    }
  }

  async function saveVoiceEvent(
    sessionId: string,
    question: string,
    transcript: string | null,
    audioUrl: string | null,
    triggerId: string,
  ) {
    await fetch("/api/voice-events", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        sessionId,
        question,
        transcript,
        audioUrl,
        contextEvent: {
          triggerId,
          zone:        currentZone.current,
          buyClicked:  buyClicked.current,
          eventsViewed: Object.values(eventBehavior.current).filter(e => e.opened_count > 0).length,
          behaviorPath: behaviorPath.current.map(v => v.zone),
        },
      }),
    }).catch(() => {});
  }

  function cleanup() {
    stopSR();
    if (recorderRef.current && recorderRef.current.state !== "inactive") {
      recorderRef.current.stop();
    }
    streamRef.current?.getTracks().forEach(t => t.stop());
    if (cdTimer.current) clearInterval(cdTimer.current);
    setIsRecording(false);
  }

  function setPhaseSync(p: Phase) {
    phaseRef.current = p;
    setPhase(p);
  }

  // ── Render ─────────────────────────────────────────────────────────────────

  if (!testSiteUrl) {
    return (
      <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "#0f0d2e" }}>
        <style>{`@keyframes spin-init { to{transform:rotate(360deg)} }`}</style>
        <div style={{ textAlign: "center" }}>
          <div style={{ width: 36, height: 36, border: "3px solid rgba(124,58,237,.2)", borderTopColor: "#7c3aed", borderRadius: "50%", animation: "spin-init .9s linear infinite", margin: "0 auto 12px" }} />
          <div style={{ color: "#6b7280", fontSize: 13 }}>Loading…</div>
        </div>
      </div>
    );
  }

  return (
    <div style={{ position: "relative", width: "100vw", height: "100vh", overflow: "hidden" }}>
      <style>{`
        @keyframes rec-pulse   { 0%,100%{opacity:1} 50%{opacity:.3} }
        @keyframes mic-breathe { 0%,100%{transform:scale(1);opacity:1} 50%{transform:scale(1.2);opacity:.6} }
        @keyframes ring-pulse  { 0%{transform:scale(1);opacity:.5} 100%{transform:scale(2);opacity:0} }
        @keyframes slide-up    { from{transform:translateY(24px);opacity:0} to{transform:translateY(0);opacity:1} }
        @keyframes spin-a      { to{transform:rotate(360deg)} }
      `}</style>

      {/* ── Test site iframe ── */}
      <iframe
        ref={iframeRef}
        src={testSiteUrl}
        title="Test site"
        style={{ width: "100%", height: "100%", border: "none", display: "block" }}
        allow="microphone; camera; geolocation"
      />

      {/* ── Tracker status pill ── */}
      {trackerReady && phase === "task" && (
        <div style={{
          position: "fixed", top: 12, left: 56, zIndex: 9998,
          fontSize: 10, color: "#34d399", fontWeight: 600,
          background: "rgba(15,13,46,0.85)", backdropFilter: "blur(8px)",
          border: "1px solid rgba(52,211,153,0.2)", borderRadius: 99,
          padding: "4px 10px", pointerEvents: "none",
        }}>
          ● tracking
        </div>
      )}

      {/* ── REC pill ── */}
      {isRecording && (
        <div style={{
          position: "fixed", top: 12, left: 16, zIndex: 9998,
          display: "flex", alignItems: "center", gap: 6,
          background: "rgba(15,13,46,0.9)", backdropFilter: "blur(8px)",
          border: "1px solid rgba(255,255,255,0.08)", borderRadius: 99,
          padding: "5px 14px", fontSize: 11, color: "#9ca3af",
          pointerEvents: "none",
        }}>
          <span style={{ width: 7, height: 7, borderRadius: "50%", background: "#e91e63", display: "inline-block", animation: "rec-pulse 1.4s ease-in-out infinite" }} />
          REC
        </div>
      )}

      {/* ── Q1: First impression ── */}
      {phase === "impression" && (
        <VoiceCard
          step={1} total={4}
          badge="First impression"
          question="What's your first impression of the options you see?"
          transcript={liveTranscript}
          interim={liveInterim}
          onNext={handleImpressionNext}
        />
      )}

      {/* ── Task countdown ── */}
      {phase === "task" && (
        <TaskOverlay countdown={countdown} total={TASK_SECONDS} />
      )}

      {/* ── Analyzing ── */}
      {phase === "analyzing" && (
        <div style={{
          position: "fixed", bottom: 100, right: 24, zIndex: 10000,
          background: "linear-gradient(145deg,#2d2a5e,#1a1745)",
          border: "1px solid rgba(124,58,237,0.35)", borderRadius: 16,
          padding: "20px 24px", textAlign: "center", minWidth: 240,
          boxShadow: "0 8px 40px rgba(0,0,0,0.5)", animation: "slide-up .3s ease-out",
        }}>
          <div style={{ width: 30, height: 30, border: "3px solid rgba(124,58,237,.2)", borderTopColor: "#7c3aed", borderRadius: "50%", animation: "spin-a .9s linear infinite", margin: "0 auto 12px" }} />
          <p style={{ fontSize: 13, color: "#a78bfa", fontWeight: 600, margin: "0 0 3px" }}>Analyzing your behavior…</p>
          <p style={{ fontSize: 11, color: "#6b7280", margin: 0 }}>One moment</p>
        </div>
      )}

      {/* ── Q2: Zone reasoning ── */}
      {phase === "zone_reasoning" && (
        <VoiceCard
          step={2} total={4}
          badge="Your path"
          question={zoneQuestion}
          transcript={liveTranscript}
          interim={liveInterim}
          onNext={handleZoneReasoningNext}
        />
      )}

      {/* ── Q3: Event reasoning ── */}
      {phase === "event_reasoning" && (
        <VoiceCard
          step={3} total={4}
          badge="Event choice"
          question={eventQuestion}
          transcript={liveTranscript}
          interim={liveInterim}
          onNext={handleEventReasoningNext}
        />
      )}

      {/* ── Q4: Friction ── */}
      {phase === "friction" && (
        <VoiceCard
          step={4} total={4}
          badge={buyClicked.current ? "Decision" : "Friction"}
          question={
            buyClicked.current
              ? "You clicked Buy Ticket — what made you decide? What was the final trigger?"
              : "What's missing for you to make a final decision?"
          }
          transcript={liveTranscript}
          interim={liveInterim}
          onNext={handleFrictionNext}
        />
      )}

      {/* ── Mic error ── */}
      {micError && (
        <div style={{
          position: "fixed", bottom: 12, left: 16, zIndex: 9998,
          fontSize: 12, color: "#f87171",
          background: "rgba(15,13,46,.9)", padding: "6px 14px", borderRadius: 8,
        }}>
          {micError}
        </div>
      )}
    </div>
  );
}

// ── VoiceCard ─────────────────────────────────────────────────────────────────

function VoiceCard({
  step, total, badge, question, transcript, interim, onNext,
}: {
  step: number; total: number;
  badge: string; question: string;
  transcript: string; interim: string;
  onNext: () => void;
}) {
  return (
    <div style={{
      position: "fixed", bottom: 100, right: 24, zIndex: 10000,
      width: 340,
      background: "linear-gradient(145deg,#2d2a5e,#1a1745)",
      border: "1px solid rgba(233,30,99,0.3)",
      borderRadius: 20,
      boxShadow: "0 12px 50px rgba(0,0,0,0.55)",
      overflow: "hidden",
      animation: "slide-up .35s ease-out",
    }}>
      <div style={{ padding: "14px 18px 0", display: "flex", alignItems: "center", gap: 10 }}>
        <span style={{ fontSize: 22 }}>🦉</span>
        <div>
          <div style={{ fontSize: 13, fontWeight: 700, color: "#fff" }}>Hugo</div>
          <div style={{ fontSize: 10, color: "#7c3aed", fontWeight: 600, letterSpacing: 0.5, textTransform: "uppercase" }}>
            {step} / {total} · {badge}
          </div>
        </div>
        <div style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: 5, fontSize: 11, color: "#9ca3af" }}>
          <span style={{ width: 6, height: 6, borderRadius: "50%", background: "#e91e63", display: "inline-block", animation: "rec-pulse 1.4s ease-in-out infinite" }} />
          Listening
        </div>
      </div>

      <div style={{ padding: "12px 18px 18px" }}>
        {/* Step dots */}
        <div style={{ display: "flex", gap: 4, marginBottom: 12 }}>
          {Array.from({ length: total }, (_, i) => (
            <div key={i} style={{
              flex: 1, height: 3, borderRadius: 99,
              background: i < step ? "#7c3aed" : "rgba(255,255,255,0.1)",
              transition: "background .3s",
            }} />
          ))}
        </div>

        <p style={{ fontSize: 15, lineHeight: 1.6, color: "#f3f4f6", margin: "0 0 16px", fontWeight: 500 }}>
          {question}
        </p>

        <div style={{
          background: "rgba(233,30,99,0.07)",
          border: "1px solid rgba(233,30,99,0.18)",
          borderRadius: 14, padding: "14px 16px", marginBottom: 14, minHeight: 80,
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: transcript || interim ? 10 : 0 }}>
            <div style={{ position: "relative", flexShrink: 0 }}>
              <div style={{ width: 12, height: 12, borderRadius: "50%", background: "#e91e63", animation: "mic-breathe 1.4s ease-in-out infinite" }} />
              <div style={{ position: "absolute", inset: "-4px", borderRadius: "50%", border: "1px solid rgba(233,30,99,0.5)", animation: "ring-pulse 1.4s ease-out infinite" }} />
            </div>
            <span style={{ fontSize: 12, color: "#9ca3af" }}>Speak your answer</span>
          </div>

          {(transcript || interim) ? (
            <p style={{ fontSize: 13, color: "#e5e7eb", margin: 0, lineHeight: 1.6 }}>
              {transcript}
              {interim && <span style={{ color: "#6b7280", fontStyle: "italic" }}>{interim}</span>}
            </p>
          ) : (
            <p style={{ fontSize: 12, color: "#4b5563", fontStyle: "italic", margin: "4px 0 0" }}>
              Your words will appear here…
            </p>
          )}
        </div>

        <button
          onClick={onNext}
          style={{
            width: "100%", padding: "13px 0",
            background: "linear-gradient(135deg,#7c3aed,#e91e63)",
            border: "none", borderRadius: 12,
            color: "#fff", fontSize: 14, fontWeight: 700, cursor: "pointer",
            letterSpacing: 0.3,
          }}
        >
          {step < total ? "Next →" : "Finish ✓"}
        </button>
      </div>
    </div>
  );
}

// ── TaskOverlay ───────────────────────────────────────────────────────────────

function TaskOverlay({ countdown, total }: { countdown: number; total: number }) {
  const pct      = (countdown / total) * 100;
  const isUrgent = countdown <= 8;

  return (
    <div style={{
      position: "fixed", bottom: 100, right: 24, zIndex: 10000,
      width: 300,
      background: "linear-gradient(145deg,#2d2a5e,#1a1745)",
      border: `1px solid ${isUrgent ? "rgba(233,30,99,0.5)" : "rgba(124,58,237,0.3)"}`,
      borderRadius: 20,
      boxShadow: "0 12px 50px rgba(0,0,0,0.55)",
      padding: "18px 20px",
      animation: "slide-up .35s ease-out",
    }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 14 }}>
        <span style={{ fontSize: 20 }}>🎯</span>
        <div>
          <div style={{ fontSize: 12, color: "#7c3aed", fontWeight: 600, letterSpacing: 0.5, textTransform: "uppercase", marginBottom: 2 }}>Your task</div>
          <div style={{ fontSize: 14, color: "#f3f4f6", fontWeight: 600 }}>Find an event for your child</div>
        </div>
      </div>

      <div style={{ textAlign: "center", marginBottom: 14 }}>
        <div style={{
          fontSize: 52, fontWeight: 800, lineHeight: 1,
          color: isUrgent ? "#e91e63" : "#fff",
          transition: "color .3s",
          fontVariantNumeric: "tabular-nums",
        }}>
          {countdown}
        </div>
        <div style={{ fontSize: 11, color: "#6b7280", marginTop: 4 }}>seconds remaining</div>
      </div>

      <div style={{ height: 5, background: "rgba(255,255,255,0.08)", borderRadius: 99, overflow: "hidden" }}>
        <div style={{
          height: "100%", borderRadius: 99,
          width: `${pct}%`,
          background: isUrgent
            ? "linear-gradient(90deg,#e91e63,#ff6090)"
            : "linear-gradient(90deg,#7c3aed,#a78bfa)",
          transition: "width 1s linear, background .3s",
        }} />
      </div>

      <p style={{ fontSize: 11, color: "#4b5563", textAlign: "center", margin: "10px 0 0" }}>
        Browse freely — we&apos;re tracking your path
      </p>
    </div>
  );
}
