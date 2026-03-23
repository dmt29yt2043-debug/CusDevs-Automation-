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

  // Project 1: PulseKids (staging)
  const project1 = await prisma.project.upsert({
    where: { slug: "pulsekids-research" },
    update: { testSiteUrl: "https://pulseup.srv1362562.hstgr.cloud/" },
    create: {
      name: "PulseKids Research",
      slug: "pulsekids-research",
      description: "UX research for a parenting product — finding weekend activities for kids.",
      testSiteUrl: "https://pulseup.srv1362562.hstgr.cloud/",
    },
  });
  console.log(`Project: ${project1.name} (${project1.id})`);

  // Project 2: PulseUp (production)
  const project2 = await prisma.project.upsert({
    where: { slug: "pulseup-research" },
    update: { testSiteUrl: "https://pulseup.me/" },
    create: {
      name: "PulseUp Research",
      slug: "pulseup-research",
      description: "UX research for PulseUp — finding weekend activities for kids.",
      testSiteUrl: "https://pulseup.me/",
    },
  });
  console.log(`Project: ${project2.name} (${project2.id})`);

  // Add scenario to both projects
  for (const project of [project1, project2]) {
    const existing = await prisma.scenario.findFirst({
      where: { projectId: project.id, name: "Weekend activity discovery test v1" },
    });
    if (!existing) {
      const scenario = await prisma.scenario.create({
        data: {
          projectId: project.id,
          name: "Weekend activity discovery test v1",
          version: 1,
          definitionJson: scenarioDefinition,
          isActive: true,
        },
      });
      console.log(`  Scenario: ${scenario.name} (${scenario.id})`);
    } else {
      console.log(`  Scenario exists: ${existing.name}`);
    }
  }

  console.log("Seed complete.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
