// Normalized values — these are the only values that leave the quiz

export const PARENT_OPTIONS = ["yes", "no"] as const;
export type ParentStatus = (typeof PARENT_OPTIONS)[number];

export const GENDER_OPTIONS = ["boy", "girl"] as const;
export type Gender = (typeof GENDER_OPTIONS)[number];

export const CHILD_AGE_OPTIONS = ["0-2", "3-5", "6-8", "9-12", "13-15", "16+"] as const;
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

// One child entry
export interface ChildInfo {
  id: string;
  gender: Gender | null;
  child_age: ChildAge | null;
}

export function newChild(): ChildInfo {
  return {
    id: Math.random().toString(36).slice(2, 10),
    gender: null,
    child_age: null,
  };
}

// Full quiz answers
export interface QuizAnswers {
  parent: ParentStatus | null;
  children: ChildInfo[];
  borough: Borough | null;
  custom_area: string;
  interests: Interest[];
}

export const INITIAL_ANSWERS: QuizAnswers = {
  parent: null,
  children: [{ id: "c1", gender: null, child_age: null }],
  borough: null,
  custom_area: "",
  interests: [],
};

// UI option: what user sees → what gets stored
export interface QuizOption<T extends string> {
  label: string;
  value: T;
}
