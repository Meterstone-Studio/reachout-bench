import { readFileSync } from "node:fs";

const root = new URL("../../", import.meta.url);
export const guidelines = readFileSync(new URL("GUIDELINES.md", root), "utf8");

/// The scenario as a system under test or a labeler sees it: everything but
/// the label and the provenance.
export function publicScenario(scenario) {
  return { id: scenario.id, context: scenario.context };
}

export function renderContext(scenario) {
  const { context } = scenario;
  const weekday = new Date(Date.parse(context.now) + context.utcOffsetMinutes * 60_000)
    .toLocaleDateString("en-US", { weekday: "long", timeZone: "UTC" });
  return [
    `Decision moment: ${context.now} (${weekday}, user's local time; UTC offset ${context.utcOffsetMinutes} minutes).`,
    "Full context as JSON (healthSummaries, conversation and priorOutreach are oldest first; the last health summary is the latest sync):",
    JSON.stringify(context, null, 1)
  ].join("\n");
}
