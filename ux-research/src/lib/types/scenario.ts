export type StepType =
  | "message"
  | "button"
  | "rating"
  | "text_input"
  | "audio_prompt"
  | "wait_for_time"
  | "end";

export interface BaseStep {
  id: string;
  type: StepType;
  text: string;
}

export interface MessageStep extends BaseStep {
  type: "message";
}

export interface ButtonStep extends BaseStep {
  type: "button";
}

export interface RatingStep extends BaseStep {
  type: "rating";
  min: number;
  max: number;
}

export interface TextInputStep extends BaseStep {
  type: "text_input";
  placeholder?: string;
}

export interface AudioPromptStep extends BaseStep {
  type: "audio_prompt";
  maxDurationSec?: number;
}

export interface WaitForTimeStep extends BaseStep {
  type: "wait_for_time";
  durationSec: number;
}

export interface EndStep extends BaseStep {
  type: "end";
}

export type ScenarioStep =
  | MessageStep
  | ButtonStep
  | RatingStep
  | TextInputStep
  | AudioPromptStep
  | WaitForTimeStep
  | EndStep;

export interface ScenarioDefinition {
  steps: ScenarioStep[];
}
