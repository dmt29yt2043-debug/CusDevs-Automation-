import { prisma } from "@/lib/db";

export const dynamic = "force-dynamic";

export default async function ScenariosPage() {
  const scenarios = await prisma.scenario.findMany({
    include: { project: { select: { name: true } } },
    orderBy: { createdAt: "desc" },
  });

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">Scenarios</h1>
      <div className="grid gap-4">
        {scenarios.map((scenario) => {
          const def = scenario.definitionJson as { steps?: { id: string; type: string }[] };
          const stepCount = def?.steps?.length ?? 0;

          return (
            <div
              key={scenario.id}
              className="bg-white rounded-xl border border-gray-200 p-6"
            >
              <div className="flex items-start justify-between">
                <div>
                  <h2 className="text-lg font-semibold">{scenario.name}</h2>
                  <p className="text-sm text-gray-500 mt-1">
                    Project: {scenario.project.name} &middot; v{scenario.version}
                  </p>
                  <div className="flex gap-2 mt-3">
                    <span
                      className={`text-xs px-2 py-1 rounded-full ${
                        scenario.isActive
                          ? "bg-green-100 text-green-700"
                          : "bg-gray-100 text-gray-500"
                      }`}
                    >
                      {scenario.isActive ? "Active" : "Inactive"}
                    </span>
                    <span className="text-xs px-2 py-1 rounded-full bg-gray-100 text-gray-600">
                      {stepCount} steps
                    </span>
                  </div>
                </div>
              </div>
              {/* Steps preview */}
              <div className="mt-4 bg-gray-50 rounded-lg p-3">
                <div className="text-xs text-gray-500 mb-2 font-medium">Steps:</div>
                <div className="flex flex-wrap gap-1.5">
                  {def?.steps?.map((step) => (
                    <span
                      key={step.id}
                      className="text-xs bg-white border border-gray-200 rounded px-2 py-0.5 text-gray-600"
                    >
                      {step.type}: {step.id}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
