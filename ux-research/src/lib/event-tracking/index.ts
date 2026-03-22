"use client";

interface TrackedEvent {
  sessionId: string;
  eventType: string;
  pageUrl?: string;
  elementSelector?: string;
  x?: number;
  y?: number;
  payloadJson?: Record<string, unknown>;
}

const FLUSH_INTERVAL = 3000;
const MAX_BATCH_SIZE = 20;

let eventBuffer: TrackedEvent[] = [];
let flushTimer: ReturnType<typeof setInterval> | null = null;
let currentSessionId: string | null = null;

function getSelector(el: HTMLElement): string {
  if (el.id) return `#${el.id}`;
  if (el.dataset.testid) return `[data-testid="${el.dataset.testid}"]`;

  const tag = el.tagName.toLowerCase();
  const cls = el.className && typeof el.className === "string"
    ? `.${el.className.split(" ").filter(Boolean).slice(0, 2).join(".")}`
    : "";
  const text = el.textContent?.slice(0, 30)?.trim();
  return text ? `${tag}${cls} "${text}"` : `${tag}${cls}`;
}

async function flush() {
  if (eventBuffer.length === 0) return;
  const batch = eventBuffer.splice(0, MAX_BATCH_SIZE);

  try {
    await fetch("/api/events", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(batch),
    });
  } catch {
    // Put events back on failure
    eventBuffer.unshift(...batch);
  }
}

export function initTracking(sessionId: string) {
  currentSessionId = sessionId;

  if (flushTimer) clearInterval(flushTimer);
  flushTimer = setInterval(flush, FLUSH_INTERVAL);

  // Track clicks
  document.addEventListener("click", (e) => {
    const target = e.target as HTMLElement;
    if (target.closest("[data-rw-widget]")) return; // skip widget clicks

    trackEvent({
      eventType: "click",
      pageUrl: window.location.href,
      elementSelector: getSelector(target),
      x: e.clientX,
      y: e.clientY,
    });
  });

  // Track scroll depth (throttled)
  let maxScroll = 0;
  let scrollTimeout: ReturnType<typeof setTimeout> | null = null;
  window.addEventListener("scroll", () => {
    const scrollPct = Math.round(
      ((window.scrollY + window.innerHeight) / document.documentElement.scrollHeight) * 100
    );
    if (scrollPct > maxScroll) {
      maxScroll = scrollPct;
      if (scrollTimeout) clearTimeout(scrollTimeout);
      scrollTimeout = setTimeout(() => {
        trackEvent({
          eventType: "scroll_depth",
          pageUrl: window.location.href,
          payloadJson: { depth: maxScroll },
        });
      }, 1000);
    }
  });

  // Flush on page unload
  window.addEventListener("beforeunload", () => flush());
}

export function trackEvent(event: Omit<TrackedEvent, "sessionId">) {
  if (!currentSessionId) return;
  eventBuffer.push({ ...event, sessionId: currentSessionId });

  if (eventBuffer.length >= MAX_BATCH_SIZE) flush();
}

export function trackPageView(url?: string) {
  trackEvent({
    eventType: "page_view",
    pageUrl: url || window.location.href,
  });
}

export function stopTracking() {
  flush();
  if (flushTimer) {
    clearInterval(flushTimer);
    flushTimer = null;
  }
  currentSessionId = null;
}
