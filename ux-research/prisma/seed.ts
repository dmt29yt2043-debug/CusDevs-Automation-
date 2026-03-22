import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const scenarioDefinition = {
  steps: [
    {
      id: "welcome-task",
      type: "message",
      text: "Your task is to find a weekend morning activity for your child.",
    },
    {
      id: "continue-1",
      type: "button",
      text: "Got it, let's start",
    },
    {
      id: "observe",
      type: "wait_for_time",
      durationSec: 60,
      text: "Explore the website and try to complete the task.",
    },
    {
      id: "clarity-rating",
      type: "rating",
      text: "How easy is it to use this website?",
      min: 1,
      max: 10,
    },
    {
      id: "voice-feedback",
      type: "audio_prompt",
      text: "Briefly describe what was clear and what was confusing.",
      maxDurationSec: 90,
    },
    {
      id: "end",
      type: "end",
      text: "Thank you! You have completed the study.",
    },
  ],
};

async function main() {
  console.log("Seeding database...");

  const project = await prisma.project.upsert({
    where: { slug: "pulsekids-research" },
    update: {},
    create: {
      name: "PulseKids Research",
      slug: "pulsekids-research",
      description:
        "UX research for a parenting product — finding weekend activities for kids.",
    },
  });

  console.log(`Created project: ${project.name} (${project.id})`);

  const existingScenario = await prisma.scenario.findFirst({
    where: { projectId: project.id, name: "Weekend activity discovery test v1" },
  });

  if (!existingScenario) {
    const scenario = await prisma.scenario.create({
      data: {
        projectId: project.id,
        name: "Weekend activity discovery test v1",
        version: 1,
        definitionJson: scenarioDefinition,
        isActive: true,
      },
    });
    console.log(`Created scenario: ${scenario.name} (${scenario.id})`);
  } else {
    console.log(`Scenario already exists: ${existingScenario.name}`);
  }

  console.log("Seed complete.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
