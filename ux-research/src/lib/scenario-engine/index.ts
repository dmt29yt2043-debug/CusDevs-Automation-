import { ScenarioDefinition, ScenarioStep } from "@/lib/types/scenario";

export function parseScenario(json: unknown): ScenarioDefinition {
  const def = json as ScenarioDefinition;
  if (!def?.steps || !Array.isArray(def.steps)) {
    throw new Error("Invalid scenario: missing steps array");
  }
  return def;
}

export function getStep(scenario: ScenarioDefinition, index: number): ScenarioStep | null {
  return scenario.steps[index] ?? null;
}

export function isLastStep(scenario: ScenarioDefinition, index: number): boolean {
  return index >= scenario.steps.length - 1;
}

export function requiresResponse(step: ScenarioStep): boolean {
  return ["rating", "text_input", "audio_prompt"].includes(step.type);
}
