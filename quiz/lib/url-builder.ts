import type { QuizAnswers } from "./types";
import { validateAnswers } from "./validation";

const RESULTS_URL = "https://pulseup.me/results";

export function buildRedirectUrl(answers: QuizAnswers): string | null {
  const { valid } = validateAnswers(answers);
  if (!valid) return null;

  const url = new URL(RESULTS_URL);

  url.searchParams.set("source", "quiz");
  url.searchParams.set("child_age", answers.child_age!);
  url.searchParams.set("borough", answers.borough!);

  // Default interests to outdoor if empty
  const interests = answers.interests.length > 0 ? answers.interests : ["outdoor"];
  url.searchParams.set("interests", interests.join(","));

  url.searchParams.set("pain", answers.pain!);
  url.searchParams.set("intent", answers.intent!);

  return url.toString();
}
