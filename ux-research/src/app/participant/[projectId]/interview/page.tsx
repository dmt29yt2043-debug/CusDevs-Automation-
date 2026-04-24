"use client";

import { useParams, useRouter } from "next/navigation";
import { useState, useEffect, useRef, useCallback } from "react";
import Image from "next/image";
import HeroCharacter, { HeroMood } from "@/components/interview/HeroCharacter";

// ─── Types ────────────────────────────────────────────────────────────────────

type Phase =
  | "loading"
  | "frequency"
  | "record-intro"
  | "record"
  | "processing"
  | "jtbd-result"
  | "editing"
  | "done";

interface JtbdData {
  situation: string;
  action:    string;
  outcome:   string;
  feeling:   string;
}

const EMPTY_JTBD: JtbdData = { situation: "", action: "", outcome: "", feeling: "" };

const FREQUENCY_OPTIONS = [
  { value: "almost_never", label: "Almost never" },
  { value: "rarely",       label: "Rarely — once every few months" },
  { value: "monthly",      label: "Once a month" },
  { value: "biweekly",     label: "Every 1–2 weeks" },
  { value: "weekly",       label: "Every week" },
];

// 4 sequential prompts shown during one continuous recording
const JTBD_STEPS = [
  {
    num: 1, field: "situation" as keyof JtbdData,
    color: "#a78bfa",
    label: "When something changes",
    subLabel: "plans fall through / it gets boring / a free window appears",
    hint: `e.g. "It's the weekend, plans fell through, and the kids are getting restless..."`,
  },
  {
    num: 2, field: "action" as keyof JtbdData,
    color: "#f472b6",
    label: "I need to",
    subLabel: "quickly decide where to go / what to do",
    hint: `e.g. "Find something to do quickly without spending hours searching..."`,
  },
  {
    num: 3, field: "outcome" as keyof JtbdData,
    color: "#34d399",
    label: "So I can",
    subLabel: "what do you want to get out of it?",
    hint: `e.g. "Have a clear plan and get out of the house with something that works for everyone..."`,
  },
  {
    num: 4, field: "feeling" as keyof JtbdData,
    color: "#fbbf24",
    label: "And feel",
    subLabel: "how will you feel when it works?",
    hint: `e.g. "Calm, confident, in control — like I turned chaos into a good moment for the family..."`,
  },
];

// ─── Speech Recognition types ──────────────────────────────────────────────────
declare global {
  interface Window {
    SpeechRecognition: new () => SpeechRecognition;
    webkitSpeechRecognition: new () => SpeechRecognition;
  }
}
interface SpeechRecognition extends EventTarget {
  continuous: boolean; interimResults: boolean; lang: string;
  start(): void; stop(): void;
  onresult: ((e: SpeechRecognitionEvent) => void) | null;
  onerror:  ((e: Event) => void) | null;
  onend:    (() => void) | null;
}
interface SpeechRecognitionEvent extends Event { results: SpeechRecognitionResultList; }
interface SpeechRecognitionResultList { readonly length: number; [i: number]: SpeechRecognitionResult; }
interface SpeechRecognitionResult { readonly isFinal: boolean; [i: number]: SpeechRecognitionAlternative; }
interface SpeechRecognitionAlternative { readonly transcript: string; }

// ─── Component ────────────────────────────────────────────────────────────────

export default function InterviewPage() {
  const params    = useParams();
  const router    = useRouter();
  const projectId = params.projectId as string;

  const [interviewId, setInterviewId]   = useState<string | null>(null);
  const [phase, setPhase]               = useState<Phase>("loading");
  const [heroMood, setHeroMood]         = useState<HeroMood>("neutral");
  const [heroTalking, setHeroTalking]   = useState(false);
  const [frequency, setFrequency]       = useState("");

  // Recording state
  const [isRecording, setIsRecording]   = useState(false);
  const [recordSecs, setRecordSecs]     = useState(0);
  const [transcript, setTranscript]     = useState("");
  const [interimText, setInterimText]   = useState("");
  const [micError, setMicError]         = useState("");

  // Step-through during single recording (0–3)
  const [stepIndex, setStepIndex]       = useState(0);

  // Assembled JTBD
  const [jtbd, setJtbd]         = useState<JtbdData>({ ...EMPTY_JTBD });
  const [editJtbd, setEditJtbd] = useState<JtbdData>({ ...EMPTY_JTBD });

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef        = useRef<Blob[]>([]);
  const timerRef         = useRef<ReturnType<typeof setInterval> | null>(null);
  const streamRef        = useRef<MediaStream | null>(null);
  const recognitionRef   = useRef<SpeechRecognition | null>(null);
  const finalTranscript  = useRef("");
  // Transcript snapshot at each step boundary
  const stepSnapshots    = useRef<string[]>([]);

  const currentStep = JTBD_STEPS[stepIndex];

  // ── Init ──
  useEffect(() => {
    const stored = sessionStorage.getItem(`session-${projectId}`);
    if (!stored) { router.replace(`/participant/${projectId}/welcome`); return; }
    const { participantId } = JSON.parse(stored) as { participantId: string };
    fetch("/api/jtbd", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ participantId }),
    }).then(r => r.json()).then((data: { id: string }) => {
      setInterviewId(data.id);
      setHeroMood("happy"); setHeroTalking(true);
      // Use functional update — only advance if still on "loading",
      // so a fast user click never gets overridden
      setTimeout(() => {
        setHeroTalking(false);
        setPhase(prev => prev === "loading" ? "frequency" : prev);
      }, 1200);
    }).catch(() => {
      // API failed — just move to frequency so user isn't stuck
      setPhase("frequency");
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => () => { stopRecording(true); if (timerRef.current) clearInterval(timerRef.current); }, []);// eslint-disable-line

  // ── Recording ──
  async function startRecording() {
    setMicError("");
    finalTranscript.current = "";
    stepSnapshots.current   = [];
    setTranscript(""); setInterimText(""); setStepIndex(0);

    let stream: MediaStream;
    try { stream = await navigator.mediaDevices.getUserMedia({ audio: true }); }
    catch { setMicError("No microphone access. Please allow access in your browser."); return; }
    streamRef.current = stream;
    chunksRef.current = [];

    const mimeType = MediaRecorder.isTypeSupported("audio/webm;codecs=opus") ? "audio/webm;codecs=opus" : "audio/webm";
    const mr = new MediaRecorder(stream, { mimeType });
    mediaRecorderRef.current = mr;
    mr.ondataavailable = (e) => { if (e.data.size > 0) chunksRef.current.push(e.data); };
    mr.start(500);

    const SR = window.SpeechRecognition ?? window.webkitSpeechRecognition;
    if (SR) {
      const rec = new SR();
      rec.continuous = true; rec.interimResults = true; rec.lang = "en-US";
      rec.onresult = (e: SpeechRecognitionEvent) => {
        let final = ""; let interim = "";
        for (let i = 0; i < e.results.length; i++) {
          if (e.results[i].isFinal) final += e.results[i][0].transcript + " ";
          else interim += e.results[i][0].transcript;
        }
        finalTranscript.current = final;
        setTranscript(final); setInterimText(interim);
      };
      rec.onerror = () => {}; rec.onend = () => {};
      rec.start();
      recognitionRef.current = rec;
    }

    setIsRecording(true); setRecordSecs(0);
    timerRef.current = setInterval(() => setRecordSecs(s => s + 1), 1000);
    setHeroMood("thinking"); setHeroTalking(true);
  }

  function stopRecording(silent = false) {
    if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null; }
    recognitionRef.current?.stop(); recognitionRef.current = null;
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== "inactive") mediaRecorderRef.current.stop();
    streamRef.current?.getTracks().forEach(t => t.stop());
    setIsRecording(false); setHeroTalking(false);
    if (!silent) setHeroMood("excited");
  }

  // Advance to next step (recording continues)
  function handleNextStep() {
    // Save transcript snapshot at this boundary
    const current = (finalTranscript.current + " " + interimText).trim();
    stepSnapshots.current = [...stepSnapshots.current, current];

    if (stepIndex < JTBD_STEPS.length - 1) {
      setStepIndex(i => i + 1);
      setHeroMood("happy"); setHeroTalking(true);
      setTimeout(() => setHeroTalking(false), 600);
    }
  }

  // Stop recording and process
  const handleDone = useCallback(async () => {
    const fullFinal = (finalTranscript.current + " " + interimText).trim();
    if (!fullFinal) { setMicError("No answer recorded. Please try again."); return; }

    // Save last snapshot
    const snapshots = [...stepSnapshots.current, fullFinal];

    stopRecording();

    // Upload audio
    const blob = new Blob(chunksRef.current, { type: "audio/webm" });
    const stored = sessionStorage.getItem(`session-${projectId}`);
    const { sessionId } = stored ? JSON.parse(stored) : {};
    if (sessionId && blob.size > 100) {
      const fd = new FormData();
      fd.append("file", blob, "jtbd-full.webm");
      fd.append("sessionId", sessionId);
      fd.append("stepId", "jtbd-voice");
      fd.append("durationSec", String(recordSecs));
      fetch("/api/audio", { method: "POST", body: fd }).catch(() => {});
    }

    // Extract per-step segments from snapshots
    const segments: string[] = JTBD_STEPS.map((_, i) => {
      const end   = snapshots[i]   ?? fullFinal;
      const start = snapshots[i - 1] ?? "";
      // The segment for step i is the new words added after the previous snapshot
      if (i === 0) return end;
      const words = end.split(" ");
      const prevWords = start.split(" ");
      return words.slice(prevWords.length).join(" ").trim() || end;
    });

    const answers: JtbdData = {
      situation: segments[0] ?? "",
      action:    segments[1] ?? "",
      outcome:   segments[2] ?? "",
      feeling:   segments[3] ?? "",
    };

    setPhase("processing"); setHeroMood("thinking");

    try {
      const res = await fetch("/api/jtbd/assemble", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ answers }),
      });
      const data = await res.json();
      setJtbd(data); setEditJtbd(data);
    } catch {
      setJtbd(answers); setEditJtbd(answers);
    }

    setPhase("jtbd-result"); setHeroMood("happy");
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [interimText, projectId, recordSecs, stepIndex]);

  const handleConfirm = useCallback(async (final: JtbdData) => {
    if (interviewId) {
      await fetch(`/api/jtbd/${interviewId}`, {
        method: "PATCH", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          situation: final.situation, action: final.action, outcome: final.outcome,
          jtbdValidated: true,
          forces: { feeling: final.feeling },
          rawAnswers: Object.entries(final).map(([k, v]) => ({
            question_id: `jtbd-${k}`, answer: v, timestamp: new Date().toISOString(),
          })),
        }),
      });
    }
    await fetch("/api/events", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        sessionId: JSON.parse(sessionStorage.getItem(`session-${projectId}`) ?? "{}").sessionId,
        eventType: "jtbd_completed",
        payloadJson: { frequency, jtbd: final },
      }),
    }).catch(() => {});

    setPhase("done"); setHeroMood("excited"); setHeroTalking(true);
    setTimeout(() => { setHeroTalking(false); router.push(`/participant/${projectId}/task`); }, 2000);
  }, [interviewId, frequency, projectId, router]);

  const fmt = (s: number) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
  const progressPct = { loading: 15, frequency: 15, "record-intro": 25, record: 60, processing: 85, "jtbd-result": 90, editing: 90, done: 100 }[phase] ?? 50;

  return (
    <div style={{ minHeight: "100vh", background: "#0f0d2e", color: "#fff", display: "flex", flexDirection: "column" }}>

      {/* Header */}
      <header style={{ borderBottom: "1px solid rgba(255,255,255,0.06)", padding: "12px 24px", display: "flex", alignItems: "center", gap: 20, flexShrink: 0 }}>
        <Image src="/logo.png" alt="PulseUP" width={90} height={30} style={{ height: "auto" }} />
        <div style={{ flex: 1 }}>
          <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11, color: "#6b7280", marginBottom: 5 }}>
            <span style={{ color: "#a78bfa", fontWeight: 600 }}>Mini-interview</span>
            <span>Step 3 / 5</span>
          </div>
          <div style={{ height: 4, background: "rgba(255,255,255,0.06)", borderRadius: 99, overflow: "hidden" }}>
            <div style={{ height: "100%", width: `${progressPct}%`, background: "linear-gradient(90deg,#7c3aed,#e91e63)", borderRadius: 99, transition: "width .6s ease" }} />
          </div>
        </div>
      </header>

      {/* Body */}
      <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", padding: "32px 20px 24px", maxWidth: 660, margin: "0 auto", width: "100%" }}>

        <HeroCharacter mood={heroMood} talking={heroTalking} />

        {/* ── LOADING ── */}
        {phase === "loading" && (
          <div style={{ marginTop: 40, display: "flex", flexDirection: "column", alignItems: "center", gap: 14 }}>
            <style>{`@keyframes spin-init { to { transform: rotate(360deg); } }`}</style>
            <div style={{ width: 32, height: 32, border: "3px solid rgba(124,58,237,.2)", borderTopColor: "#7c3aed", borderRadius: "50%", animation: "spin-init .9s linear infinite" }} />
            <p style={{ fontSize: 13, color: "#6b7280" }}>Getting ready…</p>
          </div>
        )}

        {/* ── FREQUENCY ── */}
        {phase === "frequency" && (
          <div style={{ marginTop: 24, width: "100%" }}>
            <div style={{ background: "rgba(124,58,237,0.12)", border: "1px solid rgba(124,58,237,0.25)", borderRadius: "4px 18px 18px 18px", padding: "20px 22px", marginBottom: 24 }}>
              <p style={{ fontSize: 16, fontWeight: 700, color: "#fff", margin: "0 0 14px" }}>Hey, I&apos;m Hugo 👋</p>
              <p style={{ fontSize: 14, lineHeight: 1.8, color: "#c4b5fd", margin: "0 0 12px" }}>
                I know that in most cases mothers don&apos;t actually suffer from a lack of choices. Most of the time, planning something for kids{" "}
                <strong style={{ color: "#fff" }}>isn&apos;t starting from zero</strong> — you already have options: saved ideas, memberships, tips from friends, group chats.
              </p>
              <p style={{ fontSize: 14, lineHeight: 1.8, color: "#e5e7eb", margin: "0 0 14px" }}>
                But imagine for a moment{" "}
                <strong style={{ color: "#f0abfc" }}>none of those options are in your pocket</strong>.
                {" "}That happens sometimes, right?
              </p>
              <p style={{ fontSize: 15, lineHeight: 1.6, color: "#fff", margin: 0, fontWeight: 600 }}>
                So — how often do you actually find yourself needing to come up with a completely new activity on your own, from scratch?
              </p>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {FREQUENCY_OPTIONS.map(opt => (
                <button key={opt.value} onClick={() => {
                  setFrequency(opt.value);
                  setHeroMood("happy"); setHeroTalking(true);
                  // Immediate phase change — no delay that could race with init
                  setTimeout(() => { setHeroTalking(false); setPhase("record-intro"); }, 400);
                }} style={{
                  padding: "13px 20px", borderRadius: 12, fontSize: 14, fontWeight: 500, textAlign: "left",
                  border: frequency === opt.value ? "2px solid #e91e63" : "2px solid rgba(255,255,255,0.1)",
                  background: frequency === opt.value ? "linear-gradient(135deg,rgba(233,30,99,.2),rgba(255,96,144,.12))" : "rgba(255,255,255,0.04)",
                  color: "#e5e7eb", cursor: "pointer", transition: "all .15s",
                }}>{opt.label}</button>
              ))}
            </div>
          </div>
        )}

        {/* ── RECORD INTRO ── */}
        {phase === "record-intro" && (
          <div style={{ marginTop: 24, width: "100%" }}>
            <div style={{ background: "rgba(124,58,237,0.12)", border: "1px solid rgba(124,58,237,0.25)", borderRadius: "4px 18px 18px 18px", padding: "20px 22px", marginBottom: 24 }}>
              <p style={{ fontSize: 15, fontWeight: 700, color: "#fff", margin: "0 0 8px" }}>
                Please recall a time when you were searching for something new.
              </p>
              <p style={{ fontSize: 14, lineHeight: 1.75, color: "#e5e7eb", margin: "0 0 12px" }}>
                What was this situation? Describe the circumstances and what happened?
              </p>
              <p style={{ fontSize: 14, lineHeight: 1.75, color: "#c4b5fd", margin: "0 0 12px" }}>
                To help structure your story, we&apos;ve included a prompt below.{" "}
                <span style={{ color: "#9ca3af" }}>Don&apos;t worry about following it word for word — it&apos;s just a template.</span>
              </p>
              <p style={{ fontSize: 14, lineHeight: 1.6, color: "#e5e7eb", margin: 0 }}>
                Hit record and{" "}<strong style={{ color: "#f0abfc" }}>speak through each step</strong>. Click the arrow to move to the next prompt — the recording keeps going.
              </p>
            </div>

            {/* Story Guide */}
            <StoryGuide activeStep={-1} />

            <button onClick={() => { setPhase("record"); startRecording(); }} style={{
              marginTop: 24, width: "100%", padding: "16px",
              background: "linear-gradient(135deg,#e91e63,#ff6090)",
              border: "none", borderRadius: 14, color: "#fff", fontSize: 15, fontWeight: 700, cursor: "pointer",
              display: "flex", alignItems: "center", justifyContent: "center", gap: 10,
            }}>
              <span style={{ fontSize: 20 }}>🎙</span> Start recording
            </button>
          </div>
        )}

        {/* ── RECORDING ── */}
        {phase === "record" && (
          <div style={{ marginTop: 20, width: "100%", display: "flex", flexDirection: "column", gap: 16 }}>
            <style>{`
              @keyframes pulse-ring { 0%{transform:scale(1);opacity:.7} 70%{transform:scale(1.5);opacity:0} 100%{transform:scale(1.5);opacity:0} }
              @keyframes wave { 0%,100%{height:8px} 50%{height:26px} }
            `}</style>

            {/* Current step highlight */}
            <StoryGuide activeStep={stepIndex} />

            {/* Record button + timer */}
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 16 }}>
              <div style={{ position: "relative", display: "flex", alignItems: "center", justifyContent: "center" }}>
                <div style={{ position: "absolute", width: 70, height: 70, borderRadius: "50%", border: "3px solid #e91e63", animation: "pulse-ring 1.4s ease-out infinite" }} />
                <div style={{ position: "absolute", width: 70, height: 70, borderRadius: "50%", border: "3px solid #e91e63", animation: "pulse-ring 1.4s .5s ease-out infinite" }} />
                <div style={{
                  width: 54, height: 54, borderRadius: "50%", background: "#e91e63",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  fontSize: 10, fontWeight: 700, color: "#fff", position: "relative", zIndex: 1,
                  boxShadow: "0 0 20px rgba(233,30,99,.5)",
                }}>REC</div>
              </div>

              <div style={{ display: "flex", alignItems: "center", gap: 10, flex: 1, justifyContent: "center" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 3, height: 28 }}>
                  {[0,1,2,3,4].map(i => (
                    <div key={i} style={{ width: 4, background: "#e91e63", borderRadius: 2, animation: `wave 0.8s ${i*.12}s ease-in-out infinite` }} />
                  ))}
                </div>
                <span style={{ fontSize: 22, fontWeight: 700, color: "#e91e63", fontVariantNumeric: "tabular-nums" }}>{fmt(recordSecs)}</span>
              </div>

              {/* Next / Done button */}
              {stepIndex < JTBD_STEPS.length - 1 ? (
                <button onClick={handleNextStep} style={{
                  padding: "10px 16px", background: "rgba(167,139,250,0.15)",
                  border: "1.5px solid #a78bfa", borderRadius: 12,
                  color: "#a78bfa", fontSize: 13, fontWeight: 700, cursor: "pointer",
                  whiteSpace: "nowrap", display: "flex", flexDirection: "column",
                  alignItems: "center", gap: 2, lineHeight: 1.2,
                }}>
                  <span style={{ fontSize: 16 }}>→</span>
                  <span style={{ fontSize: 10, opacity: 0.7, fontWeight: 500 }}>
                    {stepIndex + 1} → {stepIndex + 2} из {JTBD_STEPS.length}
                  </span>
                </button>
              ) : (
                <button onClick={handleDone} style={{
                  padding: "12px 20px", background: "linear-gradient(135deg,#7c3aed,#e91e63)",
                  border: "none", borderRadius: 12,
                  color: "#fff", fontSize: 14, fontWeight: 700, cursor: "pointer", whiteSpace: "nowrap",
                }}>
                  Done ✓
                </button>
              )}
            </div>

            {/* Live transcript */}
            {(transcript || interimText) && (
              <div style={{
                width: "100%", background: "rgba(255,255,255,0.04)",
                border: "1px solid rgba(255,255,255,0.08)", borderRadius: 12,
                padding: "12px 16px", fontSize: 13, color: "#9ca3af", lineHeight: 1.6,
                maxHeight: 90, overflowY: "auto",
              }}>
                <span style={{ color: "#d1d5db" }}>{transcript}</span>
                <span style={{ color: "#6b7280", fontStyle: "italic" }}>{interimText}</span>
              </div>
            )}

            {micError && <p style={{ fontSize: 13, color: "#f87171", textAlign: "center" }}>{micError}</p>}
          </div>
        )}

        {/* ── PROCESSING ── */}
        {phase === "processing" && (
          <div style={{ marginTop: 32, textAlign: "center", display: "flex", flexDirection: "column", alignItems: "center", gap: 16 }}>
            <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
            <div style={{ width: 48, height: 48, border: "3px solid rgba(124,58,237,.2)", borderTopColor: "#7c3aed", borderRadius: "50%", animation: "spin .9s linear infinite" }} />
            <p style={{ fontSize: 15, color: "#a78bfa", fontWeight: 600 }}>Assembling your JTBD…</p>
            <p style={{ fontSize: 13, color: "#6b7280" }}>One moment, cleaning up your answers</p>
          </div>
        )}

        {/* ── JTBD RESULT ── */}
        {(phase === "jtbd-result" || phase === "editing") && (
          <div style={{ marginTop: 24, width: "100%" }}>
            <div style={{ background: "rgba(124,58,237,0.12)", border: "1px solid rgba(124,58,237,0.25)", borderRadius: "4px 18px 18px 18px", padding: "14px 18px", fontSize: 14, lineHeight: 1.7, color: "#e5e7eb", marginBottom: 20 }}>
              Here&apos;s what we got. Does this accurately describe your situation?
            </div>
            {phase === "jtbd-result" ? (
              <>
                <JtbdResultCard jtbd={jtbd} />
                <div style={{ display: "flex", gap: 10, marginTop: 16 }}>
                  <button onClick={() => handleConfirm(jtbd)} style={{ flex: 1, padding: "13px 0", background: "linear-gradient(135deg,#7c3aed,#e91e63)", border: "none", borderRadius: 12, color: "#fff", fontSize: 14, fontWeight: 600, cursor: "pointer" }}>Yes, exactly ✓</button>
                  <button onClick={() => { setEditJtbd({ ...jtbd }); setPhase("editing"); }} style={{ flex: 1, padding: "13px 0", background: "rgba(255,255,255,.06)", border: "1px solid rgba(255,255,255,.12)", borderRadius: 12, color: "#9ca3af", fontSize: 14, fontWeight: 500, cursor: "pointer" }}>Edit ✏️</button>
                </div>
                <button onClick={() => { setPhase("record-intro"); setStepIndex(0); }} style={{ marginTop: 10, width: "100%", padding: "10px 0", background: "transparent", border: "1px dashed rgba(255,255,255,.12)", borderRadius: 12, color: "#6b7280", fontSize: 13, cursor: "pointer" }}>
                  Record again 🎙
                </button>
              </>
            ) : (
              <JtbdEditCard value={editJtbd} onChange={setEditJtbd} onSave={() => handleConfirm(editJtbd)} onCancel={() => setPhase("jtbd-result")} />
            )}
          </div>
        )}

        {/* ── DONE ── */}
        {phase === "done" && (
          <div style={{ marginTop: 32, textAlign: "center" }}>
            <p style={{ fontSize: 16, color: "#a78bfa", fontWeight: 600 }}>Great! Moving on… 🙏</p>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── StoryGuide ───────────────────────────────────────────────────────────────

function StoryGuide({ activeStep }: { activeStep: number }) {
  return (
    <div style={{ width: "100%", background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 16, padding: "16px 18px", display: "flex", flexDirection: "column", gap: 12 }}>
      <p style={{ fontSize: 11, color: "#6b7280", fontWeight: 600, letterSpacing: 0.8, margin: 0 }}>STORY GUIDE</p>
      {JTBD_STEPS.map((s, i) => {
        const isActive = i === activeStep;
        const isDone   = activeStep > -1 && i < activeStep;
        return (
          <div key={s.num} style={{
            display: "flex", gap: 12, alignItems: "flex-start",
            opacity: activeStep === -1 ? 1 : isActive ? 1 : isDone ? 0.5 : 0.3,
            transition: "opacity .3s",
          }}>
            <div style={{
              width: 26, height: 26, borderRadius: "50%", flexShrink: 0,
              background: isActive ? s.color : isDone ? "#22c55e" : `${s.color}22`,
              border: `1.5px solid ${isActive ? s.color : isDone ? "#22c55e" : s.color}`,
              display: "flex", alignItems: "center", justifyContent: "center",
              fontSize: 11, fontWeight: 700, color: isActive || isDone ? "#fff" : s.color,
            }}>
              {isDone ? "✓" : s.num}
            </div>
            <div style={{ flex: 1 }}>
              <p style={{ margin: "0 0 1px", fontSize: 13, fontWeight: 700, color: isActive ? s.color : "#9ca3af" }}>{s.label}</p>
              <p style={{ margin: "0 0 3px", fontSize: 12, color: isActive ? "#e5e7eb" : "#6b7280" }}>{s.subLabel}</p>
              {isActive && (
                <p style={{ margin: 0, fontSize: 12, color: "#6b7280", fontStyle: "italic" }}>{s.hint}</p>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ─── JTBD Result & Edit ───────────────────────────────────────────────────────

const JTBD_LABELS: { key: keyof JtbdData; label: string; color: string }[] = [
  { key: "situation", label: "When",      color: "#a78bfa" },
  { key: "action",    label: "I need to", color: "#f472b6" },
  { key: "outcome",   label: "So I can",  color: "#34d399" },
  { key: "feeling",   label: "And feel",  color: "#fbbf24" },
];

function JtbdResultCard({ jtbd }: { jtbd: JtbdData }) {
  return (
    <div style={{ background: "rgba(124,58,237,0.1)", border: "1.5px solid rgba(124,58,237,0.35)", borderRadius: 16, padding: "20px 22px", display: "flex", flexDirection: "column", gap: 14 }}>
      <p style={{ fontSize: 11, color: "#a78bfa", fontWeight: 700, letterSpacing: 1, margin: 0 }}>JTBD</p>
      {JTBD_LABELS.map(({ key, label, color }) => (
        <div key={key} style={{ display: "flex", gap: 10, alignItems: "flex-start" }}>
          <span style={{ fontSize: 13, fontWeight: 700, color, minWidth: 72, flexShrink: 0 }}>{label}</span>
          <span style={{ fontSize: 14, color: "#e5e7eb", lineHeight: 1.6, fontStyle: "italic" }}>{jtbd[key] || "…"}</span>
        </div>
      ))}
    </div>
  );
}

function JtbdEditCard({ value, onChange, onSave, onCancel }: { value: JtbdData; onChange: (v: JtbdData) => void; onSave: () => void; onCancel: () => void }) {
  return (
    <div style={{ background: "rgba(124,58,237,0.1)", border: "1.5px solid rgba(124,58,237,0.4)", borderRadius: 16, padding: "20px 22px" }}>
      <p style={{ fontSize: 11, color: "#a78bfa", fontWeight: 700, letterSpacing: 1, marginBottom: 16, marginTop: 0 }}>EDIT IN YOUR OWN WORDS</p>
      {JTBD_LABELS.map(({ key, label, color }) => (
        <div key={key} style={{ marginBottom: 14 }}>
          <label style={{ display: "block", fontSize: 11, color, marginBottom: 5, fontWeight: 600 }}>{label}</label>
          <textarea value={value[key]} onChange={e => onChange({ ...value, [key]: e.target.value })} rows={2}
            style={{ width: "100%", background: "rgba(255,255,255,.05)", border: "1px solid rgba(124,58,237,.3)", borderRadius: 10, padding: "9px 13px", fontSize: 13, color: "#f3f4f6", outline: "none", resize: "vertical", fontFamily: "inherit", lineHeight: 1.5, boxSizing: "border-box" }}
          />
        </div>
      ))}
      <div style={{ display: "flex", gap: 10 }}>
        <button onClick={onSave} style={{ flex: 1, padding: "11px 0", background: "linear-gradient(135deg,#7c3aed,#e91e63)", border: "none", borderRadius: 10, color: "#fff", fontSize: 13, fontWeight: 600, cursor: "pointer" }}>Save ✓</button>
        <button onClick={onCancel} style={{ padding: "11px 18px", background: "transparent", border: "1px solid rgba(255,255,255,.1)", borderRadius: 10, color: "#6b7280", fontSize: 13, cursor: "pointer" }}>Cancel</button>
      </div>
    </div>
  );
}
