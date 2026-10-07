/**
 * Minimal OpenAI-compatible chat client (OpenRouter, DeepSeek, vLLM, ...).
 *
 *   BENCH_BASE_URL  e.g. https://openrouter.ai/api/v1  (default)
 *   BENCH_API_KEY   bearer token
 *   BENCH_SESSION_HEADER  optional header name some gateways require per session
 *                         (some gateways require a session header); it is
 *                         sent both as an HTTP header and as body extra_headers
 *
 * Models are always named per call, so one gateway can serve several labelers.
 */
const DEFAULT_BASE_URL = "https://openrouter.ai/api/v1";

export function benchGateway() {
  const baseURL = (process.env.BENCH_BASE_URL || DEFAULT_BASE_URL).replace(/\/+$/, "");
  const apiKey = process.env.BENCH_API_KEY;
  if (!apiKey) {
    throw new Error("BENCH_API_KEY is not set (see README, 'Configuration').");
  }
  return { baseURL, apiKey };
}

export async function chat({ model, messages, temperature = 0, maxTokens = 4096, json = false, retries = 3 }) {
  const { baseURL, apiKey } = benchGateway();
  const body = { model, messages, temperature, max_tokens: maxTokens };
  const headers = { "content-type": "application/json", authorization: `Bearer ${apiKey}` };
  const sessionHeader = (process.env.BENCH_SESSION_HEADER ?? "").trim();
  if (sessionHeader) {
    const session = `reachout-bench-${model.replace(/[^a-zA-Z0-9._-]+/g, "_")}`;
    headers[sessionHeader] = session;
    body.extra_headers = { [sessionHeader]: session };
  }
  if (json) {
    body.response_format = { type: "json_object" };
  }

  let lastError;
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      const response = await fetch(`${baseURL}/chat/completions`, {
        method: "POST",
        headers,
        body: JSON.stringify(body),
        signal: AbortSignal.timeout(180_000)
      });
      if (!response.ok) {
        const text = await response.text();
        // A gateway that rejects response_format still works without it.
        if (response.status === 400 && body.response_format && /response_format/i.test(text)) {
          delete body.response_format;
          continue;
        }
        const error = new Error(`${model}: HTTP ${response.status} ${text.slice(0, 300)}`);
        error.retryable = response.status === 429 || response.status >= 500;
        throw error;
      }
      const payload = await response.json();
      const content = payload.choices?.[0]?.message?.content;
      if (typeof content !== "string" || !content.trim()) {
        const error = new Error(`${model}: empty completion`);
        error.retryable = true;
        throw error;
      }
      return { content, usage: payload.usage ?? null };
    } catch (error) {
      lastError = error;
      const retryable = error.retryable ?? (error.name === "TimeoutError" || error.name === "TypeError");
      if (!retryable || attempt === retries) {
        break;
      }
      await new Promise((resolve) => setTimeout(resolve, 2000 * 2 ** attempt));
    }
  }
  throw lastError;
}

/// Like `chat`, but parses a JSON object out of the reply (tolerating code fences).
export async function chatJSON(options) {
  const { content, usage } = await chat({ ...options, json: true });
  return { value: parseJSONObject(content), usage };
}

export function parseJSONObject(text) {
  const trimmed = text.trim().replace(/^```(?:json)?\s*/i, "").replace(/```\s*$/, "");
  try {
    return JSON.parse(trimmed);
  } catch {
    const start = trimmed.indexOf("{");
    const end = trimmed.lastIndexOf("}");
    if (start >= 0 && end > start) {
      return JSON.parse(trimmed.slice(start, end + 1));
    }
    throw new Error(`Model reply is not JSON: ${trimmed.slice(0, 200)}`);
  }
}
