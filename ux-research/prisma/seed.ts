import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const scenarioDefinition = {
  steps: [
    {
      id: "welcome-task",
      type: "message",
      text: "Your task is to find a weekend morning activity for your child. Take your time exploring the site.",
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
      text: "Take your time exploring the site...",
    },
    {
      id: "voice-feedback",
      type: "audio_prompt",
      text: "Can you briefly walk us through your thinking? Please tell us why you took the actions you did, what you were looking for, and what influenced your choices on the site.",
      maxDurationSec: 120,
    },
    {
      id: "clarity-rating",
      type: "rating",
      text: "How easy was it to find what you were looking for?",
      min: 1,
      max: 10,
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

  // Project 3: PulseUp V2
  const project3 = await prisma.project.upsert({
    where: { slug: "pulseup-v2-research" },
    update: { testSiteUrl: "https://pulseup-v2.srv1362562.hstgr.cloud/" },
    create: {
      name: "PulseUp V2 Research",
      slug: "pulseup-v2-research",
      description: "UX research for PulseUp V2 — new dark theme version.",
      testSiteUrl: "https://pulseup-v2.srv1362562.hstgr.cloud/",
    },
  });
  console.log(`Project: ${project3.name} (${project3.id})`);

  // Add scenario to all projects
  for (const project of [project1, project2, project3]) {
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
