import type { QuizAnswers } from "./types";

export interface ValidationResult {
  valid: boolean;
  missing: string[];
}

export function validateAnswers(answers: QuizAnswers): ValidationResult {
  const missing: string[] = [];

  if (!answers.child_age) missing.push("child_age");
  if (!answers.borough) missing.push("borough");
  if (!answers.pain) missing.push("pain");
  if (!answers.intent) missing.push("intent");

  // interests not required — defaults to ["outdoor"] if empty

  return {
    valid: missing.length === 0,
    missing,
  };
}
