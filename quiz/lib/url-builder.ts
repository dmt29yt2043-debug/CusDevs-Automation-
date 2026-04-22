import type { QuizAnswers } from "./types";
import { validateAnswers } from "./validation";

const RESULTS_URL = "https://pulseup.me/results";

export function buildRedirectUrl(answers: QuizAnswers): string | null {
  const { valid } = validateAnswers(answers);
  if (!valid) return null;

  const url = new URL(RESULTS_URL);
  const children = answers.children;
  const first = children[0];

  url.searchParams.set("source", "quiz");

  // Back-compat: first child as plain gender / child_age
  url.searchParams.set("gender", first.gender!);
  url.searchParams.set("child_age", first.child_age!);

  // Full list of children: "boy:3-5,girl:6-8"
  const childrenParam = children
    .map((c) => `${c.gender}:${c.child_age}`)
    .join(",");
  url.searchParams.set("children", childrenParam);

  url.searchParams.set("borough", answers.borough!);
  if (answers.borough === "other" && answers.custom_area.trim()) {
    url.searchParams.set("custom_area", answers.custom_area.trim());
  }

  // Default interests to outdoor if empty
  const interests = answers.interests.length > 0 ? answers.interests : ["outdoor"];
  url.searchParams.set("interests", interests.join(","));

  return url.toString();
}
