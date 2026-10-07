import { appendFileSync, existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname } from "node:path";

/// Reads a `.json` array or a `.jsonl` file into an array of records.
export function readRecords(path) {
  const text = readFileSync(path, "utf8");
  if (path.endsWith(".json")) {
    const parsed = JSON.parse(text);
    return Array.isArray(parsed) ? parsed : [parsed];
  }
  return text
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line, index) => {
      try {
        return JSON.parse(line);
      } catch (error) {
        throw new Error(`${path}:${index + 1}: ${error.message}`);
      }
    });
}

/// Reads several record files and concatenates them.
export function readAll(paths) {
  return paths.flatMap((path) => readRecords(path));
}

export function readRecordsIfExists(path) {
  return existsSync(path) ? readRecords(path) : [];
}

export function writeJsonl(path, records) {
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, records.map((record) => JSON.stringify(record)).join("\n") + (records.length ? "\n" : ""));
}

export function appendJsonl(path, record) {
  mkdirSync(dirname(path), { recursive: true });
  appendFileSync(path, JSON.stringify(record) + "\n");
}

export function writeJson(path, value) {
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, JSON.stringify(value, null, 2) + "\n");
}

/// A file-name-safe version of a model id such as `deepseek/deepseek-v4.1-flash`.
export function slug(value) {
  return String(value).replace(/[^a-zA-Z0-9._-]+/g, "_");
}

/// Runs `worker` over `items` with at most `concurrency` in flight.
export async function mapPool(items, concurrency, worker) {
  const results = new Array(items.length);
  let next = 0;
  async function lane() {
    while (next < items.length) {
      const index = next++;
      results[index] = await worker(items[index], index);
    }
  }
  await Promise.all(Array.from({ length: Math.max(1, Math.min(concurrency, items.length)) }, lane));
  return results;
}
