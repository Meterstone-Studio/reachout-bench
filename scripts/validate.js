#!/usr/bin/env node
// Usage: node scripts/validate.js <file.json|file.jsonl> [...]
import { readAll } from "./lib/io.js";
import { validateScenario } from "./lib/validate.js";

const paths = process.argv.slice(2);
if (paths.length === 0) {
  console.error("usage: node scripts/validate.js <scenarios.json|jsonl> [...]");
  process.exit(2);
}

const scenarios = readAll(paths);
const seen = new Set();
let invalid = 0;
for (const scenario of scenarios) {
  const errors = validateScenario(scenario);
  if (seen.has(scenario.id)) errors.push("duplicate id");
  seen.add(scenario.id);
  if (errors.length > 0) {
    invalid++;
    console.log(`✗ ${scenario.id ?? "(no id)"}`);
    for (const error of errors) console.log(`    ${error}`);
  }
}
console.log(`${scenarios.length - invalid}/${scenarios.length} scenarios valid`);
process.exit(invalid > 0 ? 1 : 0);
