// Deterministic segmentation engine — no LLM, pure weighted scoring

export type SegmentName = "Fast & Easy" | "Explorer" | "Connector" | "Value Seeker";

export interface SegmentResult {
  primary_segment: SegmentName;
  primary_score: number;
  secondary_segment: SegmentName | null;
  secondary_score: number | null;
  confidence: number;
  reasoning: string[];
  profile_summary: {
    kids: string;
    city: string;
    frequency: string;
    spend: string;
    motivations: string[];
    channels: string[];
    memberships: string[];
  };
  tags: string[];
  recommended_digest_type: string;
  scores: Record<SegmentName, number>;
}

// ── Helpers ──────────────────────────────────────────────────────────────────

function csv(val: string | undefined): string[] {
  if (!val) return [];
  return val.split(",").map((s) => s.trim()).filter(Boolean);
}

type SpendTier = "none" | "low" | "medium" | "high" | "very_high";

function spendTier(spending: string | undefined): SpendTier {
  switch (spending) {
    case "minimal":   return "none";
    case "0_100":     return "low";
    case "100_300":   return "low";
    case "300_500":   return "medium";
    case "500_1000":  return "high";
    case "1000_1500": return "very_high";
    case "1500+":     return "very_high";
    default:          return "low";
  }
}

const SPEND_LABELS: Record<string, string> = {
  minimal:   "Стараюсь не тратить",
  "0_100":   "До $100",
  "100_300": "До $300",
  "300_500": "До $500",
  "500_1000":"До $1000",
  "1000_1500":"$1000–$1500",
  "1500+":   "Иногда больше",
};

const FREQ_LABELS: Record<string, string> = {
  weekly:   "Every week",
  biweekly: "Every 2 weeks",
  monthly:  "Once a month",
  rarely:   "Less often",
};

// ── Scoring ───────────────────────────────────────────────────────────────────

export function scoreSegments(screener: Record<string, unknown>): SegmentResult {
  const motivations = csv(screener.goOutReasons as string);
  const channels    = csv(screener.searchMethod  as string);
  const memberships = csv(screener.memberships   as string);
  const frequency   = (screener.frequency as string) ?? "";
  const spending    = (screener.spending  as string) ?? "";
  const tier        = spendTier(spending);

  const reasoning: string[] = [];

  // ── FAST / EASY ──────────────────────────────────────────────────────────
  let fastScore = 0;
  if (motivations.includes("get_out"))   { fastScore += 30; reasoning.push("Motivation: Get out of the house (+30 Fast)"); }
  if (motivations.includes("energy"))    { fastScore += 25; reasoning.push("Motivation: Burn energy (+25 Fast)"); }
  if (frequency === "weekly")            { fastScore += 15; reasoning.push("Goes out weekly (+15 Fast)"); }
  if (channels.includes("search"))       { fastScore += 10; reasoning.push("Discovers via Google (+10 Fast)"); }
  if (memberships.includes("none"))      { fastScore += 10; reasoning.push("No memberships (+10 Fast)"); }
  if (tier === "high" || tier === "very_high") { fastScore -= 20; reasoning.push("High spend (-20 Fast)"); }
  if (motivations.includes("learn"))     { fastScore -= 10; reasoning.push("Learns motivation (-10 Fast)"); }

  // ── EXPLORER ─────────────────────────────────────────────────────────────
  let explorerScore = 0;
  if (motivations.includes("learn"))     { explorerScore += 30; reasoning.push("Motivation: Learn something new (+30 Explorer)"); }
  if (memberships.includes("kids_classes") || memberships.includes("museum_zoo")) {
    explorerScore += 20; reasoning.push("Has classes/museum membership (+20 Explorer)");
  }
  if (tier === "medium" || tier === "high" || tier === "very_high") {
    explorerScore += 15; reasoning.push("Medium–high spend (+15 Explorer)");
  }
  if (channels.includes("apps"))         { explorerScore += 10; reasoning.push("Discovers via apps (+10 Explorer)"); }
  if (frequency === "weekly")            { explorerScore += 10; reasoning.push("Goes out weekly (+10 Explorer)"); }
  if (tier === "low" || tier === "none") { explorerScore -= 15; reasoning.push("Low spend (-15 Explorer)"); }
  if (motivations.includes("get_out") && !motivations.includes("learn")) {
    explorerScore -= 10; reasoning.push("Get-out dominant without learning (-10 Explorer)");
  }

  // ── EMOTIONAL / COMMUNITY ────────────────────────────────────────────────
  let emotionalScore = 0;
  if (motivations.includes("memories"))      { emotionalScore += 30; reasoning.push("Motivation: Create memories (+30 Emotional)"); }
  if (motivations.includes("quality_time"))  { emotionalScore += 25; reasoning.push("Motivation: Quality time (+25 Emotional)"); }
  if (channels.includes("friends") || channels.includes("chats") || channels.includes("social")) {
    emotionalScore += 20; reasoning.push("Discovers via friends/chats/social (+20 Emotional)");
  }
  if (channels.includes("social"))           { emotionalScore += 10; reasoning.push("Social media usage (+10 Emotional)"); }
  if (frequency === "biweekly")              { emotionalScore += 10; reasoning.push("Goes out every 2 weeks (+10 Emotional)"); }
  if (tier === "none" && motivations.includes("get_out") && !motivations.includes("memories")) {
    emotionalScore -= 10; reasoning.push("Budget-only signals (-10 Emotional)");
  }

  // ── VALUE SEEKER ─────────────────────────────────────────────────────────
  let valueScore = 0;
  if (tier === "none" || tier === "low")          { valueScore += 35; reasoning.push("Low spend (+35 Value)"); }
  if (memberships.includes("deals"))              { valueScore += 25; reasoning.push("Uses deal platforms (+25 Value)"); }
  if (motivations.includes("get_out") && (tier === "none" || tier === "low")) {
    valueScore += 15; reasoning.push("Get out + low spend combo (+15 Value)");
  }
  if (frequency === "rarely" || frequency === "monthly") { valueScore += 10; reasoning.push("Low frequency (+10 Value)"); }
  if (tier === "high" || tier === "very_high")    { valueScore -= 15; reasoning.push("High spend (-15 Value)"); }
  if (motivations.includes("learn") && (memberships.includes("kids_classes") || memberships.includes("museum_zoo"))) {
    valueScore -= 10; reasoning.push("Explorer signals present (-10 Value)");
  }

  // Clamp to 0–100
  const clamp = (n: number) => Math.max(0, Math.min(100, n));
  const scores: Record<SegmentName, number> = {
    "Fast & Easy":           clamp(fastScore),
    "Explorer":            clamp(explorerScore),
    "Connector": clamp(emotionalScore),
    "Value Seeker":        clamp(valueScore),
  };

  // ── Assignment ────────────────────────────────────────────────────────────
  const ranked = (Object.entries(scores) as [SegmentName, number][])
    .sort((a, b) => b[1] - a[1]);

  const [primaryName, primaryScore]     = ranked[0];
  const [secondaryName, secondaryScore] = ranked[1];

  const secondary = secondaryScore >= primaryScore * 0.7
    ? { name: secondaryName, score: secondaryScore }
    : null;

  // Confidence = gap between primary and second / primary
  const gap = primaryScore - secondaryScore;
  const confidence = primaryScore > 0
    ? Math.round((primaryScore / 100) * (1 - (secondaryScore / (primaryScore + 1))) * 100) / 100
    : 0;

  // ── Tags ──────────────────────────────────────────────────────────────────
  const tags: string[] = [primaryName.toLowerCase().replace(/[/ ]/g, "-")];
  if (secondary) tags.push(secondaryName.toLowerCase().replace(/[/ ]/g, "-") + "-mixed");
  if (tier === "high" || tier === "very_high") tags.push("high-spender");
  if (frequency === "weekly") tags.push("high-frequency");
  if (memberships.includes("none") && memberships.length === 1) tags.push("no-memberships");

  // ── Digest recommendation ─────────────────────────────────────────────────
  const DIGEST: Record<SegmentName, string> = {
    "Fast & Easy":           "Quick picks this weekend",
    "Explorer":            "Try something new",
    "Connector": "Make memories together",
    "Value Seeker":        "Best value this week",
  };

  // ── Profile summary ───────────────────────────────────────────────────────
  const MOTIVATION_LABELS: Record<string, string> = {
    get_out: "Get out", fun: "Fun", memories: "Memories",
    energy: "Burn energy", socialize: "Socialize",
    learn: "Learn", screens: "Screen time", quality_time: "Quality time",
  };
  const CHANNEL_LABELS: Record<string, string> = {
    search: "Google", social: "Social media", apps: "Apps",
    friends: "Friends", chats: "Parent chats", school: "School",
    newsletters: "Newsletters", community: "Community",
  };
  const MEMBERSHIP_LABELS: Record<string, string> = {
    museum_zoo: "Museum/Zoo", kids_classes: "Kids classes",
    city_pass: "City pass", community: "Community programs",
    deals: "Deal platforms", none: "None",
  };

  const kidsStr = [
    screener.childCount ? `${screener.childCount} kid${Number(screener.childCount) !== 1 ? "s" : ""}` : "",
    screener.childAges ? `ages ${screener.childAges}` : "",
  ].filter(Boolean).join(", ");

  return {
    primary_segment:   primaryName,
    primary_score:     primaryScore,
    secondary_segment: secondary?.name ?? null,
    secondary_score:   secondary?.score ?? null,
    confidence,
    reasoning: reasoning.filter((r) => r.includes(`(+`) || r.includes(`(-`)).slice(0, 6),
    profile_summary: {
      kids:        kidsStr || "—",
      city:        (screener.city as string) || "—",
      frequency:   FREQ_LABELS[frequency] || frequency || "—",
      spend:       SPEND_LABELS[spending]  || spending  || "—",
      motivations: motivations.map((m) => MOTIVATION_LABELS[m] || m),
      channels:    channels.map((c)    => CHANNEL_LABELS[c]    || c),
      memberships: memberships.map((m) => MEMBERSHIP_LABELS[m] || m),
    },
    tags,
    recommended_digest_type: DIGEST[primaryName],
    scores,
  };
}
