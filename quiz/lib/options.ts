import type { QuizOption, ParentStatus, Gender, ChildAge, Borough, Interest } from "./types";

// UI label → normalized value mapping for each question

export const parentOptions: QuizOption<ParentStatus>[] = [
  { label: "Yes, I'm a parent", value: "yes" },
  { label: "No", value: "no" },
];

export const genderOptions: QuizOption<Gender>[] = [
  { label: "Boy", value: "boy" },
  { label: "Girl", value: "girl" },
];

export const childAgeOptions: QuizOption<ChildAge>[] = [
  { label: "0-2", value: "0-2" },
  { label: "3-5", value: "3-5" },
  { label: "6-8", value: "6-8" },
  { label: "9-12", value: "9-12" },
  { label: "13-15", value: "13-15" },
  { label: "16+", value: "16+" },
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
