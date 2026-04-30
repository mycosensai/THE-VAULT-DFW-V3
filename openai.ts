/**
 * OpenAI Provider — Workers-compatible via fetch()
 * Supports GPT-4o, GPT-4o-mini, o3-mini for agent intelligence
 */

import { env } from "./env";

export interface OpenAIMessage {
  role: "system" | "user" | "assistant" | "tool";
  content: string;
  name?: string;
}

export interface OpenAIRequest {
  model?: string;
  messages: OpenAIMessage[];
  temperature?: number;
  max_tokens?: number;
  top_p?: number;
  response_format?: { type: "json_object" | "text" };
  tools?: Array<{
    type: "function";
    function: {
      name: string;
      description: string;
      parameters: Record<string, unknown>;
    };
  }>;
  tool_choice?: "auto" | "none" | { type: "function"; function: { name: string } };
}

export interface OpenAIResponse {
  id: string;
  object: string;
  created: number;
  model: string;
  choices: Array<{
    index: number;
    message: OpenAIMessage;
    finish_reason: string;
  }>;
  usage: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
}

const OPENAI_API_BASE = "https://api.openai.com/v1";

export async function openaiChat(
  request: OpenAIRequest,
): Promise<OpenAIResponse> {
  const key = env.openaiApiKey;
  if (!key || key.length < 20) {
    throw new Error("OPENAI_API_KEY not configured");
  }

  const res = await fetch(`${OPENAI_API_BASE}/chat/completions`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${key}`,
    },
    body: JSON.stringify({
      model: request.model ?? "gpt-4o",
      messages: request.messages,
      temperature: request.temperature ?? 0.7,
      max_tokens: request.max_tokens ?? 4096,
      top_p: request.top_p ?? 1,
      ...(request.response_format ? { response_format: request.response_format } : {}),
      ...(request.tools ? { tools: request.tools } : {}),
      ...(request.tool_choice ? { tool_choice: request.tool_choice } : {}),
    }),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`OpenAI API error ${res.status}: ${err}`);
  }

  return res.json() as Promise<OpenAIResponse>;
}

export async function openaiChatStream(
  request: OpenAIRequest,
  onChunk: (text: string, done: boolean) => void,
): Promise<void> {
  const key = env.openaiApiKey;
  if (!key || key.length < 20) {
    throw new Error("OPENAI_API_KEY not configured");
  }

  const res = await fetch(`${OPENAI_API_BASE}/chat/completions`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${key}`,
    },
    body: JSON.stringify({
      model: request.model ?? "gpt-4o",
      messages: request.messages,
      temperature: request.temperature ?? 0.7,
      max_tokens: request.max_tokens ?? 4096,
      stream: true,
      ...(request.response_format ? { response_format: request.response_format } : {}),
    }),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`OpenAI API error ${res.status}: ${err}`);
  }

  const reader = res.body?.getReader();
  if (!reader) throw new Error("No response body");

  const decoder = new TextDecoder();
  let buffer = "";

  while (true) {
    const { done, value } = await reader.read();
    if (done) {
      onChunk("", true);
      break;
    }

    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split("\n");
    buffer = lines.pop() ?? "";

    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed || trimmed === "data: [DONE]") continue;
      if (trimmed.startsWith("data: ")) {
        try {
          const json = JSON.parse(trimmed.slice(6));
          const delta = json.choices?.[0]?.delta?.content;
          if (delta) onChunk(delta, false);
        } catch {
          // ignore parse errors in stream
        }
      }
    }
  }
}

export async function openaiStructured<T>(
  request: Omit<OpenAIRequest, "response_format">,
): Promise<{ result: T; usage: OpenAIResponse["usage"] }> {
  const response = await openaiChat({
    ...request,
    response_format: { type: "json_object" },
  });

  const content = response.choices[0]?.message?.content ?? "{}";
  try {
    const parsed = JSON.parse(content) as T;
    return { result: parsed, usage: response.usage };
  } catch {
    throw new Error(`OpenAI returned invalid JSON: ${content.slice(0, 200)}`);
  }
}

// Vision API for image analysis (appraisals)
export async function openaiVision(
  imageUrl: string,
  prompt: string,
  model = "gpt-4o",
): Promise<string> {
  const response = await openaiChat({
    model,
    messages: [
      {
        role: "user",
        content: [
          { type: "text", text: prompt },
          { type: "image_url", image_url: { url: imageUrl } },
        ] as unknown as string,
      },
    ],
    max_tokens: 4096,
  });

  return response.choices[0]?.message?.content ?? "";
}
