import Anthropic from "@anthropic-ai/sdk";
import { NextRequest, NextResponse } from "next/server";

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

interface Answers {
  situation: string;
  action:    string;
  outcome:   string;
  feeling:   string;
}

export async function POST(req: NextRequest) {
  const body = await req.json();

  // New format: 4 separate answers
  const answers: Answers = body.answers ?? {
    situation: body.transcript ?? "",
    action:    "",
    outcome:   "",
    feeling:   "",
  };

  if (!answers.situation?.trim()) {
    return NextResponse.json({ error: "answers required" }, { status: 400 });
  }

  if (!process.env.ANTHROPIC_API_KEY) {
    return NextResponse.json(answers);
  }

  const message = await anthropic.messages.create({
    model: "claude-haiku-4-5-20251001",
    max_tokens: 500,
    messages: [
      {
        role: "user",
        content: `You clean up 4 short voice answers into a JTBD statement. Each answer was given separately to a specific question.

Answers:
1. WHEN (situation/trigger): """${answers.situation}"""
2. I NEED TO (action): """${answers.action}"""
3. SO I CAN (outcome): """${answers.outcome}"""
4. AND FEEL (feeling): """${answers.feeling}"""

Return ONLY valid JSON, no markdown:
{
  "situation": "5-15 words — clean version of answer 1, no filler words",
  "action":    "5-12 words — clean version of answer 2",
  "outcome":   "5-12 words — clean version of answer 3",
  "feeling":   "5-12 words — clean version of answer 4"
}

Rules:
- Keep the person's own words as much as possible, just remove filler/repetition
- Write in first person
- Do NOT start with "When", "I need", "So I can", "And feel" — the template adds those
- If an answer is empty, infer logically from the others`,
      },
    ],
  });

  const raw = (message.content[0] as { type: string; text: string }).text ?? "";

  try {
    const cleaned = raw.replace(/```json\n?|\n?```/g, "").trim();
    const json = JSON.parse(cleaned);
    return NextResponse.json({
      situation: json.situation ?? answers.situation,
      action:    json.action    ?? answers.action,
      outcome:   json.outcome   ?? answers.outcome,
      feeling:   json.feeling   ?? answers.feeling,
    });
  } catch {
    return NextResponse.json(answers);
  }
}
