// Lightweight analytics — logs events and can be extended with any provider

type QuizEvent =
  | "quiz_started"
  | "quiz_step_completed"
  | "quiz_completed"
  | "quiz_redirected";

interface EventPayload {
  event: QuizEvent;
  step?: number;
  stepName?: string;
  data?: Record<string, string | string[]>;
  timestamp: string;
}

const eventQueue: EventPayload[] = [];

export function trackQuizEvent(
  event: QuizEvent,
  meta?: { step?: number; stepName?: string; data?: Record<string, string | string[]> }
) {
  const payload: EventPayload = {
    event,
    step: meta?.step,
    stepName: meta?.stepName,
    data: meta?.data,
    timestamp: new Date().toISOString(),
  };

  eventQueue.push(payload);

  // Log in dev
  if (process.env.NODE_ENV === "development") {
    console.log("[quiz-analytics]", payload);
  }

  // TODO: send to analytics endpoint (GTM, Mixpanel, custom API)
  // sendToAnalytics(payload);
}

export function getEventQueue(): EventPayload[] {
  return [...eventQueue];
}
