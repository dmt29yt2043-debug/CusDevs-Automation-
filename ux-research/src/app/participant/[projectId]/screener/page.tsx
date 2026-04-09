"use client";

import { useParams, useRouter } from "next/navigation";
import { useState } from "react";
import ParticipantLayout from "@/components/participant-flow/ParticipantLayout";

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
}: {
  options: { value: string; label: string }[];
  values: string[];
  onChange: (v: string[]) => void;
}) {
  const toggle = (val: string) => {
    onChange(
      values.includes(val) ? values.filter((v) => v !== val) : [...values, val]
    );
  };

  return (
    <div className="flex flex-wrap gap-2">
      {options.map((opt) => {
        const selected = values.includes(opt.value);
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
              color: selected ? "#fff" : "#9ca3af",
              cursor: "pointer",
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

interface Child {
  age: string;
  gender: "boy" | "girl" | "";
}

function ChildrenInput({
  children,
  onChange,
}: {
  children: Child[];
  onChange: (children: Child[]) => void;
}) {
  const updateChild = (index: number, field: keyof Child, value: string) => {
    const updated = [...children];
    updated[index] = { ...updated[index], [field]: value };
    onChange(updated);
  };

  const removeChild = (index: number) => {
    if (children.length <= 1) return;
    onChange(children.filter((_, i) => i !== index));
  };

  const addChild = () => {
    onChange([...children, { age: "", gender: "" }]);
  };

  return (
    <div className="space-y-3">
      {children.map((child, i) => (
        <div key={i} className="flex items-center gap-2">
          {/* Age input */}
          <input
            type="number"
            min="0"
            max="18"
            value={child.age}
            onChange={(e) => updateChild(i, "age", e.target.value)}
            placeholder="Age"
            style={{
              width: 70,
              background: "#1e1b4b",
              border: "2px solid rgba(255,255,255,0.1)",
              borderRadius: 12,
              padding: "10px 12px",
              fontSize: 14,
              color: "#fff",
              outline: "none",
              textAlign: "center",
            }}
          />

          {/* Gender buttons */}
          <button
            type="button"
            onClick={() => updateChild(i, "gender", child.gender === "boy" ? "" : "boy")}
            className="transition-all duration-150 active:scale-95"
            style={{
              padding: "10px 16px",
              borderRadius: 12,
              fontSize: 13,
              fontWeight: 500,
              border: child.gender === "boy" ? "2px solid #3b82f6" : "2px solid rgba(255,255,255,0.1)",
              background: child.gender === "boy" ? "rgba(59,130,246,0.2)" : "#1e1b4b",
              color: child.gender === "boy" ? "#93c5fd" : "#9ca3af",
              cursor: "pointer",
            }}
          >
            Boy
          </button>
          <button
            type="button"
            onClick={() => updateChild(i, "gender", child.gender === "girl" ? "" : "girl")}
            className="transition-all duration-150 active:scale-95"
            style={{
              padding: "10px 16px",
              borderRadius: 12,
              fontSize: 13,
              fontWeight: 500,
              border: child.gender === "girl" ? "2px solid #e91e63" : "2px solid rgba(255,255,255,0.1)",
              background: child.gender === "girl" ? "rgba(233,30,99,0.2)" : "#1e1b4b",
              color: child.gender === "girl" ? "#f9a8d4" : "#9ca3af",
              cursor: "pointer",
            }}
          >
            Girl
          </button>

          {/* Remove button */}
          {children.length > 1 && (
            <button
              type="button"
              onClick={() => removeChild(i)}
              style={{
                width: 32,
                height: 32,
                borderRadius: 8,
                border: "none",
                background: "rgba(255,255,255,0.05)",
                color: "#6b7280",
                cursor: "pointer",
                fontSize: 16,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              ×
            </button>
          )}
        </div>
      ))}

      {/* Add child button */}
      <button
        type="button"
        onClick={addChild}
        style={{
          padding: "8px 16px",
          borderRadius: 10,
          fontSize: 13,
          fontWeight: 500,
          border: "1px dashed rgba(255,255,255,0.15)",
          background: "transparent",
          color: "#6b7280",
          cursor: "pointer",
        }}
      >
        + Add another child
      </button>
    </div>
  );
}

export default function ScreenerPage() {
  const params = useParams();
  const router = useRouter();
  const projectId = params.projectId as string;
  const [submitting, setSubmitting] = useState(false);

  const [children, setChildren] = useState<Child[]>([{ age: "", gender: "" }]);

  const [answers, setAnswers] = useState({
    isParent: "",
    city: "",
    searchMethod: [] as string[],
    frequency: "",
  });

  const isValid = answers.isParent && answers.city;

  const handleSubmit = async () => {
    if (!isValid || submitting) return;
    setSubmitting(true);

    try {
      const childrenData = children
        .filter((c) => c.age)
        .map((c) => `${c.age}y${c.gender ? ` (${c.gender})` : ""}`)
        .join(", ");

      const submitData = {
        ...answers,
        childAge: childrenData,
        searchMethod: answers.searchMethod.join(", "),
      };

      // Store screener data for test page URL personalization
      const firstChildAge = children.find((c) => c.age)?.age || "";
      let ageGroup = "6-8";
      const ageNum = parseInt(firstChildAge);
      if (ageNum >= 3 && ageNum <= 5) ageGroup = "3-5";
      else if (ageNum >= 6 && ageNum <= 8) ageGroup = "6-8";
      else if (ageNum >= 9 && ageNum <= 12) ageGroup = "9-12";
      else if (ageNum >= 13) ageGroup = "13-14";

      const cityLower = (answers.city || "").toLowerCase().trim();
      const boroughMap: Record<string, string> = {
        manhattan: "manhattan", brooklyn: "brooklyn", queens: "queens",
        bronx: "bronx", "staten island": "staten_island",
        "new york": "manhattan", nyc: "manhattan", ny: "manhattan",
      };
      const borough = boroughMap[cityLower] || "other";

      sessionStorage.setItem(`screener-params-${projectId}`, JSON.stringify({
        child_age: ageGroup,
        borough,
        interests: answers.searchMethod.length > 0
          ? answers.searchMethod.map((m: string) => {
              const map: Record<string, string> = {
                search_engine: "outdoor", social: "outdoor", apps: "outdoor",
                friends: "outdoor", chats: "outdoor", other: "outdoor",
              };
              return map[m] || "outdoor";
            })
          : ["outdoor"],
      }));

      const pRes = await fetch("/api/participants", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ projectId, screenerAnswers: submitData }),
      });
      const participant = await pRes.json();

      const sRes = await fetch(`/api/projects/${projectId}/scenario`);
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
      const session = await sessionRes.json();

      sessionStorage.setItem(
        `session-${projectId}`,
        JSON.stringify({
          sessionId: session.id,
          scenarioId: scenario.id,
          participantId: participant.id,
        })
      );

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

      router.push(`/participant/${projectId}/task`);
    } catch (err) {
      console.error("Error creating session:", err);
      setSubmitting(false);
    }
  };

  return (
    <ParticipantLayout step={2} totalSteps={5}>
      <div className="space-y-7">
        <div>
          <h1 className="text-2xl font-bold" style={{ color: "#fff" }}>
            A few questions about you
          </h1>
          <p className="text-sm mt-2" style={{ color: "#6b7280" }}>
            This helps us understand the context of your experience.
          </p>
        </div>

        <div className="space-y-6">
          <div>
            <label className="block text-sm font-medium mb-2.5" style={{ color: "#fff" }}>
              Are you a parent?
            </label>
            <ChipGroup
              options={[
                { value: "yes", label: "Yes" },
                { value: "no", label: "No" },
              ]}
              value={answers.isParent}
              onChange={(v) => setAnswers((p) => ({ ...p, isParent: v }))}
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-2.5" style={{ color: "#fff" }}>
              Your children
            </label>
            <ChildrenInput children={children} onChange={setChildren} />
          </div>

          <div>
            <label className="block text-sm font-medium mb-2.5" style={{ color: "#fff" }}>City</label>
            <input
              type="text"
              value={answers.city}
              onChange={(e) => setAnswers((p) => ({ ...p, city: e.target.value }))}
              placeholder="New York"
              style={{
                width: "100%",
                background: "#1e1b4b",
                border: "2px solid rgba(255,255,255,0.1)",
                borderRadius: 12,
                padding: "12px 16px",
                fontSize: 14,
                color: "#fff",
                outline: "none",
              }}
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1" style={{ color: "#fff" }}>
              How do you usually find activities for kids?
            </label>
            <p className="text-xs mb-2.5" style={{ color: "#6b7280" }}>Select all that apply</p>
            <MultiChipGroup
              options={[
                { value: "search_engine", label: "Google / Search" },
                { value: "social", label: "Social media" },
                { value: "apps", label: "Apps & websites" },
                { value: "friends", label: "Friends" },
                { value: "chats", label: "Parent chats" },
                { value: "other", label: "Other" },
              ]}
              values={answers.searchMethod}
              onChange={(v) => setAnswers((p) => ({ ...p, searchMethod: v }))}
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-2.5" style={{ color: "#fff" }}>
              How often do you go to events with kids?
            </label>
            <ChipGroup
              options={[
                { value: "weekly", label: "Every week" },
                { value: "biweekly", label: "Every 2 weeks" },
                { value: "monthly", label: "Once a month" },
                { value: "rarely", label: "Less often" },
              ]}
              value={answers.frequency}
              onChange={(v) => setAnswers((p) => ({ ...p, frequency: v }))}
            />
          </div>
        </div>

        <button
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
