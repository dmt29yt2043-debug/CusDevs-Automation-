import type { QuizAnswers } from "./types";

export interface ValidationResult {
  valid: boolean;
  missing: string[];
}

export function validateAnswers(answers: QuizAnswers): ValidationResult {
  const missing: string[] = [];

  if (answers.parent !== "yes") missing.push("parent");

  if (answers.children.length === 0) {
    missing.push("children");
  } else {
    answers.children.forEach((child, i) => {
      if (!child.gender) missing.push(`child_${i + 1}_gender`);
      if (!child.child_age) missing.push(`child_${i + 1}_age`);
    });
  }

  if (!answers.borough) missing.push("borough");
  if (answers.borough === "other" && !answers.custom_area.trim()) {
    missing.push("custom_area");
  }

  // interests not required — defaults to ["outdoor"] if empty

  return {
    valid: missing.length === 0,
    missing,
  };
}
