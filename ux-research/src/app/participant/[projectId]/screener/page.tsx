"use client";

import { useParams, useRouter } from "next/navigation";
import { useState, useEffect, useRef, useCallback } from "react";
import ParticipantLayout from "@/components/participant-flow/ParticipantLayout";
import { searchCities, getCitySize, type USCity } from "@/lib/us-cities";

function ChipGroup({
  options,
  value,
  onChange,
}: {
  options: { value: string; label: string }[];
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <div className="flex flex-wrap gap-2">
      {options.map((opt) => (
        <button
          key={opt.value}
          type="button"
          onClick={() => onChange(value === opt.value ? "" : opt.value)}
          className="transition-all duration-150 active:scale-95"
          style={{
            padding: "10px 18px",
            borderRadius: 12,
            fontSize: 14,
            fontWeight: 500,
            border: value === opt.value ? "2px solid #e91e63" : "2px solid rgba(255,255,255,0.1)",
            background: value === opt.value
              ? "linear-gradient(135deg, rgba(233,30,99,0.2), rgba(255,96,144,0.15))"
              : "#1e1b4b",
            color: value === opt.value ? "#fff" : "#9ca3af",
            cursor: "pointer",
          }}
        >
          {opt.label}
        </button>
      ))}
    </div>
  );
}

function MultiChipGroup({
  options,
  values,
  onChange,
  maxSelect,
}: {
  options: { value: string; label: string }[];
  values: string[];
  onChange: (v: string[]) => void;
  maxSelect?: number;
}) {
  const toggle = (val: string) => {
    if (values.includes(val)) {
      onChange(values.filter((v) => v !== val));
    } else {
      if (maxSelect !== undefined && values.length >= maxSelect) return;
      onChange([...values, val]);
    }
  };
  return (
    <div className="flex flex-wrap gap-2">
      {options.map((opt) => {
        const selected = values.includes(opt.value);
        const disabled = !selected && maxSelect !== undefined && values.length >= maxSelect;
        return (
          <button
            key={opt.value}
            type="button"
            onClick={() => toggle(opt.value)}
            className="transition-all duration-150 active:scale-95"
            style={{
              padding: "10px 18px",
              borderRadius: 12,
              fontSize: 14,
              fontWeight: 500,
              border: selected ? "2px solid #e91e63" : "2px solid rgba(255,255,255,0.1)",
              background: selected
                ? "linear-gradient(135deg, rgba(233,30,99,0.2), rgba(255,96,144,0.15))"
                : "#1e1b4b",
              opacity: disabled ? 0.35 : 1,
              cursor: disabled ? "not-allowed" : "pointer",
              color: selected ? "#fff" : "#9ca3af",
            }}
          >
            {selected && <span style={{ marginRight: 6 }}>✓</span>}
            {opt.label}
          </button>
        );
      })}
    </div>
  );
}

const SIZE_COLORS: Record<string, string> = {
  "Megacity":   "#f59e0b",
  "Large city": "#3b82f6",
  "Major city": "#8b5cf6",
  "City":       "#10b981",
  "Town":       "#6b7280",
};

function CityAutocomplete({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const [suggestions, setSuggestions] = useState<USCity[]>([]);
  const [open, setOpen] = useState(false);
  const [focused, setFocused] = useState(false);
  const wrapRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const results = searchCities(value);
    setSuggestions(results);
    setOpen(focused && results.length > 0 && value.length >= 2);
  }, [value, focused]);

  // Close on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const select = (c: USCity) => {
    onChange(`${c.city}, ${c.state}`);
    setOpen(false);
  };

  return (
    <div ref={wrapRef} style={{ position: "relative" }}>
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onFocus={() => setFocused(true)}
        onBlur={() => setTimeout(() => setFocused(false), 150)}
        placeholder="Start typing your city…"
        autoComplete="off"
        style={{
          width: "100%",
          background: "#1e1b4b",
          border: focused ? "2px solid rgba(124,58,237,0.6)" : "2px solid rgba(255,255,255,0.1)",
          borderRadius: 12,
          padding: "12px 16px",
          fontSize: 14,
          color: "#fff",
          outline: "none",
          boxSizing: "border-box",
          transition: "border-color 0.15s",
        }}
      />
      {open && (
        <div style={{
          position: "absolute",
          top: "calc(100% + 6px)",
          left: 0,
          right: 0,
          background: "#1e1b4b",
          border: "1.5px solid rgba(124,58,237,0.35)",
          borderRadius: 12,
          overflow: "hidden",
          zIndex: 50,
          boxShadow: "0 8px 24px rgba(0,0,0,0.4)",
        }}>
          {suggestions.map((c, i) => {
            const size = getCitySize(c.pop);
            const pop = c.pop >= 1_000_000
              ? `${(c.pop / 1_000_000).toFixed(1)}M`
              : c.pop >= 1_000
              ? `${Math.round(c.pop / 1_000)}K`
              : String(c.pop);
            return (
              <button
                key={`${c.city}-${c.state}`}
                onMouseDown={() => select(c)}
                style={{
                  width: "100%",
                  padding: "10px 16px",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  background: "transparent",
                  border: "none",
                  borderBottom: i < suggestions.length - 1 ? "1px solid rgba(255,255,255,0.06)" : "none",
                  cursor: "pointer",
                  textAlign: "left",
                  transition: "background 0.1s",
                }}
                onMouseEnter={(e) => (e.currentTarget.style.background = "rgba(124,58,237,0.15)")}
                onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
              >
                <span style={{ fontSize: 14, color: "#e5e7eb" }}>
                  {c.city}{" "}
                  <span style={{ color: "#6b7280", fontSize: 12 }}>{c.state}</span>
                </span>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <span style={{ fontSize: 11, color: "#6b7280" }}>{pop}</span>
                  <span style={{
                    fontSize: 10,
                    fontWeight: 600,
                    padding: "2px 7px",
                    borderRadius: 99,
                    background: `${SIZE_COLORS[size]}22`,
                    color: SIZE_COLORS[size],
                    border: `1px solid ${SIZE_COLORS[size]}44`,
                  }}>
                    {size}
                  </span>
                </div>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

export default function ScreenerPage() {
  const params = useParams();
  const router = useRouter();
  const projectId = params.projectId as string;
  const [submitting, setSubmitting] = useState(false);

  const [name, setName] = useState("");
  const [childCount, setChildCount] = useState("");
  const [childAges, setChildAges] = useState<string[]>([]);
  const [city, setCity] = useState("");

  const [answers, setAnswers] = useState({
    frequency: "",
    goOutReasons: [] as string[],
    searchMethod: [] as string[],
    spending: "",
    memberships: [] as string[],
  });

  const isValid = name.trim() !== "" && city.trim() !== "" && answers.frequency !== "" && answers.spending !== "";
  const [autoSubmit, setAutoSubmit] = useState(false);

  // Secret shortcut: Ctrl+Shift+K → auto-fill and skip
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.ctrlKey && e.shiftKey && e.key === "K") {
        e.preventDefault();
        setName("Sarah M.");
        setChildCount("2");
        setChildAges(["6", "8"]);
        setCity("New York");
        setAnswers({ frequency: "weekly", goOutReasons: ["fun", "memories"], searchMethod: ["social", "friends"], spending: "100_200", memberships: ["none"] });
        setAutoSubmit(true);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  const skipValidation = useRef(false);

  useEffect(() => {
    if (autoSubmit && childCount && city && answers.frequency && answers.spending && !submitting) {
      skipValidation.current = true;
      const timer = setTimeout(() => { handleSubmitRef.current?.(); }, 200);
      return () => clearTimeout(timer);
    }
  }, [autoSubmit, city, answers.frequency, answers.spending, submitting]);

  const handleSubmitRef = useRef<(() => void) | null>(null);

  const handleSubmit = useCallback(async () => {
    if (submitting) return;
    if (!skipValidation.current && (!city.trim() || !answers.frequency || !answers.spending)) return;
    setSubmitting(true);

    try {
      const submitData = {
        city: city.trim(),
        childCount,
        childAges: childAges.join(", "),
        frequency: answers.frequency,
        searchMethod: answers.searchMethod.join(", "),
        goOutReasons: answers.goOutReasons.join(", "),
        spending: answers.spending,
        memberships: answers.memberships.join(", "),
      };

      const firstAge = parseInt(childAges[0] ?? "0");
      let ageGroup = "6-8";
      if (firstAge >= 1 && firstAge <= 2) ageGroup = "1-2";
      else if (firstAge >= 3 && firstAge <= 5) ageGroup = "3-5";
      else if (firstAge >= 6 && firstAge <= 8) ageGroup = "6-8";
      else if (firstAge >= 9 && firstAge <= 12) ageGroup = "9-12";
      else if (firstAge >= 13) ageGroup = "13+";

      sessionStorage.setItem(`screener-params-${projectId}`, JSON.stringify({
        child_age: ageGroup,
        city: city.trim(),
        interests: ["outdoor", "museums", "playgrounds"],
        pain: "hard_to_choose",
      }));

      const pRes = await fetch("/api/participants", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ projectId, screenerAnswers: submitData, name: name.trim() }),
      });
      if (!pRes.ok) throw new Error(`Participants API ${pRes.status}: ${await pRes.text()}`);
      const participant = await pRes.json();

      const sRes = await fetch(`/api/projects/${projectId}/scenario`);
      if (!sRes.ok) throw new Error(`Scenario API ${sRes.status}: ${await sRes.text()}`);
      const scenario = await sRes.json();

      const sessionRes = await fetch("/api/sessions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          projectId: scenario.projectId,
          scenarioId: scenario.id,
          participantId: participant.id,
        }),
      });
      if (!sessionRes.ok) throw new Error(`Sessions API ${sessionRes.status}: ${await sessionRes.text()}`);
      const session = await sessionRes.json();

      sessionStorage.setItem(`session-${projectId}`, JSON.stringify({
        sessionId: session.id,
        scenarioId: scenario.id,
        participantId: participant.id,
      }));

      await fetch("/api/events", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sessionId: session.id, eventType: "consent_accepted" }),
      });

      await fetch("/api/events", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sessionId: session.id,
          eventType: "screener_submitted",
          payloadJson: submitData,
        }),
      });

      router.push(`/participant/${projectId}/interview`);
    } catch (err) {
      console.error("Error creating session:", err);
      setSubmitting(false);
    }
  }, [answers, childCount, childAges, city, submitting, projectId, router]);

  handleSubmitRef.current = handleSubmit;

  const inputStyle = {
    width: "100%",
    background: "#1e1b4b",
    border: "2px solid rgba(255,255,255,0.1)",
    borderRadius: 12,
    padding: "12px 16px",
    fontSize: 14,
    color: "#fff",
    outline: "none",
  } as const;

  return (
    <ParticipantLayout step={2} totalSteps={5}>
      <div className="space-y-7">
        <div>
          <h1 className="text-2xl font-bold" style={{ color: "#fff" }}>A few questions about you</h1>
          <p className="text-sm mt-2" style={{ color: "#6b7280" }}>
            This helps us understand the context of your experience.
          </p>
        </div>

        <div className="space-y-6">
          {/* Name */}
          <div>
            <label className="block text-sm font-medium mb-2.5" style={{ color: "#fff" }}>
              Your first name
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Sarah"
              autoComplete="given-name"
              style={{
                width: "100%",
                background: "#1e1b4b",
                border: name.trim() ? "2px solid rgba(124,58,237,0.6)" : "2px solid rgba(255,255,255,0.1)",
                borderRadius: 12,
                padding: "12px 16px",
                fontSize: 14,
                color: "#fff",
                outline: "none",
                boxSizing: "border-box",
                transition: "border-color 0.15s",
              }}
            />
          </div>

          {/* Number of children */}
          <div>
            <label className="block text-sm font-medium mb-2.5" style={{ color: "#fff" }}>
              How many kids do you have?
            </label>
            <ChipGroup
              options={[
                { value: "1", label: "1" },
                { value: "2", label: "2" },
                { value: "3", label: "3" },
                { value: "4", label: "4" },
                { value: "5", label: "5" },
                { value: "5+", label: "5+" },
              ]}
              value={childCount}
              onChange={(v) => {
                setChildCount(v);
                const max = v === "5+" ? 99 : Number(v);
                if (childAges.length > max) setChildAges(childAges.slice(0, max));
              }}
            />
          </div>

          {/* Ages of children */}
          <div>
            <label className="block text-sm font-medium mb-1" style={{ color: "#fff" }}>
              How old are your kids?
            </label>
            <p className="text-xs mb-2.5" style={{ color: "#6b7280" }}>
              Select {childCount ? `up to ${childCount === "5+" ? "5+" : childCount} age${Number(childCount) !== 1 ? "s" : ""}` : "ages that apply"}
              {childCount && childAges.length > 0 && ` · ${childAges.length} selected`}
            </p>
            <MultiChipGroup
              maxSelect={childCount === "5+" ? 99 : childCount ? Number(childCount) : 99}
              options={[
                { value: "1",  label: "1" },
                { value: "2",  label: "2" },
                { value: "3",  label: "3" },
                { value: "4",  label: "4" },
                { value: "5",  label: "5" },
                { value: "6",  label: "6" },
                { value: "7",  label: "7" },
                { value: "8",  label: "8" },
                { value: "9",  label: "9" },
                { value: "10", label: "10" },
                { value: "11", label: "11" },
                { value: "12", label: "12" },
                { value: "13+", label: "13+" },
              ]}
              values={childAges}
              onChange={setChildAges}
            />
          </div>

          {/* City — autocomplete */}
          <div>
            <label className="block text-sm font-medium mb-2.5" style={{ color: "#fff" }}>
              Where do you live?
            </label>
            <CityAutocomplete value={city} onChange={setCity} />
          </div>

          {/* Frequency */}
          <div>
            <label className="block text-sm font-medium mb-2.5" style={{ color: "#fff" }}>
              How often do you go out with your kids?
            </label>
            <ChipGroup
              options={[
                { value: "weekly",    label: "Every week" },
                { value: "biweekly", label: "Every 2 weeks" },
                { value: "monthly",  label: "Once a month" },
                { value: "rarely",   label: "Less often" },
              ]}
              value={answers.frequency}
              onChange={(v) => setAnswers((p) => ({ ...p, frequency: v }))}
            />
          </div>

          {/* Why go out */}
          <div>
            <label className="block text-sm font-medium mb-1" style={{ color: "#fff" }}>
              Why do you go out with your kids?
            </label>
            <p className="text-xs mb-2.5" style={{ color: "#6b7280" }}>Select all that apply</p>
            <MultiChipGroup
              options={[
                { value: "get_out",      label: "Get out of the house" },
                { value: "fun",          label: "Have fun" },
                { value: "memories",     label: "Create memories" },
                { value: "energy",       label: "Burn energy" },
                { value: "socialize",    label: "Socialize" },
                { value: "learn",        label: "Learn something new" },
                { value: "screens",      label: "Reduce screen time" },
                { value: "quality_time", label: "Spend quality time together" },
                { value: "other",        label: "Other" },
              ]}
              values={answers.goOutReasons}
              onChange={(v) => setAnswers((p) => ({ ...p, goOutReasons: v }))}
            />
          </div>

          {/* How they find events */}
          <div>
            <label className="block text-sm font-medium mb-1" style={{ color: "#fff" }}>
              How do you find out about events for kids?
            </label>
            <p className="text-xs mb-2.5" style={{ color: "#6b7280" }}>Select all that apply</p>
            <MultiChipGroup
              options={[
                { value: "search",       label: "Google / Search" },
                { value: "social",       label: "Social media (Instagram, TikTok)" },
                { value: "apps",         label: "Apps & websites (Eventbrite, etc.)" },
                { value: "friends",      label: "Friends / word of mouth" },
                { value: "chats",        label: "Parent chats & local Facebook groups" },
                { value: "school",       label: "School apps" },
                { value: "newsletters",  label: "Newsletters" },
                { value: "community",    label: "Community centers & libraries" },
                { value: "other",        label: "Other" },
              ]}
              values={answers.searchMethod}
              onChange={(v) => setAnswers((p) => ({ ...p, searchMethod: v }))}
            />
          </div>

          {/* Spending */}
          <div>
            <label className="block text-sm font-medium mb-1" style={{ color: "#fff" }}>
              How much do you spend per 1–2 months on entertainment with kids?
            </label>
            <p className="text-xs mb-2.5" style={{ color: "#6b7280" }}>Not including restaurants</p>
            <ChipGroup
              options={[
                { value: "minimal",   label: "Стараюсь не тратить" },
                { value: "0_100",     label: "До $100" },
                { value: "100_300",   label: "До $300" },
                { value: "300_500",   label: "До $500" },
                { value: "500_1000",  label: "До $1000" },
                { value: "1000_1500", label: "$1000 – $1500" },
                { value: "1500+",     label: "Иногда больше" },
              ]}
              value={answers.spending}
              onChange={(v) => setAnswers((p) => ({ ...p, spending: v }))}
            />
          </div>

          {/* Memberships / passes */}
          <div>
            <label className="block text-sm font-medium mb-1" style={{ color: "#fff" }}>
              Do you have any memberships or passes for kids' activities?
            </label>
            <p className="text-xs mb-2.5" style={{ color: "#6b7280" }}>Select all that apply</p>
            <MultiChipGroup
              options={[
                { value: "museum_zoo",   label: "Museum or zoo membership" },
                { value: "kids_classes", label: "Kids classes (gym, music, etc.)" },
                { value: "city_pass",    label: "City or attraction pass" },
                { value: "community",    label: "Community programs (school, library)" },
                { value: "deals",        label: "Deal/discount platforms (e.g., Groupon)" },
                { value: "other",        label: "Other" },
                { value: "none",         label: "No, none" },
              ]}
              values={answers.memberships}
              onChange={(v) => setAnswers((p) => ({ ...p, memberships: v }))}
            />
          </div>
        </div>

        <button
          id="screener-submit-btn"
          onClick={handleSubmit}
          disabled={!isValid || submitting}
          className="w-full transition-all hover:opacity-90 disabled:opacity-40 disabled:cursor-not-allowed"
          style={{
            padding: "14px 0",
            background: isValid && !submitting ? "linear-gradient(135deg, #e91e63, #ff6090)" : "#1e1b4b",
            color: "#fff",
            border: "none",
            borderRadius: 12,
            fontSize: 14,
            fontWeight: 600,
            cursor: isValid && !submitting ? "pointer" : "not-allowed",
          }}
        >
          {submitting ? "Creating session..." : "Continue"}
        </button>
      </div>
    </ParticipantLayout>
  );
}
