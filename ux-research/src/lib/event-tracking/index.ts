"use client";

export type ElementType = "filter" | "calendar" | "map" | "chat" | "card" | "navigation" | "other";

interface TrackedEvent {
  sessionId:       string;
  eventType:       string;
  pageUrl?:        string;
  elementSelector?: string;
  elementType?:    ElementType;
  sequenceIndex?:  number;
  x?:              number;
  y?:              number;
  payloadJson?:    Record<string, unknown>;
}

const FLUSH_INTERVAL = 3000;
const MAX_BATCH_SIZE = 20;

let eventBuffer:      TrackedEvent[] = [];
let flushTimer:       ReturnType<typeof setInterval> | null = null;
let currentSessionId: string | null = null;
let sequenceCounter   = 0;

// ── Element type classification ───────────────────────────────────────────────

const ELEMENT_KEYWORDS: Record<ElementType, string[]> = {
  filter:     ["filter", "sort", "category", "tag", "search", "age", "price", "type", "select"],
  calendar:   ["calendar", "date", "picker", "month", "week", "day", "schedule"],
  map:        ["map", "location", "marker", "pin", "geo", "place", "area", "mapbox", "leaflet"],
  chat:       ["chat", "message", "ask", "help", "support", "assistant", "bot", "widget"],
  card:       ["card", "event", "item", "listing", "tile", "activity", "result", "product"],
  navigation: ["nav", "menu", "header", "footer", "tab", "link", "breadcrumb", "back", "home"],
  other:      [],
};

export function classifyElement(selector: string): ElementType {
  if (!selector) return "other";
  const s = selector.toLowerCase();
  for (const [type, keywords] of Object.entries(ELEMENT_KEYWORDS) as [ElementType, string[]][]) {
    if (type === "other") continue;
    if (keywords.some((k) => s.includes(k))) return type;
  }
  return "other";
}

// ── Flush ─────────────────────────────────────────────────────────────────────

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
    eventBuffer.unshift(...batch);
  }
}

// ── Public API ────────────────────────────────────────────────────────────────

export function initTracking(sessionId: string) {
  currentSessionId = sessionId;
  sequenceCounter  = 0;

  if (flushTimer) clearInterval(flushTimer);
  flushTimer = setInterval(flush, FLUSH_INTERVAL);

  // Track clicks (only outside widget)
  document.addEventListener("click", (e) => {
    const target = e.target as HTMLElement;
    if (target.closest("[data-rw-widget]")) return;
    const selector = getSelector(target);
    trackEvent({
      eventType:       "click",
      pageUrl:         window.location.href,
      elementSelector: selector,
      elementType:     classifyElement(selector),
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
        trackEvent({ eventType: "scroll_depth", pageUrl: window.location.href, payloadJson: { depth: maxScroll } });
      }, 1000);
    }
  });

  window.addEventListener("beforeunload", () => flush());
}

export function trackEvent(event: Omit<TrackedEvent, "sessionId" | "sequenceIndex">) {
  if (!currentSessionId) return;
  sequenceCounter++;
  eventBuffer.push({
    ...event,
    sessionId:     currentSessionId,
    sequenceIndex: sequenceCounter,
  });
  if (eventBuffer.length >= MAX_BATCH_SIZE) flush();
}

/** Track an iframe click (from blur detection) with element type based on position */
export function trackIframeClick(opts: {
  x: number; y: number;
  iframeRect: DOMRect;
  pageUrl: string;
  elementType?: ElementType;
}) {
  const relX = ((opts.x - opts.iframeRect.left) / opts.iframeRect.width)  * 100;
  const relY = ((opts.y - opts.iframeRect.top)  / opts.iframeRect.height) * 100;

  // Heuristic zone classification if no type provided
  const elementType: ElementType = opts.elementType ?? inferZone(relX, relY);

  trackEvent({
    eventType:    "click",
    pageUrl:      opts.pageUrl,
    elementType,
    x: opts.x,
    y: opts.y,
    payloadJson: {
      relativeX:      Math.round(relX * 100) / 100,
      relativeY:      Math.round(relY * 100) / 100,
      viewportWidth:  opts.iframeRect.width,
      viewportHeight: opts.iframeRect.height,
      source:         "iframe",
    },
  });
}

/** Rough zone map: top bar = nav/filter, left = filter/map, center = cards, bottom = nav */
function inferZone(relX: number, relY: number): ElementType {
  if (relY < 12) return "navigation";
  if (relY > 88) return "navigation";
  if (relX < 22) return "filter";
  if (relX > 75 && relY < 60) return "map";
  return "card";
}

export function trackPageView(url?: string) {
  trackEvent({ eventType: "page_view", pageUrl: url || window.location.href });
}

export function stopTracking() {
  flush();
  if (flushTimer) { clearInterval(flushTimer); flushTimer = null; }
  currentSessionId = null;
  sequenceCounter  = 0;
}

export function getSequenceCounter() { return sequenceCounter; }

function getSelector(el: HTMLElement): string {
  if (el.id) return `#${el.id}`;
  if (el.dataset.testid) return `[data-testid="${el.dataset.testid}"]`;
  const tag  = el.tagName.toLowerCase();
  const cls  = el.className && typeof el.className === "string"
    ? `.${el.className.split(" ").filter(Boolean).slice(0, 2).join(".")}`
    : "";
  const text = el.textContent?.slice(0, 30)?.trim();
  return text ? `${tag}${cls} "${text}"` : `${tag}${cls}`;
}
