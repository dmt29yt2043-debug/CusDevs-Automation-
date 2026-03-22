"use client";

import { useParams, useRouter } from "next/navigation";
import { useEffect, useState, useCallback } from "react";
import ResearchWidget from "@/components/research-widget/ResearchWidget";
import { initTracking, trackPageView, stopTracking, trackEvent } from "@/lib/event-tracking";

interface SessionInfo {
  sessionId: string;
  scenarioId: string;
}

export default function TestPage() {
  const params = useParams();
  const router = useRouter();
  const projectId = params.projectId as string;

  const [sessionInfo, setSessionInfo] = useState<SessionInfo | null>(null);
  const [scenarioJson, setScenarioJson] = useState<Record<string, unknown> | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const stored = sessionStorage.getItem(`session-${projectId}`);
    if (!stored) {
      router.push(`/participant/${projectId}/welcome`);
      return;
    }

    const info = JSON.parse(stored) as SessionInfo;
    setSessionInfo(info);

    // Init event tracking
    initTracking(info.sessionId);
    trackPageView();

    // Update session status
    fetch(`/api/sessions/${info.sessionId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: "in_progress" }),
    });

    // Fetch scenario
    fetch(`/api/projects/${projectId}/scenario`)
      .then((r) => r.json())
      .then((scenario) => {
        setScenarioJson(scenario.definitionJson);
        setLoading(false);
      });

    return () => stopTracking();
  }, [projectId, router]);

  const handleComplete = useCallback(async () => {
    if (!sessionInfo) return;

    trackEvent({ eventType: "session_completed" });

    // Complete session
    await fetch(`/api/sessions/${sessionInfo.sessionId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: "completed" }),
    });

    stopTracking();
    router.push(`/participant/${projectId}/thank-you`);
  }, [sessionInfo, projectId, router]);

  const activities = [
    {
      title: "Kids Pottery Workshop",
      place: "Clay Studio",
      time: "Sat, 10:00 AM",
      age: "4-10 yrs",
      price: "1500 ₽",
      color: "bg-orange-50",
      emoji: "🏺",
    },
    {
      title: "Family Quest in Central Park",
      place: "Central Park",
      time: "Sat, 11:00 AM",
      age: "5-12 yrs",
      price: "800 ₽",
      color: "bg-green-50",
      emoji: "🌳",
    },
    {
      title: "Science Show: Chemistry of Wonders",
      place: "Community Center",
      time: "Sat, 10:30 AM",
      age: "6-14 yrs",
      price: "1200 ₽",
      color: "bg-purple-50",
      emoji: "🧪",
    },
    {
      title: "Morning Kids Theater",
      place: "Luna Theater",
      time: "Sat, 10:00 AM",
      age: "3-8 yrs",
      price: "900 ₽",
      color: "bg-blue-50",
      emoji: "🎭",
    },
    {
      title: "Robotics for Beginners",
      place: "ByteClub IT Center",
      time: "Sat, 11:00 AM",
      age: "7-12 yrs",
      price: "2000 ₽",
      color: "bg-cyan-50",
      emoji: "🤖",
    },
    {
      title: "Family Swimming",
      place: "Wave Aqua Center",
      time: "Sat, 9:00 AM",
      age: "2+ yrs",
      price: "600 ₽",
      color: "bg-sky-50",
      emoji: "🏊",
    },
  ];

  if (loading || !sessionInfo) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-gray-400">Loading test...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      {/* Simulated product page - in production this would be an iframe or the actual product */}
      <div className="bg-white">
        <header className="border-b border-gray-200">
          <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-xl">🎈</span>
              <span className="font-semibold text-lg">PulseKids</span>
            </div>
            <nav className="flex gap-6 text-sm text-gray-600">
              <a href="#" className="hover:text-gray-900">Events</a>
              <a href="#" className="hover:text-gray-900">Places</a>
              <a href="#" className="hover:text-gray-900">Age</a>
              <a href="#" className="hover:text-gray-900">Favorites</a>
            </nav>
          </div>
        </header>

        <main className="max-w-6xl mx-auto px-6 py-8">
          <div className="mb-8">
            <h1 className="text-2xl font-bold mb-2">Weekend Activities for Kids</h1>
            <p className="text-gray-600">Find the best activities for your family</p>
          </div>

          {/* Search/Filter bar */}
          <div className="flex gap-3 mb-8">
            <div className="flex-1 relative">
              <input
                type="text"
                placeholder="Search activities..."
                className="w-full border border-gray-300 rounded-xl px-4 py-3 pr-10"
              />
              <span className="absolute right-3 top-3 text-gray-400">🔍</span>
            </div>
            <button className="px-4 py-3 border border-gray-300 rounded-xl text-sm hover:bg-gray-50">
              Filters
            </button>
            <button className="px-4 py-3 border border-gray-300 rounded-xl text-sm hover:bg-gray-50">
              Saturday
            </button>
            <button className="px-4 py-3 border border-gray-300 rounded-xl text-sm hover:bg-gray-50">
              Morning
            </button>
          </div>

          {/* Activity cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {activities.map((item, i) => (
              <div
                key={i}
                className={`${item.color} rounded-2xl p-5 cursor-pointer hover:shadow-md transition-shadow border border-gray-100`}
              >
                <div className="flex items-start justify-between mb-3">
                  <span className="text-3xl">{item.emoji}</span>
                  <span className="text-sm font-medium text-gray-700">
                    {item.price}
                  </span>
                </div>
                <h3 className="font-semibold mb-1">{item.title}</h3>
                <p className="text-sm text-gray-600 mb-3">{item.place}</p>
                <div className="flex gap-2">
                  <span className="text-xs bg-white/80 rounded-full px-2.5 py-1 text-gray-600">
                    {item.time}
                  </span>
                  <span className="text-xs bg-white/80 rounded-full px-2.5 py-1 text-gray-600">
                    {item.age}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </main>
      </div>

      {/* Research Widget */}
      {scenarioJson && (
        <ResearchWidget
          scenarioJson={scenarioJson}
          sessionId={sessionInfo.sessionId}
          onComplete={handleComplete}
        />
      )}
    </div>
  );
}
