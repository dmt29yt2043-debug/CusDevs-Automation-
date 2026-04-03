import type { QuizOption, ChildAge, Borough, Interest, Pain, Intent } from "./types";

// UI label → normalized value mapping for each question

export const childAgeOptions: QuizOption<ChildAge>[] = [
  { label: "3-5 years", value: "3-5" },
  { label: "6-8 years", value: "6-8" },
  { label: "9-12 years", value: "9-12" },
  { label: "13-14 years", value: "13-14" },
];

export const boroughOptions: QuizOption<Borough>[] = [
  { label: "Manhattan", value: "manhattan" },
  { label: "Brooklyn", value: "brooklyn" },
  { label: "Queens", value: "queens" },
  { label: "Bronx", value: "bronx" },
  { label: "Staten Island", value: "staten_island" },
  { label: "Other area", value: "other" },
];

export const interestOptions: QuizOption<Interest>[] = [
  { label: "Outdoor activities", value: "outdoor" },
  { label: "Playgrounds", value: "playgrounds" },
  { label: "Museums", value: "museums" },
  { label: "Classes & workshops", value: "classes" },
  { label: "Arts & crafts", value: "arts_crafts" },
  { label: "Sports", value: "sports" },
  { label: "Science & tech", value: "science" },
  { label: "Animals & nature", value: "animals" },
  { label: "Indoor play", value: "indoor_play" },
];

export const painOptions: QuizOption<Pain>[] = [
  { label: "Too crowded", value: "crowded" },
  { label: "Too far away", value: "too_far" },
  { label: "Too expensive", value: "too_expensive" },
  { label: "Boring options", value: "boring" },
  { label: "Hard to choose", value: "hard_to_choose" },
  { label: "Risky weather", value: "weather_risk" },
];

export const intentOptions: QuizOption<Intent>[] = [
  { label: "Yes, show me recommendations", value: "yes" },
  { label: "No, just browsing", value: "no" },
];
