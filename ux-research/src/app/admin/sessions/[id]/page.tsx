import { prisma } from "@/lib/db";
import { notFound } from "next/navigation";
import { getAudioUrl } from "@/lib/storage";
import Link from "next/link";

export const dynamic = "force-dynamic";

const statusColors: Record<string, string> = {
  started: "bg-yellow-100 text-yellow-700",
  in_progress: "bg-blue-100 text-blue-700",
  completed: "bg-green-100 text-green-700",
  abandoned: "bg-red-100 text-red-700",
};

const eventIcons: Record<string, string> = {
  session_started: "🟢",
  consent_accepted: "✅",
  screener_submitted: "📋",
  page_view: "👁",
  click: "🖱",
  scroll_depth: "📜",
  step_viewed: "👀",
  step_answered: "💬",
  audio_record_started: "🎤",
  audio_record_stopped: "⏹",
  audio_uploaded: "📤",
  session_completed: "🏁",
};

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

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <Link href="/admin/sessions" className="text-sm text-gray-400 hover:text-gray-600 mb-2 block">
            ← All Sessions
          </Link>
          <h1 className="text-2xl font-bold">Session {id.slice(0, 8)}</h1>
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
            {new Date(session.startedAt).toLocaleString("ru-RU")}
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
          <div className="text-sm text-gray-500">Events</div>
          <div className="font-medium mt-1">{session.events.length}</div>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <div className="text-sm text-gray-500">Responses</div>
          <div className="font-medium mt-1">{session.responses.length}</div>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-8">
        {/* Timeline - main column */}
        <div className="col-span-2 space-y-6">
          <h2 className="text-lg font-semibold">Timeline</h2>
          <div className="bg-white rounded-xl border border-gray-200 divide-y divide-gray-50">
            {session.events.map((event) => {
              const payload = event.payloadJson as Record<string, unknown> | null;
              return (
                <div key={event.id} className="px-4 py-3 flex items-start gap-3">
                  <span className="text-base mt-0.5">
                    {eventIcons[event.eventType] || "•"}
                  </span>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium">{event.eventType}</span>
                      {event.pageUrl && (
                        <span className="text-xs text-gray-400 truncate max-w-[200px]">
                          {event.pageUrl}
                        </span>
                      )}
                    </div>
                    {event.elementSelector && (
                      <div className="text-xs text-gray-500 mt-0.5 font-mono">
                        {event.elementSelector}
                      </div>
                    )}
                    {event.x != null && event.y != null && (
                      <span className="text-xs text-gray-400">
                        ({Math.round(event.x)}, {Math.round(event.y)})
                      </span>
                    )}
                    {payload && Object.keys(payload).length > 0 && (
                      <pre className="text-xs text-gray-500 mt-1 bg-gray-50 rounded p-1.5 overflow-x-auto">
                        {JSON.stringify(payload, null, 2)}
                      </pre>
                    )}
                  </div>
                  <span className="text-xs text-gray-400 whitespace-nowrap">
                    {new Date(event.createdAt).toLocaleTimeString("ru-RU")}
                  </span>
                </div>
              );
            })}
            {session.events.length === 0 && (
              <p className="text-gray-400 text-center py-8 text-sm">No events</p>
            )}
          </div>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Screener */}
          {screener && (
            <div>
              <h2 className="text-lg font-semibold mb-3">Screener</h2>
              <div className="bg-white rounded-xl border border-gray-200 p-4 space-y-2">
                {Object.entries(screener).map(([key, value]) => (
                  <div key={key} className="flex justify-between text-sm">
                    <span className="text-gray-500">{key}</span>
                    <span className="font-medium">{value || "—"}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Responses */}
          <div>
            <h2 className="text-lg font-semibold mb-3">Responses</h2>
            <div className="space-y-3">
              {session.responses.map((response) => {
                const value = response.valueJson as Record<string, unknown>;
                return (
                  <div
                    key={response.id}
                    className="bg-white rounded-xl border border-gray-200 p-4"
                  >
                    <div className="flex items-center gap-2 mb-2">
                      <span
                        className={`text-xs px-2 py-0.5 rounded-full ${
                          response.responseType === "rating"
                            ? "bg-amber-100 text-amber-700"
                            : response.responseType === "audio"
                              ? "bg-purple-100 text-purple-700"
                              : "bg-blue-100 text-blue-700"
                        }`}
                      >
                        {response.responseType}
                      </span>
                      <span className="text-xs text-gray-400">{response.stepId}</span>
                    </div>
                    {response.responseType === "rating" && (
                      <div className="text-2xl font-bold">
                        {(value as { rating?: number }).rating}/10
                      </div>
                    )}
                    {response.responseType === "text" && (
                      <p className="text-sm text-gray-700">
                        {(value as { text?: string }).text}
                      </p>
                    )}
                    {response.responseType === "audio" && (
                      <span className="text-xs text-gray-500">
                        Audio recorded
                      </span>
                    )}
                  </div>
                );
              })}
              {session.responses.length === 0 && (
                <p className="text-gray-400 text-sm">No responses</p>
              )}
            </div>
          </div>

          {/* Audio */}
          {session.audioAssets.length > 0 && (
            <div>
              <h2 className="text-lg font-semibold mb-3">Audio</h2>
              <div className="space-y-3">
                {session.audioAssets.map((asset) => (
                  <div
                    key={asset.id}
                    className="bg-white rounded-xl border border-gray-200 p-4"
                  >
                    <div className="text-xs text-gray-500 mb-2">
                      Step: {asset.stepId}
                      {asset.durationSec && (
                        <span> &middot; {Math.round(asset.durationSec)}s</span>
                      )}
                    </div>
                    <audio
                      controls
                      className="w-full h-8"
                      src={getAudioUrl(asset.filePath)}
                    />
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Metadata */}
          {session.metadataJson && (
            <div>
              <h2 className="text-lg font-semibold mb-3">Metadata</h2>
              <pre className="bg-white rounded-xl border border-gray-200 p-4 text-xs text-gray-600 overflow-x-auto">
                {JSON.stringify(session.metadataJson, null, 2)}
              </pre>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
