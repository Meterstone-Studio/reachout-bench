#!/usr/bin/env node
/**
 * Downloads the gated part of the benchmark from Hugging Face into this
 * checkout: the test split, the generated candidates, the raw labels, the
 * clinical review sheet and the message verdicts. They are kept off GitHub so the test set stays out of
 * crawled training data.
 *
 *   1. Accept the terms at https://huggingface.co/datasets/Meterstone-Studio/reachout-bench
 *   2. hf auth login
 *   3. npm run fetch-data
 */
import { spawnSync } from "node:child_process";
import { existsSync } from "node:fs";
import { fileURLToPath } from "node:url";

const REPO = "Meterstone-Studio/reachout-bench";
// The dataset version this code was released with.
const REVISION = "v0.2.0";
const ROOT = fileURLToPath(new URL("..", import.meta.url));
const PAGE = `https://huggingface.co/datasets/${REPO}`;
const args = [
  "download", REPO, "--repo-type", "dataset", "--revision", REVISION, "--local-dir", ROOT,
  "--include", "data/test.jsonl", "--include", "data/candidates/*", "--include", "labels/*",
  "--include", "review/clinical-review-sheet.csv", "--include", "results/*"
];

const run = spawnSync("hf", args, { stdio: ["ignore", "inherit", "pipe"], encoding: "utf8" });
if (run.error?.code === "ENOENT") {
  console.error("The Hugging Face CLI is not installed. Install it with `pip install -U huggingface_hub` (or `uv tool install huggingface_hub`), then run `hf auth login`.");
  process.exit(1);
}
if (run.status !== 0) {
  process.stderr.write(run.stderr ?? "");
  console.error(`\nDownload failed. Open ${PAGE}, log in and accept the terms, run \`hf auth login\` with that account, and try again.`);
  process.exit(1);
}
const missing = ["data/test.jsonl", "labels/rulings.jsonl", "review/clinical-review-sheet.csv", "results/2026-10-04/verdicts-v3-luna.jsonl"]
  .filter((path) => !existsSync(new URL(`../${path}`, import.meta.url)));
if (missing.length) {
  console.error(`Download finished but these are missing: ${missing.join(", ")}`);
  process.exit(1);
}
console.log(`Fetched the test split, candidates, labels, review sheet and verdicts (${REVISION}) from Hugging Face.`);
