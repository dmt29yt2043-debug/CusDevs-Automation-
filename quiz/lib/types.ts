// Normalized values — these are the only values that leave the quiz

export const CHILD_AGE_OPTIONS = ["3-5", "6-8", "9-12", "13-14"] as const;
export type ChildAge = (typeof CHILD_AGE_OPTIONS)[number];

export const BOROUGH_OPTIONS = [
  "manhattan",
  "brooklyn",
  "queens",
  "bronx",
  "staten_island",
  "other",
] as const;
export type Borough = (typeof BOROUGH_OPTIONS)[number];

export const INTEREST_OPTIONS = [
  "outdoor",
  "playgrounds",
  "museums",
  "classes",
  "arts_crafts",
  "sports",
  "science",
  "animals",
  "indoor_play",
] as const;
export type Interest = (typeof INTEREST_OPTIONS)[number];

export const PAIN_OPTIONS = [
  "crowded",
  "too_far",
  "too_expensive",
  "boring",
  "hard_to_choose",
  "weather_risk",
] as const;
export type Pain = (typeof PAIN_OPTIONS)[number];

export const INTENT_OPTIONS = ["yes", "no"] as const;
export type Intent = (typeof INTENT_OPTIONS)[number];

// Full quiz answers
export interface QuizAnswers {
  child_age: ChildAge | null;
  borough: Borough | null;
  interests: Interest[];
  pain: Pain | null;
  intent: Intent | null;
}

export const INITIAL_ANSWERS: QuizAnswers = {
  child_age: null,
  borough: null,
  interests: [],
  pain: null,
  intent: null,
};

// UI option: what user sees → what gets stored
export interface QuizOption<T extends string> {
  label: string;
  value: T;
}
