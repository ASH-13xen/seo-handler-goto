const GEMINI_MODEL = "gemini-3.5-flash";
// Used only if GEMINI_MODEL stays unavailable through every retry below —
// an older, lower-demand model that's far less likely to be capacity-limited.
const FALLBACK_GEMINI_MODEL = "gemini-2.5-flash-lite";

// Gemini occasionally returns 503 "currently experiencing high demand" during
// load spikes — this is transient, so retry with backoff instead of failing
// the request immediately. Also covers other typically-transient statuses.
const RETRYABLE_STATUS_CODES = new Set([429, 500, 502, 503, 504]);
const MAX_RETRIES = 4;
const INITIAL_RETRY_DELAY_MS = 1000;

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// Simple Request Queue to throttle concurrency of Gemini API calls.
class RequestQueue {
  private maxConcurrency: number;
  private activeRequests: number = 0;
  private queue: (() => void)[] = [];

  constructor(maxConcurrency: number = 1) {
    this.maxConcurrency = maxConcurrency;
  }

  async enqueue<T>(fn: () => Promise<T>): Promise<T> {
    if (this.activeRequests >= this.maxConcurrency) {
      await new Promise<void>((resolve) => {
        this.queue.push(resolve);
      });
    }
    this.activeRequests++;
    try {
      return await fn();
    } finally {
      this.activeRequests--;
      const next = this.queue.shift();
      if (next) {
        next();
      }
    }
  }
}

// Shared request queue limiting concurrent requests to 1 to avoid hitting concurrent request capacity.
const geminiQueue = new RequestQueue(1);

// A quota wall (e.g. "Quota exceeded ... limit: 20") won't clear in seconds —
// Google's own RetryInfo hints at 50s+ waits, far longer than a request
// should block for. So instead of burning retries that are guaranteed to
// fail until the quota window resets, switch to the fallback model right away.
function isQuotaExceeded(errText: string): boolean {
  return /quota exceeded|resource_exhausted/i.test(errText);
}

async function requestGemini(
  model: string,
  apiKey: string,
  systemInstruction: string,
  userPrompt: string,
  responseSchema?: object,
) {
  const generationConfig: any = {
    responseMimeType: "application/json",
  };
  if (responseSchema) {
    generationConfig.responseSchema = responseSchema;
  }

  return fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [
          { parts: [{ text: `${systemInstruction}\n\nInput: ${userPrompt}` }] },
        ],
        generationConfig,
      }),
    },
  );
}

async function parseGeminiResponse(response: Response) {
  const data = await response.json();
  const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!text) {
    throw new Error("No output received from AI model");
  }
  return JSON.parse(text.trim());
}

export async function callGemini(
  apiKey: string,
  systemInstruction: string,
  userPrompt: string,
  responseSchema?: object,
) {
  return geminiQueue.enqueue(async () => {
    let lastErrText = "";

    for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
      const response = await requestGemini(
        GEMINI_MODEL,
        apiKey,
        systemInstruction,
        userPrompt,
        responseSchema,
      );

      if (response.ok) {
        return parseGeminiResponse(response);
      }

      lastErrText = await response.text();

      if (isQuotaExceeded(lastErrText)) {
        console.warn(`${GEMINI_MODEL} quota exceeded — switching to fallback immediately:`, lastErrText);
        break;
      }

      const canRetry = RETRYABLE_STATUS_CODES.has(response.status) && attempt < MAX_RETRIES;

      if (!canRetry) {
        break;
      }

      // Exponential backoff with randomized jitter (0 - 1000ms)
      const jitter = Math.floor(Math.random() * 1000);
      const delay = (INITIAL_RETRY_DELAY_MS * 2 ** attempt) + jitter;
      console.warn(
        `Gemini API request failed (attempt ${attempt + 1}/${MAX_RETRIES + 1}, status ${response.status}) — retrying in ${delay}ms`,
        lastErrText,
      );
      await sleep(delay);
    }

    // Primary model never came back healthy — fall back to a lower-demand
    // model rather than failing the request outright.
    console.warn(
      `Falling back to ${FALLBACK_GEMINI_MODEL} after ${GEMINI_MODEL} failed: ${lastErrText}`,
    );
    const fallbackResponse = await requestGemini(
      FALLBACK_GEMINI_MODEL,
      apiKey,
      systemInstruction,
      userPrompt,
      responseSchema,
    );

    if (fallbackResponse.ok) {
      return parseGeminiResponse(fallbackResponse);
    }

    const fallbackErrText = await fallbackResponse.text();
    if (isQuotaExceeded(fallbackErrText)) {
      throw new Error(
        "Both the primary and fallback AI models have hit their free-tier quota for now. " +
          "Try again in a minute, or switch to a paid Gemini API plan to raise the limit.",
      );
    }
    throw new Error(`Gemini API request failed: ${fallbackErrText}`);
  });
}
